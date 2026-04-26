import { RawJob, ScoredJob } from '../types';

export interface ScraperLocation {
  label: string;
  geoId: string;
  locationParam: string;
  remoteOnly?: boolean; // adds f_WT=2 to LinkedIn query params
}

export interface ScraperConfig {
  locations: ScraperLocation[];
  queries: string[];
}

export interface FilterRule {
  reason: string;
  test: (job: RawJob) => boolean;
}

export interface ScoringRule {
  field: string;   // key written into ScoreBreakdown
  points: number;
  test: (job: RawJob) => boolean;
}

export interface DisplayField {
  label: string;
  field: string;   // key in ScoreBreakdown to look up
}

export interface DigestConfig {
  minScore: number;
  maxJobs: number;
  headerLine: (count: number) => string;
  displayFields: DisplayField[];
  badgeLine: (job: ScoredJob) => string;       // e.g. "⭐ IND Sponsor\n" or ""
  locationFlag: (location: string) => string;  // e.g. "🇳🇱"
}

export interface AdditionalSource {
  type: 'karriere-at' | 'tecnoempleo';
  queries: string[];
  location?: string; // karriere-at: location slug e.g. 'wien'; tecnoempleo: ignored
}

export interface ProfileConfig {
  name: string;
  telegramBotToken: string;
  telegramChatId: string;
  logFilename: (date: Date) => string;
  scraper: ScraperConfig;
  additionalSources?: AdditionalSource[];
  filterRules: FilterRule[];
  scoringRules: ScoringRule[];
  scoreCap: number;
  geminiCriteriaBlock?: string;
  digest: DigestConfig;
}
