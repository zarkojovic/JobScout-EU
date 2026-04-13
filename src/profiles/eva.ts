import { RawJob, ScoredJob } from '../types';
import { ProfileConfig } from './types';

// ---------------------------------------------------------------------------
// Hard filter patterns
// ---------------------------------------------------------------------------
const SOCIAL_EXEC_PATTERN  = /\b(coordinator|community\s+manager|social\s+media\s+manager)\b/i;
const EVA_AGENCY_PATTERN   = /\b(advertising\s+agency|media\s+agency|creative\s+agency|outsourc|staffing)\b/i;
const JUNIOR_COORD_PATTERN = /\b(junior|coordinator|assistant\s+market(ing)?)\b/i;
const RETAIL_PATTERN       = /\b(retail|fast\s+fashion|fmcg|consumer\s+goods)\b/i;
const MEDIA_ADV_PATTERN    = /\b(media\s+company|publishing\s+company|broadcast|advertising\s+firm|pr\s+agency)\b/i;
const DUTCH_GERMAN_FLUENCY = /\b(fluent|proficient|native|business.level)\s+(dutch|german)\b/i;

// ---------------------------------------------------------------------------
// Scoring patterns
// ---------------------------------------------------------------------------
const B2B_INDUSTRY_PATTERN    = /\b(fintech|financial\s+services|financial\s+technology|saas|b2b|luxury|wealth\s+management|asset\s+management|private\s+equity|investment\s+banking)\b/i;
const SENIOR_MANAGER_PATTERN  = /\b(senior|manager|head\s+of|director|lead\s+market(ing)?)\b/i;
const REMOTE_FIRST_PATTERN    = /\b(remote[-\s]first|fully\s+remote|100\s*%\s*remote|work\s+from\s+anywhere|fully\s+distributed)\b/i;
const HUBSPOT_SF_PATTERN      = /\b(hubspot|salesforce)\b/i;
const GROWTH_DEMAND_PATTERN   = /\b(growth\s+marketing|demand\s+gen(eration)?|pipeline\s+(generation|growth)|lead\s+generation|inbound\s+marketing)\b/i;
const ANALYTICS_PERF_PATTERN  = /\b(google\s+analytics|ga4|performance\s+market(ing)?|data[-\s]driven\s+market(ing)?|marketing\s+analytics)\b/i;
const INTERNATIONAL_PATTERN   = /\b(international|global|worldwide|cross[-\s]border|multi[-\s]market|pan[-\s]european)\b/i;
const META_ADS_PATTERN        = /\b(meta\s+ads|facebook\s+ads|paid\s+social|instagram\s+ads|tiktok\s+ads|linkedin\s+ads)\b/i;
const ENGLISH_EXPLICIT        = /english.{0,20}(work(ing)?|team|environment|language)|international\s+team|english.?speaking|working\s+language.{0,10}english/i;

// Salary flag: monthly salary of €7,500+ or $7,500+ mentioned
const HIGH_SALARY_PATTERN     = /[€$]\s*([7-9][,.]?\d{3}|[1-9]\d{4,})\s*(\/month|per\s+month|monthly|gross|p\/m)/i;

// English detection heuristic (same logic as Žarko's profile)
const ENGLISH_STOPWORDS = ['the', 'and', 'for', 'are', 'you', 'our', 'will', 'with', 'your', 'this', 'that', 'have', 'has', 'from', 'they', 'team', 'work', 'role', 'experience'];

function isWrittenInEnglish(text: string): boolean {
  if (!text || text.length < 100) return false;
  const words = text.toLowerCase().split(/\s+/);
  const stopwordHits = words.filter(w => ENGLISH_STOPWORDS.includes(w.replace(/[^a-z]/g, ''))).length;
  return stopwordHits / words.length > 0.04;
}

function evaLocationFlag(location: string): string {
  const loc = location.toLowerCase();
  if (/zurich|zürich/.test(loc))                               return '🇨🇭';
  if (/singapore/.test(loc))                                   return '🇸🇬';
  if (/united\s+states|new\s+york|san\s+francisco|california|new\s+york/.test(loc)) return '🇺🇸';
  if (/germany|berlin/.test(loc))                              return '🇩🇪';
  if (/netherlands|amsterdam/.test(loc))                       return '🇳🇱';
  return '🌍';
}

// ---------------------------------------------------------------------------
// Profile definition
// ---------------------------------------------------------------------------
export const evaProfile: ProfileConfig = {
  name: 'eva',
  telegramBotToken: process.env.EVA_TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId:   process.env.EVA_TELEGRAM_CHAT_ID   ?? '',

  logFilename: (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return `logs/eva-${dateStr}.json`;
  },

  scraper: {
    locations: [
      { label: 'Amsterdam, Netherlands', geoId: '102890719', locationParam: 'Amsterdam, Netherlands' },
      { label: 'Berlin, Germany',        geoId: '106967730', locationParam: 'Berlin, Germany' },
      { label: 'Zurich, Switzerland',    geoId: '104085383', locationParam: 'Zurich, Switzerland' },
      { label: 'Singapore',              geoId: '102454443', locationParam: 'Singapore' },
      { label: 'United States (remote)', geoId: '103644278', locationParam: 'United States', remoteOnly: true },
    ],
    queries: [
      'marketing manager',
      'b2b marketing manager',
      'growth marketing manager',
      'demand generation manager',
    ],
  },

  filterRules: [
    {
      reason: 'Pure social media execution role',
      test: (job: RawJob) => SOCIAL_EXEC_PATTERN.test(job.title),
    },
    {
      reason: 'Agency or advertising firm',
      test: (job: RawJob) => EVA_AGENCY_PATTERN.test(job.description),
    },
    {
      reason: 'Junior or coordinator level',
      test: (job: RawJob) => JUNIOR_COORD_PATTERN.test(job.title),
    },
    {
      reason: 'Retail industry',
      test: (job: RawJob) => RETAIL_PATTERN.test(job.description),
    },
    {
      reason: 'Media or pure advertising company',
      test: (job: RawJob) => MEDIA_ADV_PATTERN.test(job.description),
    },
    {
      reason: 'Requires Dutch/German fluency',
      test: (job: RawJob) => DUTCH_GERMAN_FLUENCY.test(job.description),
    },
  ],

  scoringRules: [
    {
      field: 'b2bIndustry',
      points: 3,
      test: (job: RawJob) => B2B_INDUSTRY_PATTERN.test(job.description),
    },
    {
      field: 'seniorManager',
      points: 2,
      test: (job: RawJob) => SENIOR_MANAGER_PATTERN.test(job.title),
    },
    {
      field: 'remoteFirst',
      points: 2,
      test: (job: RawJob) => REMOTE_FIRST_PATTERN.test(`${job.title} ${job.description}`),
    },
    {
      field: 'hubspotSalesforce',
      points: 2,
      test: (job: RawJob) => HUBSPOT_SF_PATTERN.test(job.description),
    },
    {
      field: 'growthDemand',
      points: 2,
      test: (job: RawJob) => GROWTH_DEMAND_PATTERN.test(`${job.title} ${job.description}`),
    },
    {
      field: 'analyticsPerf',
      points: 1,
      test: (job: RawJob) => ANALYTICS_PERF_PATTERN.test(job.description),
    },
    {
      field: 'international',
      points: 1,
      test: (job: RawJob) => INTERNATIONAL_PATTERN.test(job.description),
    },
    {
      field: 'metaAdsPaidSocial',
      points: 1,
      test: (job: RawJob) => META_ADS_PATTERN.test(job.description),
    },
    {
      field: 'englishTeam',
      points: 1,
      test: (job: RawJob) => ENGLISH_EXPLICIT.test(`${job.title} ${job.description}`) || isWrittenInEnglish(job.description),
    },
  ],

  scoreCap: 10,

  digest: {
    minScore: 7,
    maxJobs: 8,
    headerLine: (count: number) =>
      `_Top ${count} match${count > 1 ? 'es' : ''} — NL · DE · CH · SG · US_`,
    displayFields: [
      { label: 'B2B industry',       field: 'b2bIndustry' },
      { label: 'Remote-first',       field: 'remoteFirst' },
      { label: 'HubSpot/Salesforce', field: 'hubspotSalesforce' },
    ],
    badgeLine: (job: ScoredJob) => {
      const parts: string[] = [];
      if (job.breakdown['remoteFirst'])                                           parts.push('🌍 Fully remote');
      if (/zurich|zürich|singapore|united\s+states/i.test(job.location))         parts.push('📍 Priority location');
      if (HIGH_SALARY_PATTERN.test(job.description))                              parts.push('💰 Salary flagged');
      return parts.length ? parts.join(' · ') + '\n' : '';
    },
    locationFlag: evaLocationFlag,
  },
};
