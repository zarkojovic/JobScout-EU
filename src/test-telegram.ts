import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';

const PROFILES = {
  zarko: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId:   process.env.TELEGRAM_CHAT_ID,
  },
  eva: {
    botToken: process.env.EVA_TELEGRAM_BOT_TOKEN,
    chatId:   process.env.EVA_TELEGRAM_CHAT_ID,
  },
};

async function testProfile(name: string, botToken: string | undefined, chatId: string | undefined) {
  process.stdout.write(`Testing ${name}... `);

  if (!botToken) { console.log('❌ missing bot token'); return; }
  if (!chatId)   { console.log('❌ missing chat ID');   return; }

  try {
    const bot = new TelegramBot(botToken);
    await bot.sendMessage(chatId, `✅ JobScout EU — Telegram test OK for *${name}*`, { parse_mode: 'Markdown' });
    console.log('✅ sent');
  } catch (err: any) {
    console.log(`❌ ${err.message}`);
  }
}

async function main() {
  const target = process.argv[2]; // optional: "zarko" or "eva"

  for (const [name, creds] of Object.entries(PROFILES)) {
    if (target && target !== name) continue;
    await testProfile(name, creds.botToken, creds.chatId);
  }
}

main();
