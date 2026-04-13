# JobScout EU — Eva's Personal Job Hunter

Scrapes job boards daily for senior marketing roles matching Eva's 
profile and sends top matches to Telegram every morning at 8am.

## My Profile
- Name: Eva Umanjec
- Location: Amsterdam, Netherlands (EU citizen — no visa sponsorship needed)
- Languages: English (native), Dutch (native), Serbian (native), German (conversational)
- Background: 10+ years in brand, content, communications and marketing management
- Current role: Global Content & Communications Manager at Zanders
- Education: London Business School (Brand Management), University of Amsterdam 
  (LL.M Media & Social Media Law), Leiden University (LL.B)
- Tools: HubSpot, Salesforce, Sprinklr, Meta Ads, Adobe Suite, 
  Canva, Figma, Wordpress, Mailchimp, Google Analytics

## Target Roles
- Marketing Manager
- Performance Marketeer
- Growth Marketing Manager
- Demand Generation Marketing Manager
- Marketing Consultant
- Campaign Marketeer
- B2B Marketing Manager

## Target Locations
- Anywhere in EU (fully remote or hybrid)
- United States (remote or relocation)
- Zurich, Switzerland
- Singapore
- Priority: roles that are remote-first or location-flexible

## Preferred Industries
- Financial services / fintech
- Tech / SaaS
- Luxury brands
AVOID: Media, Advertising agencies, Retail

## Scoring Criteria (weight highest to lowest)
1. B2B marketing focus (financial/tech/luxury industry) → +3 points
2. Senior or manager level title → +2 points
3. Remote-first or fully remote → +2 points
4. HubSpot or Salesforce mentioned → +2 points
5. Growth or demand generation focus → +2 points
6. Google Analytics or performance marketing → +1 point
7. International / global scope → +1 point
8. Meta Ads or paid social mentioned → +1 point
9. English-language workplace → +1 point

## Hard Filters — SKIP these entirely
- Pure social media execution roles (coordinator, community manager)
- Agencies or advertising firms
- Junior or coordinator level roles
- Retail industry
- Media or pure advertising companies
- Roles requiring Dutch/German fluency as mandatory requirement

## Salary Expectations
- EU roles: minimum €6,500 gross/month (€78,000/year)
- US roles: minimum $85,000/year
- Zurich / Singapore: adjust for local cost of living, flag if unclear
- Note: salary is location-dependent, flag roles with no salary info

## Job Boards to Scrape
Primary:   LinkedIn, Indeed, BuiltIn (builtin.com), WellFound (wellfound.com)
Secondary: WeWorkRemotely, EuropeRemotely, RemoteOK
Regional:  Nationalevacaturebank (NL), EFinancialCareers (finance roles)

## Telegram
Bot token and chat ID stored in .env as EVA_TELEGRAM_BOT_TOKEN 
and EVA_TELEGRAM_CHAT_ID

## Schedule
Every day at 8:00 AM

## Output Rules
- Only send jobs scored 7/10 or above
- Maximum 8 jobs per daily digest
- Save all results to logs/eva-YYYY-MM-DD.json
- Flag fully remote roles with 🌍
- Flag US/Zurich/Singapore roles with 📍 (location bonus)
- Flag roles with salary above €7,500/month with 💰
