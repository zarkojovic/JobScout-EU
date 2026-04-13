
# JobScout EU — Žarko's Personal Job Hunter

Scrapes EU job boards daily for backend/fullstack roles matching my 

profile and sends top matches to Telegram every morning at 10am.

## My Profile

- Name: Žarko Jović, Serbian national (non-EU) — needs visa sponsorship

- Stack: PHP/Laravel, C#/ASP.NET, React, Vue.js, TypeScript, JavaScript

- Cloud: AWS (EC2, RDS, Lambda, S3, SNS, API Gateway), Docker, GitHub Actions

- DB: MySQL, PostgreSQL, Redis

- Architecture: Clean Architecture, CQRS, SOLID

- Experience: ~3.5 years total, 1 year official employment at Clarivate

- Education: Bachelor's in CS/EE, Visoka ICT Belgrade, GPA 9.2/10

- Current role: Full-stack at Clarivate (PHP + React, Innography platform)

- Languages: Serbian (native), English (C1 level), German (A1/A2 basic)

## Target Countries & Visa Paths

- Netherlands 🇳🇱 (PRIMARY) — Highly Skilled Migrant permit

  * Company MUST be IND-registered sponsor

  * Examples: Booking.com, Adyen, ASML, TomTom, Mollie, Catawiki, Philips

- Germany 🇩🇪 — EU Blue Card or Job Seeker Visa

  * Berlin and Munich preferred

- Austria 🇦🇹 — Red-White-Red Card

  * Vienna preferred

- Spain 🇪🇸 (FALLBACK) — only remote-first international companies

  * Local Spanish salaries too low, only worth it if remote/international pay

## Scoring Criteria (weight highest to lowest)

1. Visa sponsorship OR relocation package explicitly mentioned → +3 points

2. Netherlands + IND-registered sponsor → +2 points

3. PHP/Laravel OR C#/ASP.NET OR Node.js stack match → +2 points

4. English-speaking / international team → +2 points

5. AWS experience valued → +1 point

6. React or Vue.js mentioned → +1 point

7. Mid-level or senior role (not junior) → +1 point

8. Remote-first or hybrid → +1 point

## Hard Filters — SKIP these entirely

- Pure frontend roles (React/Vue only, no backend)

- Junior roles (unless explicitly "medior" or "mid-level")

- Agencies or outsourcing companies

- Roles requiring German/Dutch fluency (basic/nice-to-have is fine)

- Spain-based roles with local salary (under €3,000 gross)

- No mention of English working language for NL/DE/AT roles

## Salary Expectations

- Netherlands: minimum €4,000 gross/month

- Germany: minimum €4,000 gross/month

- Austria: minimum €3,800 gross/month

- Spain: minimum €3,500 gross (only remote/international)

## Job Boards to Scrape

Netherlands: LinkedIn, Werkzoeken.nl, Indeed.nl, IND sponsor list cross-reference

Germany: LinkedIn, StepStone.de, Indeed.de, Xing

Austria: LinkedIn, karriere.at, StepStone.at

Spain: LinkedIn, Tecnoempleo, InfoJobs (remote/international only)

All countries: WeWorkRemotely, EuropeRemotely, RemoteOK

## Telegram

Bot token and chat ID stored in .env as TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID

## Schedule

Every day at 10:00 AM

## Output Rules

- Only send jobs scored 7/10 or above

- Maximum 8 jobs per daily digest

- Save all results (including lower scores) to daily log file: logs/YYYY-MM-DD.json

- Flag IND-registered NL sponsors with a ⭐ — this is highest priority

