import { ProfileConfig } from './types';
import { zarkoProfile } from './zarko';
import { evaProfile } from './eva';

const PROFILES: Record<string, ProfileConfig> = {
  zarko: zarkoProfile,
  eva:   evaProfile,
};

export function loadProfile(): ProfileConfig {
  const name = process.env.PROFILE ?? 'zarko';
  const profile = PROFILES[name];
  if (!profile) {
    throw new Error(`Unknown profile "${name}". Available: ${Object.keys(PROFILES).join(', ')}`);
  }
  if (!profile.telegramBotToken) {
    throw new Error(`Missing Telegram bot token for profile "${name}" — check your .env`);
  }
  if (!profile.telegramChatId) {
    throw new Error(`Missing Telegram chat ID for profile "${name}" — check your .env`);
  }
  return profile;
}
