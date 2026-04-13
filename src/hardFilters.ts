import { RawJob } from './types';
import { FilterRule } from './profiles/types';

export function applyHardFilters(
  jobs: RawJob[],
  rules: FilterRule[]
): { kept: RawJob[]; skipped: Array<{ job: RawJob; reason: string }> } {
  const kept: RawJob[] = [];
  const skipped: Array<{ job: RawJob; reason: string }> = [];

  for (const job of jobs) {
    let rejected = false;
    for (const rule of rules) {
      if (rule.test(job)) {
        skipped.push({ job, reason: rule.reason });
        rejected = true;
        break;
      }
    }
    if (!rejected) kept.push(job);
  }

  return { kept, skipped };
}
