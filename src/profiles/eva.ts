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
const US_WORK_AUTH_PATTERN = /\b(must\s+be\s+(authorized|eligible)\s+to\s+work\s+in\s+(the\s+)?us|us\s+work\s+authorization|authorized\s+to\s+work\s+in\s+the\s+united\s+states|us\s+citizen|green\s+card|permanent\s+resident|visa\s+sponsorship\s+(is\s+)?(not|unavailable|cannot)|cannot\s+sponsor|not\s+able\s+to\s+sponsor)/i;

// ---------------------------------------------------------------------------
// Scoring patterns
// ---------------------------------------------------------------------------
const B2B_INDUSTRY_PATTERN    = /\b(fintech|financial\s+services|financial\s+technology|saas|b2b|luxury|wealth\s+management|asset\s+management|private\s+equity|investment\s+banking)\b/i;
const SENIOR_MANAGER_PATTERN  = /\b(senior|manager|head\s+of|director|lead\s+market(ing)?)\b/i;
const REMOTE_FIRST_PATTERN    = /\b(remote[-\s]first|fully\s+remote|100\s*%\s*remote|work\s+from\s+anywhere|fully\s+distributed)\b/i;
const HUBSPOT_SF_PATTERN      = /\b(hubspot|salesforce)\b/i;
const GROWTH_DEMAND_PATTERN   = /\b(growth\s+marketing|demand\s+gen(eration)?|pipeline\s+(generation|growth)|lead\s+generation|inbound\s+marketing|performance\s+market(ing)?|product\s+market(ing)?)\b/i;
const ANALYTICS_PERF_PATTERN  = /\b(google\s+analytics|ga4|performance\s+market(ing)?|data[-\s]driven\s+market(ing)?|marketing\s+analytics)\b/i;
const INTERNATIONAL_PATTERN   = /\b(international|global|worldwide|cross[-\s]border|multi[-\s]market|pan[-\s]european|emea)\b/i;
const META_ADS_PATTERN        = /\b(meta\s+ads|facebook\s+ads|paid\s+social|instagram\s+ads|tiktok\s+ads|linkedin\s+ads)\b/i;
const ENGLISH_EXPLICIT        = /english.{0,20}(work(ing)?|team|environment|language)|international\s+team|english.?speaking|working\s+language.{0,10}english/i;
const RELOCATION_PATTERN      = /\b(relocation\s+(package|assistance|support|bonus|allowance|offered?|available|provided|included)|relo\s+(package|assistance)|we\s+(offer|provide|include)\s+relocation|moving\s+(allowance|package|costs?\s+covered))\b/i;

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
  if (/switzerland|zurich|zürich|geneva|genève/.test(loc))                        return '🇨🇭';
  if (/singapore/.test(loc))                                                       return '🇸🇬';
  if (/united\s+states|new\s+york|san\s+francisco|california/.test(loc))          return '🇺🇸';
  if (/germany|berlin/.test(loc))                                                  return '🇩🇪';
  if (/netherlands|amsterdam/.test(loc))                                           return '🇳🇱';
  if (/serbia|belgrade|beograd/.test(loc))                                        return '🇷🇸';
  if (/united\s+arab\s+emirates|uae|dubai|abu\s+dhabi|saudi|riyadh|gulf/.test(loc)) return '🌏';
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
      { label: 'Switzerland',            geoId: '106693272', locationParam: 'Switzerland' },
      { label: 'Singapore',              geoId: '102454443', locationParam: 'Singapore' },
      { label: 'United States (remote)', geoId: '103644278', locationParam: 'United States', remoteOnly: true },
      { label: 'Serbia',                 geoId: '101855366', locationParam: 'Serbia' },
      { label: 'UAE',                    geoId: '104305776', locationParam: 'United Arab Emirates' },
    ],
    queries: [
      'marketing manager',
      'b2b marketing manager',
      'growth marketing manager',
      'demand generation manager',
      'product marketing manager',
      'performance marketing manager',
      'marketing communications manager',
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
      // Only block US jobs that explicitly require US work authorization — remote
      // jobs and roles offering visa/relocation are NOT blocked by this filter.
      reason: 'US role requires US work authorization (no visa offer)',
      test: (job: RawJob) =>
        /united\s+states|new\s+york|san\s+francisco|california/i.test(job.location) &&
        US_WORK_AUTH_PATTERN.test(job.description) &&
        !RELOCATION_PATTERN.test(job.description),
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
      field: 'relocationOffer',
      points: 2,
      test: (job: RawJob) => RELOCATION_PATTERN.test(job.description),
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

  geminiCriteriaBlock: `
Candidate: Eva Umanjec — EU citizen (Dutch national), based in Amsterdam. No visa restrictions within EU.
Background: 10+ years in marketing/communications. Current role: Global Content & Communications Manager at Zanders (fintech/wealth management).
Tools: HubSpot, Salesforce, Sprinklr, Meta Ads, Google Analytics/GA4, Adobe Suite, Canva, Figma, WordPress, Mailchimp.
Languages: English (native), Dutch (native), Serbian (native), German (conversational).

Open to: relocation anywhere globally if a relocation package is offered. Remote roles worldwide. US roles if fully remote or visa/relocation provided.

Scoring criteria (add points cumulatively, max 10 total):
1. B2B industry (fintech, SaaS, wealth management, financial services, luxury) → +3
2. Senior or manager-level role (not coordinator/junior) → +2
3. Remote-first or fully remote → +2
4. HubSpot or Salesforce mentioned → +2
5. Growth marketing, demand generation, performance marketing, or product marketing focus → +2
6. Relocation package or EMEA relocation explicitly offered → +2
7. Analytics or data-driven marketing mentioned → +1
8. International or global scope (including EMEA) → +1
9. Paid social / Meta Ads mentioned → +1
10. English-speaking team or job posted in English → +1

Hard disqualifiers (score 1 regardless):
- Pure social media execution role
- Advertising or creative agency
- Junior or coordinator title
- Retail or FMCG industry
- Media/broadcasting company
- US role that explicitly requires US citizenship, green card, or states "cannot sponsor" — UNLESS a relocation or visa offer is also mentioned

Location-specific rules:
- Switzerland (Zurich or Geneva): strong positive — relocation or remote both acceptable
- Serbia: only score ≥5 if the company is clearly US-based, international, or a major global firm; local Serbian companies score ≤3
- UAE/Gulf (Dubai, Abu Dhabi, Saudi Arabia): acceptable if English-speaking international company
- US remote: acceptable if no US work authorization requirement stated
- EMEA relocation: treat as a strong positive signal (+2 equivalent)
  `.trim(),

  digest: {
    minScore: 7,
    maxJobs: 8,
    headerLine: (count: number) =>
      `_Top ${count} match${count > 1 ? 'es' : ''} — NL · DE · CH · RS · SG · US · UAE_`,
    displayFields: [
      { label: 'B2B industry',       field: 'b2bIndustry' },
      { label: 'Remote-first',       field: 'remoteFirst' },
      { label: 'HubSpot/Salesforce', field: 'hubspotSalesforce' },
      { label: 'Relocation offer',   field: 'relocationOffer' },
    ],
    badgeLine: (job: ScoredJob) => {
      const parts: string[] = [];
      if (job.breakdown['remoteFirst'])                                                      parts.push('🌍 Fully remote');
      if (job.breakdown['relocationOffer'])                                                  parts.push('✈️ Relocation offered');
      if (/switzerland|zurich|zürich|geneva|singapore|united\s+states|dubai|uae/i.test(job.location)) parts.push('📍 Priority location');
      if (HIGH_SALARY_PATTERN.test(job.description))                                        parts.push('💰 Salary flagged');
      return parts.length ? parts.join(' · ') + '\n' : '';
    },
    locationFlag: evaLocationFlag,
  },
};
