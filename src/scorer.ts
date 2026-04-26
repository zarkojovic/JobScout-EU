import { RawJob, ScoredJob, ScoreBreakdown } from './types';
import { ScoringRule } from './profiles/types';
import { scoreJobsWithAI } from './aiScorer';

function scoreJob(job: RawJob, rules: ScoringRule[], cap: number): ScoredJob {
  const breakdown: ScoreBreakdown = {};
  let rawPoints = 0;

  for (const rule of rules) {
    const hit = rule.test(job);
    breakdown[rule.field] = hit;
    if (hit) rawPoints += rule.points;
  }

  const positives = rules.filter(r => breakdown[r.field]).map(r => r.field);
  const summary = positives.length
    ? `${job.title} at ${job.company} — ${positives.join(', ')}.`
    : `${job.title} at ${job.company} — no strong signals.`;

  return {
    ...job,
    score: Math.min(rawPoints, cap),
    summary,
    breakdown,
    skip: false,
  };
}

export function scoreJobsRuleBased(jobs: RawJob[], rules: ScoringRule[], cap: number): ScoredJob[] {
  console.log(`\n📊 Scoring ${jobs.length} jobs (rule-based)...`);
  return jobs.map((job, i) => {
    const scored = scoreJob(job, rules, cap);
    console.log(`  [${i + 1}/${jobs.length}] ${job.title} @ ${job.company} → ${scored.score}/10`);
    return scored;
  });
}

export async function scoreJobs(
  jobs: RawJob[],
  rules: ScoringRule[],
  cap: number,
  geminiCriteriaBlock?: string
): Promise<ScoredJob[]> {
  if (process.env.GROQ_API_KEY && geminiCriteriaBlock) {
    const breakdownFields = rules.map(r => r.field);
    return scoreJobsWithAI(jobs, geminiCriteriaBlock, cap, breakdownFields,
      (batch) => scoreJobsRuleBased(batch, rules, cap));
  }
  console.log('\n⚠️  GROQ_API_KEY not set — using rule-based scoring');
  return scoreJobsRuleBased(jobs, rules, cap);
}
