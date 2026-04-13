import * as fs from 'fs';
import * as path from 'path';
import { ScoredJob } from './types';

export async function logResults(jobs: ScoredJob[], date: Date, logPath: string): Promise<string> {
  const logFile = path.join(process.cwd(), logPath);
  const logDir  = path.dirname(logFile);

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  let existing: ScoredJob[] = [];
  if (fs.existsSync(logFile)) {
    try {
      existing = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
    } catch {
      existing = [];
    }
  }

  // Merge and deduplicate by jobId
  const merged = [...existing];
  for (const job of jobs) {
    if (!merged.find(j => j.jobId === job.jobId)) {
      merged.push(job);
    }
  }

  merged.sort((a, b) => b.score - a.score);
  fs.writeFileSync(logFile, JSON.stringify(merged, null, 2));

  const scored = merged.filter(j => !j.skip);
  const skipped = merged.filter(j => j.skip);
  const qualifying = scored.filter(j => j.score >= 7);

  console.log(`\n📝 Log saved: ${logFile}`);
  console.log(`   ${scored.length} scored, ${skipped.length} skipped, ${qualifying.length} qualify (≥7/10)`);

  return logFile;
}
