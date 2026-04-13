import TelegramBot from 'node-telegram-bot-api';
import { ScoredJob } from './types';
import { DigestConfig } from './profiles/types';

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function flag(val: boolean | undefined): string {
  return val ? '✅' : '⚠️';
}

function escapeMarkdown(text: string): string {
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

export async function sendDigest(
  botToken: string,
  chatId: string,
  jobs: ScoredJob[],
  date: Date,
  digest: DigestConfig
): Promise<void> {
  const bot = new TelegramBot(botToken);

  const eligible = jobs
    .filter(j => !j.skip && j.score >= digest.minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, digest.maxJobs);

  if (eligible.length === 0) {
    const noResults = `🌍 *JobScout EU — ${formatDate(date)}*\n\nNo jobs scored ${digest.minScore}/10 or above today. Check \`logs/\` for full results.`;
    await bot.sendMessage(chatId, noResults, { parse_mode: 'Markdown' });
    console.log('\n📭 No qualifying jobs today — sent empty digest.');
    return;
  }

  // Header message
  const header = `🌍 *JobScout EU — ${formatDate(date)}*\n${digest.headerLine(eligible.length)}`;
  await bot.sendMessage(chatId, header, { parse_mode: 'Markdown' });
  await sleep(500);

  // One message per job
  for (const job of eligible) {
    const badge = digest.badgeLine(job);
    const locationFlag = digest.locationFlag(job.location);
    const fieldsLine = digest.displayFields
      .map(f => `${flag(job.breakdown[f.field])} ${f.label}`)
      .join('  ');

    const lines = [
      `${badge}${locationFlag} *Score ${job.score}/10* — ${job.title} @ ${job.company} \\(${escapeMarkdown(job.location)}\\)`,
      `   _${escapeMarkdown(job.summary)}_`,
      `   ${fieldsLine}`,
      `   👉 ${job.url}`,
    ];

    try {
      await bot.sendMessage(chatId, lines.join('\n'), {
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: true,
      });
    } catch {
      // Fallback: plain text if markdown fails
      const plain = [
        `${badge.replace('\n', ' ')}${locationFlag} Score ${job.score}/10 — ${job.title} @ ${job.company} (${job.location})`,
        job.summary,
        fieldsLine,
        `👉 ${job.url}`,
      ];
      await bot.sendMessage(chatId, plain.join('\n'));
    }

    await sleep(500);
  }

  console.log(`\n📬 Sent ${eligible.length} job(s) to Telegram.`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
