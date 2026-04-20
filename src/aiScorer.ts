import Groq from 'groq-sdk';
import { RawJob, ScoredJob, ScoreBreakdown } from './types';

const GROQ_DELAY_MS = 2500; // free tier: 30 RPM → 1 call per 2s minimum

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildPrompt(job: RawJob, criteriaBlock: string): string {
  return `
You are a job-fit scorer for a specific candidate. Evaluate the following job posting.

## Candidate Profile
${criteriaBlock}

## Job Posting
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
Description:
${job.description.slice(0, 3500)}

## Instructions
Return ONLY valid JSON with this exact shape (no markdown fences):
{
  "score": <integer 1-10>,
  "summary": "<one sentence: role + company + top reason for this score>",
  "breakdown": {
    "visaSponsorship": <true|false>,
    "indSponsor": <true|false>,
    "stackMatch": <true|false>,
    "englishTeam": <true|false>,
    "awsValued": <true|false>,
    "reactVue": <true|false>,
    "midSenior": <true|false>,
    "remoteHybrid": <true|false>
  }
}

Score 1-10 where 10 = perfect match. Only 8+ if visa/relocation explicitly mentioned AND stack matches.
`.trim();
}

export async function scoreJobsWithAI(
  jobs: RawJob[],
  criteriaBlock: string,
  cap: number,
  fallbackFn: (jobs: RawJob[]) => ScoredJob[]
): Promise<ScoredJob[]> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log(`\n🤖 Scoring ${jobs.length} jobs with Groq (llama-3.3-70b)...`);

  const results: ScoredJob[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    process.stdout.write(`  [${i + 1}/${jobs.length}] ${job.title} @ ${job.company}...`);

    try {
      if (i > 0) await sleep(GROQ_DELAY_MS);

      const response = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: buildPrompt(job, criteriaBlock) }],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const text = response.choices[0].message.content ?? '{}';
      const parsed = JSON.parse(text);

      for (const key of Object.keys(parsed.breakdown ?? {})) {
        parsed.breakdown[key] = Boolean(parsed.breakdown[key]);
      }

      const scored: ScoredJob = {
        ...job,
        score: Math.min(Math.max(1, Math.round(parsed.score)), cap),
        summary: parsed.summary ?? `${job.title} at ${job.company}`,
        breakdown: parsed.breakdown as ScoreBreakdown,
        skip: false,
      };
      console.log(` → ${scored.score}/10 (AI)`);
      results.push(scored);
    } catch (err) {
      console.log(` → ⚠️  Groq error, rule-based fallback`);
      console.error(`     ${(err as Error).message}`);
      const [fallback] = fallbackFn([job]);
      results.push(fallback);
    }
  }

  return results;
}
