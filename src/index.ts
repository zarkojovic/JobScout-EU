import 'dotenv/config';
import { loadProfile } from './profiles';
import { scrapeProfile } from './scrapers/linkedin';
import { scrapeKarriereAt } from './scrapers/karriere-at';
import { scrapeTecnoempleo } from './scrapers/tecnoempleo';
import { applyHardFilters } from './hardFilters';
import { scoreJobs } from './scorer';
import { sendDigest } from './notifier';
import { logResults } from './logger';
import { RawJob } from './types';

async function main() {
  const startTime = Date.now();
  const today = new Date();
  const profile = loadProfile();

  console.log(`🚀 JobScout EU starting — profile: ${profile.name}`);
  console.log(`📅 Date: ${today.toISOString().slice(0, 10)}\n`);

  // 1. Scrape LinkedIn across all profile target locations
  let rawJobs: RawJob[] = await scrapeProfile(profile.scraper);

  if (rawJobs.length === 0) {
    console.error('\n❌ No jobs found from LinkedIn. Continuing with additional sources if configured.');
  }

  // 2. Scrape additional sources (karriere.at, Tecnoempleo, etc.)
  for (const source of profile.additionalSources ?? []) {
    let extra: RawJob[] = [];
    if (source.type === 'karriere-at') {
      extra = await scrapeKarriereAt(source.queries, source.location);
    } else if (source.type === 'tecnoempleo') {
      extra = await scrapeTecnoempleo(source.queries, source.remoteOnly ?? true);
    }
    const existingUrls = new Set(rawJobs.map(j => j.url));
    rawJobs.push(...extra.filter(j => !existingUrls.has(j.url)));
  }

  if (rawJobs.length === 0) {
    console.error('\n❌ No jobs found from any source. Exiting.');
    process.exit(1);
  }

  // 3. Apply hard filters (fast, no API cost)
  const { kept, skipped } = applyHardFilters(rawJobs, profile.filterRules);
  console.log(`\n🔽 Hard filters: ${kept.length} kept, ${skipped.length} skipped`);
  for (const { job, reason } of skipped) {
    console.log(`   SKIP: ${job.title} @ ${job.company} — ${reason}`);
  }

  // 4. Score remaining jobs (Groq AI if key set, otherwise rule-based)
  const scoredKept = await scoreJobs(kept, profile.scoringRules, profile.scoreCap, profile.geminiCriteriaBlock);

  // Merge: hard-filtered jobs get score 0 and skip=true
  const allScored = [
    ...scoredKept,
    ...skipped.map(({ job, reason }) => ({
      ...job,
      score: 0,
      summary: reason,
      breakdown: {},
      skip: true,
      skipReason: reason,
    })),
  ];

  // 5. Save full log
  await logResults(allScored, today, profile.logFilename(today));

  // 6. Send Telegram digest
  await sendDigest(
    profile.telegramBotToken,
    profile.telegramChatId,
    allScored,
    today,
    profile.digest
  );

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n✅ Done in ${elapsed}s`);
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
