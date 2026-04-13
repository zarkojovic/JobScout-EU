export interface RawJob {
  jobId: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  postedAt: string;
}

export type ScoreBreakdown = Record<string, boolean>;

export interface ScoredJob extends RawJob {
  score: number;
  summary: string;
  breakdown: ScoreBreakdown;
  skip: boolean;
  skipReason?: string;
}
