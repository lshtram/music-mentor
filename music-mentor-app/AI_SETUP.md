# AI Recommendation Engine Setup

## Overview
The recommendation engine uses:
- **Google Generative AI (Gemini)** for candidate album seeds.
- **iTunes Search API** to verify real albums and normalize title/artist.

The API returns only album **title** and **artist**. All other fields are fetched later.

## Environment Variables
Add to `music-mentor-app/.env.local`:

```
GOOGLE_AI_API_KEY=your-google-ai-key
```

Optional:
```
REC_DEBUG=1
```
When enabled, the server logs candidate lists and iTunes verification results.

## How It Works
1) `/api/recommendations` sends the prompt + library context to Gemini.
2) Gemini returns a JSON array of album seeds.
3) Each seed is verified via iTunes.
4) Verified seeds are normalized to the matched iTunes release.
5) Response contains up to 5 verified seeds.
6) The client calls `/api/album-details` to enrich with cover, preview, and summary.

## Files to Know
- `src/app/api/recommendations/route.ts` - AI + verification pipeline.
- `src/lib/albumLookup.ts` - iTunes match and verification.
- `src/app/api/album-details/route.ts` - Enrichment step.
- `src/app/api/base-quest/route.ts` - Base quest summary from prompt history.
