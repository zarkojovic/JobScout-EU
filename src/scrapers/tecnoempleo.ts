import axios from 'axios';
import * as cheerio from 'cheerio';
import { RawJob } from '../types';

const BASE = 'https://www.tecnoempleo.com';
const DELAY_MS = 2500;
const MAX_PAGES = 2;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
};

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

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

function parseListingPage(html: string, defaultLocation: string): CardStub[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const results: CardStub[] = [];
  const allLinks = $('a[href]').toArray();

  for (let i = 0; i < allLinks.length; i++) {
    const el = allLinks[i];
    const href = $(el).attr('href') ?? '';
    const fullHref = href.startsWith('http') ? href : `${BASE}${href}`;
    // Job detail URLs end with /rf-{hex}
    const m = fullHref.match(/\/rf-([a-f0-9]+)$/i);
    if (!m) continue;
    const jobId = m[1];
    if (seen.has(jobId)) continue;

    const title = $(el).text().trim();
    if (!title || title.length < 4) continue;
    seen.add(jobId);

    // Company: look at the next few links for a company profile URL
    // Tecnoempleo uses two patterns: /{slug}-trabajo  or  /{slug}/re-{id}
    let company = '';
    for (let j = i + 1; j < Math.min(i + 6, allLinks.length); j++) {
      const nh = $(allLinks[j]).attr('href') ?? '';
      const nFull = nh.startsWith('http') ? nh : `${BASE}${nh}`;
      if (/-trabajo$/.test(nFull) || /\/re-\d+$/.test(nFull)) {
        company = $(allLinks[j]).text().trim();
        break;
      }
    }

    results.push({ jobId, title, company, location: defaultLocation, url: fullHref });
  }

  return results;
}

async function fetchDescription(url: string): Promise<{ company: string; description: string; postedAt: string }> {
  const html = await get(url);
  if (!html) return { company: '', description: '', postedAt: new Date().toISOString() };

  const $ = cheerio.load(html);

  // Company: find the company profile link (contains /re- pattern)
  const company = $('a[href*="/re-"]').first().text().trim();

  const parts: string[] = [];
  $('h1, h3, h4, p, li').each((_, el) => {
    const t = $(el).text().trim();
    if (t.length > 5) parts.push(t);
  });

  return {
    company,
    description: parts.join('\n').slice(0, 4000),
    postedAt: new Date().toISOString(),
  };
}

export async function scrapeTecnoempleo(queries: string[], remoteOnly = true): Promise<RawJob[]> {
  const label = remoteOnly ? 'remote' : 'all';
  const defaultLocation = remoteOnly ? 'Remote, Spain' : 'Spain';
  console.log(`\n🔍 Scraping Tecnoempleo — Spain (${label})...`);
  const jobMap = new Map<string, RawJob>();

  for (const query of queries) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = new URL(`${BASE}/busqueda-empleo.php`);
      url.searchParams.set('te', query);
      if (remoteOnly) url.searchParams.set('modalidad_trabajo', '3');
      url.searchParams.set('pagina', String(page));

      process.stdout.write(`  Query: "${query}" page ${page}... `);
      const html = await get(url.toString());
      if (!html) { console.log('⚠️  failed'); break; }

      const cards = parseListingPage(html, defaultLocation);
      console.log(`${cards.length} cards`);
      if (cards.length === 0) break;

      for (const c of cards) {
        if (!jobMap.has(c.jobId)) jobMap.set(c.jobId, { ...c, description: '', postedAt: '' });
      }
      await sleep(DELAY_MS);
    }
  }

  const jobs = Array.from(jobMap.values());
  console.log(`  Fetching ${jobs.length} descriptions...`);

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    process.stdout.write(`  [${i + 1}/${jobs.length}] ${job.title} @ ${job.company || '?'}...`);
    if (i > 0) await sleep(DELAY_MS);
    const { company, description, postedAt } = await fetchDescription(job.url);
    job.company = company || job.company;
    job.description = description;
    job.postedAt = postedAt;
    console.log(' ✓');
  }

  return jobs;
}
