import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { RawJob } from '../types';
import { ScraperConfig, ScraperLocation } from '../profiles/types';

const LINKEDIN_GUEST_BASE = 'https://www.linkedin.com/jobs-guest/jobs/api';
const REQUEST_DELAY_MS = 4000;
const MAX_PAGES = 3; // 75 jobs per query max

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
};

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, params?: Record<string, string>, attempt = 0): Promise<string> {
  try {
    const response = await axios.get(url, {
      params,
      headers: HEADERS,
      timeout: 15000,
    });
    return response.data as string;
  } catch (err) {
    const error = err as AxiosError;
    const status = error.response?.status;
    if (attempt < 3 && (status === 429 || status === 500 || status === 503)) {
      const backoff = Math.pow(2, attempt) * 3000;
      console.log(`  ⏳ Rate limited (${status}), retrying in ${backoff / 1000}s...`);
      await sleep(backoff);
      return fetchWithRetry(url, params, attempt + 1);
    }
    throw error;
  }
}

function parseJobCards(html: string): Array<{ jobId: string; title: string; company: string; location: string; url: string }> {
  const $ = cheerio.load(html);
  const jobs: Array<{ jobId: string; title: string; company: string; location: string; url: string }> = [];

  $('li').each((_, el) => {
    const card = $(el);

    // Job ID: prefer data-entity-urn, fall back to end of URL slug
    const entityUrn = card.find('[data-entity-urn]').attr('data-entity-urn') || '';
    const urnMatch = entityUrn.match(/urn:li:jobPosting:(\d+)/);
    const linkEl = card.find('a[href*="/jobs/view/"]').first();
    const rawUrl = linkEl.attr('href') || '';
    const urlMatch = rawUrl.match(/\/jobs\/view\/[^?]*?(\d+)/);
    const jobId = urnMatch?.[1] ?? urlMatch?.[1];
    if (!jobId) return;

    const url = `https://www.linkedin.com/jobs/view/${jobId}/`;

    const title = card.find('h3.base-search-card__title, .base-card__title').first().text().trim();
    const company = card.find('h4.base-search-card__subtitle, .base-search-card__subtitle a').first().text().trim();
    const location = card.find('.job-search-card__location').first().text().trim();

    if (title && company && jobId) {
      jobs.push({ jobId, title, company, location, url });
    }
  });

  return jobs;
}

async function fetchJobDescription(jobId: string): Promise<{ description: string; postedAt: string }> {
  try {
    const html = await fetchWithRetry(`${LINKEDIN_GUEST_BASE}/jobPosting/${jobId}`);
    const $ = cheerio.load(html);

    const description = $('.show-more-less-html__markup, .description__text, .job-description')
      .first()
      .text()
      .trim()
      .slice(0, 4000); // cap at 4k chars to keep Claude costs low

    const postedAt = $('.posted-time-ago__text, .jobs-unified-top-card__posted-date, time')
      .first()
      .text()
      .trim();

    return { description: description || 'No description available', postedAt: postedAt || 'Unknown' };
  } catch {
    return { description: 'Description unavailable', postedAt: 'Unknown' };
  }
}

async function scrapeQuery(
  keywords: string,
  locationParam: string,
  geoId: string,
  timeFilter = 'r86400',
  remoteOnly = false
): Promise<Array<{ jobId: string; title: string; company: string; location: string; url: string }>> {
  const allCards: Array<{ jobId: string; title: string; company: string; location: string; url: string }> = [];

  for (let page = 0; page < MAX_PAGES; page++) {
    const start = page * 25;
    console.log(`  Fetching "${keywords}" page ${page + 1} (start=${start})...`);

    try {
      const params: Record<string, string> = {
        keywords,
        location: locationParam,
        geoId,
        start: String(start),
        f_TPR: timeFilter,
      };
      if (remoteOnly) params['f_WT'] = '2';

      const html = await fetchWithRetry(`${LINKEDIN_GUEST_BASE}/seeMoreJobPostings/search`, params);

      const cards = parseJobCards(html);
      console.log(`    Found ${cards.length} job cards`);
      allCards.push(...cards);

      if (cards.length < 25) break; // last page
      await sleep(REQUEST_DELAY_MS);
    } catch (err) {
      console.error(`  Failed to fetch page ${page + 1}:`, (err as Error).message);
      break;
    }
  }

  return allCards;
}

async function scrapeLocation(
  loc: ScraperLocation,
  queries: string[]
): Promise<RawJob[]> {
  console.log(`\n🔍 Scraping LinkedIn — ${loc.label}...`);

  let allCards: Array<{ jobId: string; title: string; company: string; location: string; url: string }> = [];

  for (const query of queries) {
    console.log(`\n  Query: "${query}" (last 24h)`);
    let cards = await scrapeQuery(query, loc.locationParam, loc.geoId, 'r86400', loc.remoteOnly);

    // Fallback to last 7 days if 24h yields nothing
    if (cards.length === 0) {
      console.log(`  No results in last 24h, trying last 7 days...`);
      cards = await scrapeQuery(query, loc.locationParam, loc.geoId, 'r604800', loc.remoteOnly);
    }

    allCards.push(...cards);
    await sleep(REQUEST_DELAY_MS);
  }

  // Deduplicate by jobId within this location
  const seen = new Set<string>();
  const unique = allCards.filter(c => {
    if (seen.has(c.jobId)) return false;
    seen.add(c.jobId);
    return true;
  });

  console.log(`\n  Total unique job cards: ${unique.length}`);
  console.log('  Fetching job descriptions...');

  const jobs: RawJob[] = [];
  for (let i = 0; i < unique.length; i++) {
    const card = unique[i];
    process.stdout.write(`  [${i + 1}/${unique.length}] ${card.title} @ ${card.company}...`);

    const { description, postedAt } = await fetchJobDescription(card.jobId);
    jobs.push({ ...card, description, postedAt });
    console.log(' ✓');

    if (i < unique.length - 1) await sleep(REQUEST_DELAY_MS);
  }

  return jobs;
}

export async function scrapeProfile(config: ScraperConfig): Promise<RawJob[]> {
  const allJobs: RawJob[] = [];
  const globalSeen = new Set<string>();

  for (const loc of config.locations) {
    const jobs = await scrapeLocation(loc, config.queries);

    // Deduplicate across all locations by jobId (same job can appear in multiple cities)
    for (const job of jobs) {
      if (!globalSeen.has(job.jobId)) {
        globalSeen.add(job.jobId);
        allJobs.push(job);
      }
    }

    // Pause between locations to avoid rate limiting
    await sleep(REQUEST_DELAY_MS * 2);
  }

  console.log(`\n📦 Total unique jobs across all locations: ${allJobs.length}`);
  return allJobs;
}
