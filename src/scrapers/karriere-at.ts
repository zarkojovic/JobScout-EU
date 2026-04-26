import axios from 'axios';
import * as cheerio from 'cheerio';
import { RawJob } from '../types';

const BASE = 'https://www.karriere.at';
const DELAY_MS = 3000;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'de-AT,de;q=0.9,en;q=0.8',
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function slugify(query: string) { return query.toLowerCase().replace(/\s+/g, '-'); }

async function get(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data } = await axios.get(url, { headers: HEADERS, timeout: 15000 });
      return data as string;
    } catch {
      if (attempt < 2) await sleep(3000 * (attempt + 1));
    }
  }
  return null;
}

type CardStub = { jobId: string; title: string; company: string; location: string; url: string };

function parseListingPage(html: string): CardStub[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const results: CardStub[] = [];

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    // Match numeric job IDs — e.g. /jobs/10017836 or https://www.karriere.at/jobs/10017836
    const m = href.match(/\/jobs\/(\d{6,})(?:[/?]|$)/);
    if (!m) return;
    const jobId = m[1];
    if (seen.has(jobId)) return;

    const title = $(el).text().trim();
    if (!title || title.length < 4) return;
    seen.add(jobId);

    // Company: nearest /f/ link in the enclosing card element
    const card = $(el).closest('li, article, [class*="job"]');
    const company = card.find('a[href*="/f/"]').first().text().trim();

    // Location: /jobs/city links (non-numeric) within the card
    const locLink = card.find('a[href*="/jobs/"]').filter((_, a) => {
      const h = $(a).attr('href') ?? '';
      return !/\/jobs\/\d+/.test(h) && $(a).attr('href') !== href;
    }).first();
    const city = locLink.text().trim();

    results.push({
      jobId,
      title,
      company: company || '',
      location: city ? `${city}, Austria` : 'Wien, Austria',
      url: `${BASE}/jobs/${jobId}`,
    });
  });

  return results;
}

async function fetchDescription(jobId: string): Promise<{ company: string; description: string; postedAt: string }> {
  const html = await get(`${BASE}/jobs/${jobId}`);
  if (!html) return { company: '', description: '', postedAt: new Date().toISOString() };

  const $ = cheerio.load(html);

  // Company: first /f/ link on the detail page
  const company = $('a[href*="/f/"]').first().text().trim();

  const parts: string[] = [];
  $('h1, h2, h3, h4, p, li').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 5) parts.push(t);
  });

  return {
    company,
    description: parts.join('\n').slice(0, 4000),
    postedAt: new Date().toISOString(),
  };
}

export async function scrapeKarriereAt(queries: string[], location = 'wien'): Promise<RawJob[]> {
  console.log(`\n🔍 Scraping karriere.at — ${location}...`);
  const jobMap = new Map<string, CardStub>();

  for (const query of queries) {
    const url = `${BASE}/jobs/${slugify(query)}/${location}`;
    process.stdout.write(`  Query: "${query}"... `);
    const html = await get(url);
    if (!html) { console.log('⚠️  failed'); await sleep(DELAY_MS); continue; }

    const cards = parseListingPage(html);
    console.log(`${cards.length} cards`);
    for (const card of cards) {
      if (!jobMap.has(card.jobId)) jobMap.set(card.jobId, card);
    }
    await sleep(DELAY_MS);
  }

  const stubs = Array.from(jobMap.values());
  console.log(`  Fetching ${stubs.length} descriptions...`);
  const result: RawJob[] = [];

  for (let i = 0; i < stubs.length; i++) {
    const s = stubs[i];
    process.stdout.write(`  [${i + 1}/${stubs.length}] ${s.title} @ ${s.company || '?'}...`);
    if (i > 0) await sleep(DELAY_MS);
    const { company, description, postedAt } = await fetchDescription(s.jobId);
    console.log(' ✓');
    result.push({ ...s, company: company || s.company, description, postedAt });
  }

  return result;
}
