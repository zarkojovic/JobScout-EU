import { RawJob, ScoredJob } from '../types';
import { ProfileConfig } from './types';

// ---------------------------------------------------------------------------
// Hard filter patterns
// ---------------------------------------------------------------------------
const JUNIOR_PATTERN        = /\bjunior\b/i;
const NOT_JUNIOR_PATTERN    = /\b(medior|mid[-\s]?level|mid[-\s]?senior|senior)\b/i;
const PURE_FRONTEND_TITLES  = /\b(frontend|front-end|front end|ui developer|react developer|vue developer|angular developer)\b/i;
const BACKEND_SIGNAL        = /\b(backend|back-end|back end|full.?stack|fullstack|php|laravel|node\.?js|c#|asp\.net|java|python|ruby|go|rust|api|server)\b/i;
const AGENCY_PATTERN        = /\b(outsourc|staffing|consulting firm|IT solutions|nearshore|offshore|body shop)\b/i;
const FLUENCY_REQUIRED      = /\b(fluent|proficient|native|business.level)\s+(dutch|german|french|spanish)\b/i;
const OVERQUALIFIED_YEARS   = [
  /\b([5-9]|\d{2})\s*\+\s*years?\s*(of\s*)?(professional\s*)?experience\b/i,
  /\b([5-9]|\d{2})\s+years?\s+(of\s+)?(professional\s+)?experience\b/i,
  /\b(?:minimum|at\s+least|minimum\s+of)\s+([5-9]|\d{2})\s+years?\b/i,
  /\b([5-9]|\d{2})[–\-]\d+\s+years?\s*(of\s*)?experience\b/i,
];

// ---------------------------------------------------------------------------
// Scoring patterns
// ---------------------------------------------------------------------------
const VISA_PATTERN     = /visa\s+sponsor(ship)?|relocation\s+(package|support|assistance|allowance|bonus)|sponsor(ing)?\s+(your\s+)?(visa|work\s+permit|relocation)|willing\s+to\s+sponsor|we\s+(will\s+)?sponsor|support\s+(with\s+)?relocation|highly\s+skilled\s+migrant|kennismigrant/i;
const STACK_PATTERN    = /\bphp\b|laravel|symfony|\bc#\b|asp\.net|\.net\s+(core|framework\b)|node\.?js/i;
const ENGLISH_EXPLICIT = /english.{0,20}(work(ing)?|team|environment|language|office)|work(ing)?\s+language.{0,10}english|international\s+team|english.?speaking|all.communication.in.english/i;
const AWS_PATTERN      = /\baws\b|amazon\s+web\s+services|\bec2\b|\bs3\b|\blambda\b|\brds\b|cloudformation|\beks\b|\becs\b|\bsqs\b|\bsns\b/i;
const REACT_VUE_PATTERN   = /\breact\b|react\.?js|\bvue\.?js|\bvue\b/i;
const MID_SENIOR_PATTERN  = /\b(medior|mid[-\s]?level|mid[-\s]?senior)\b/i;
const REMOTE_HYBRID_PATTERN = /\b(remote[-\s]first|fully\s+remote|hybrid|work\s+from\s+home|\bwfh\b|flexible\s+(work(ing)?|location))\b/i;

// Known IND-registered sponsors in the Netherlands
const IND_SPONSORS = [
  'booking.com', 'adyen', 'asml', 'tomtom', 'mollie', 'catawiki',
  'philips', 'ing ', 'ing bank', 'abn amro', 'rabobank', 'triodos',
  'nike', 'netflix', 'uber', 'tesla', 'microsoft', 'google', 'amazon',
  'meta', 'apple', 'salesforce', 'workday', 'elastic', 'twilio',
  'jetbrains', 'takeaway', 'just eat', 'bol.com', 'coolblue',
  'heineken', 'shell', 'akzonobel', 'unilever', 'nxp semiconductors', 'nxp',
  'signify', 'wolters kluwer', 'randstad', 'aegon', 'nn group',
  'qlik', 'optiver', 'flow traders', 'imcd', 'aalberts',
];

// English detection heuristic: count common English stopwords
const ENGLISH_STOPWORDS = ['the', 'and', 'for', 'are', 'you', 'our', 'will', 'with', 'your', 'this', 'that', 'have', 'has', 'from', 'they', 'team', 'work', 'role', 'experience'];

function isWrittenInEnglish(text: string): boolean {
  if (!text || text.length < 100) return false;
  const words = text.toLowerCase().split(/\s+/);
  const stopwordHits = words.filter(w => ENGLISH_STOPWORDS.includes(w.replace(/[^a-z]/g, ''))).length;
  return stopwordHits / words.length > 0.04;
}

function isINDSponsor(company: string, location: string): boolean {
  const isNL = /netherlands|amsterdam|rotterdam|utrecht|eindhoven|the hague|den haag/i.test(location);
  if (!isNL) return false;
  const companyLower = company.toLowerCase();
  return IND_SPONSORS.some(s => companyLower.includes(s));
}

// ---------------------------------------------------------------------------
// Profile definition
// ---------------------------------------------------------------------------
export const zarkoProfile: ProfileConfig = {
  name: 'zarko',
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN ?? '',
  telegramChatId:   process.env.TELEGRAM_CHAT_ID   ?? '',

  logFilename: (date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return `logs/${dateStr}.json`;
  },

  scraper: {
    locations: [
      { label: 'Amsterdam, Netherlands', geoId: '102890719', locationParam: 'Amsterdam, Netherlands' },
      { label: 'Berlin, Germany',        geoId: '106967730', locationParam: 'Berlin, Germany' },
      { label: 'Munich, Germany',        geoId: '106671392', locationParam: 'Munich, Germany' },
      { label: 'Vienna, Austria',        geoId: '102062298', locationParam: 'Vienna, Austria' },
      { label: 'Barcelona, Spain',       geoId: '100994331', locationParam: 'Barcelona, Spain' },
    ],
    queries: ['fullstack developer', 'backend developer'],
  },

  filterRules: [
    {
      reason: 'Pure frontend role',
      test: (job: RawJob) => PURE_FRONTEND_TITLES.test(job.title) && !BACKEND_SIGNAL.test(job.description),
    },
    {
      reason: 'Junior role',
      test: (job: RawJob) => JUNIOR_PATTERN.test(job.title) && !NOT_JUNIOR_PATTERN.test(job.title),
    },
    {
      reason: 'Agency or outsourcing company',
      test: (job: RawJob) => AGENCY_PATTERN.test(job.description),
    },
    {
      reason: 'Requires language fluency (Dutch/German/etc.)',
      test: (job: RawJob) => FLUENCY_REQUIRED.test(job.description),
    },
    {
      reason: 'Requires 5+ years experience (over-qualified threshold)',
      test: (job: RawJob) => OVERQUALIFIED_YEARS.some(p => p.test(job.description)),
    },
  ],

  scoringRules: [
    {
      field: 'visaSponsorship',
      points: 3,
      test: (job: RawJob) => VISA_PATTERN.test(`${job.title} ${job.description}`),
    },
    {
      field: 'indSponsor',
      points: 2,
      test: (job: RawJob) => isINDSponsor(job.company, job.location),
    },
    {
      field: 'stackMatch',
      points: 2,
      test: (job: RawJob) => STACK_PATTERN.test(job.description),
    },
    {
      field: 'englishTeam',
      points: 2,
      test: (job: RawJob) => ENGLISH_EXPLICIT.test(`${job.title} ${job.description}`) || isWrittenInEnglish(job.description),
    },
    {
      field: 'awsValued',
      points: 1,
      test: (job: RawJob) => AWS_PATTERN.test(job.description),
    },
    {
      field: 'reactVue',
      points: 1,
      test: (job: RawJob) => REACT_VUE_PATTERN.test(job.description),
    },
    {
      field: 'midSenior',
      points: 1,
      test: (job: RawJob) => MID_SENIOR_PATTERN.test(`${job.title} ${job.description}`),
    },
    {
      field: 'remoteHybrid',
      points: 1,
      test: (job: RawJob) => REMOTE_HYBRID_PATTERN.test(`${job.title} ${job.description}`),
    },
  ],

  scoreCap: 10,

  digest: {
    minScore: 7,
    maxJobs: 8,
    headerLine: (count: number) =>
      `_Top ${count} match${count > 1 ? 'es' : ''} across NL · DE · AT · ES_`,
    displayFields: [
      { label: 'Visa sponsorship', field: 'visaSponsorship' },
      { label: 'English team',     field: 'englishTeam' },
      { label: 'Stack match',      field: 'stackMatch' },
    ],
    badgeLine: (job: ScoredJob) =>
      job.breakdown['indSponsor'] ? '⭐ IND Sponsor\n' : '',
    locationFlag: (location: string) => {
      const loc = location.toLowerCase();
      if (/germany|berlin|munich|münchen/.test(loc)) return '🇩🇪';
      if (/austria|vienna|wien/.test(loc))           return '🇦🇹';
      if (/spain|barcelona|madrid/.test(loc))         return '🇪🇸';
      return '🇳🇱';
    },
  },
};
