# Automated Testing Plan

This plan proposes a layered testing approach for current architecture and APIs.

## 1) Unit Tests (Fast)
Scope: Pure logic utilities and reducers.

Targets:
- `src/lib/albumLookup.ts`
  - `normalizeText`, `albumSeedKey`, title matching, iTunes match scoring.
- Prompt logic in `MusicContext` (extract small helpers to test).

Tools:
- Vitest (fast + TS-friendly).

Example test cases:
- Title matching handles edition suffixes.
- Artist matching allows partial matches.
- Deduplication prevents duplicates.

## 2) API Route Integration Tests
Scope: Next.js API routes with mocked external calls.

Targets:
- `/api/recommendations`
  - Mock Google AI response
  - Mock iTunes search
  - Ensure fallback returns partial results
- `/api/album-details`
  - Mock iTunes lookup
  - Validate normalization to iTunes match
- `/api/library`
  - Verify minimal fields stored
- `/api/prompt` and `/api/prompt-randomize`
  - Ensure `last_user_prompt` behavior is correct
- `/api/settings` and `/api/base-quest`
  - Settings persistence
  - Base quest summary response shape

Tools:
- Vitest + MSW (Mock Service Worker)
- Direct route handler tests (no server needed)

## 3) E2E Tests (Critical User Paths)
Scope: Full UI flow in browser.

Critical paths:
- Sign up / sign in / sign out
- Save prompt → regenerate recommendations
- Randomize prompt (does not auto-regenerate)
- Rate album → appears in library
- Open library album → fetches details → modal shows summary/personnel
- Add album via search + disambiguation
- Update settings (recommendation count, music app, password)

Tools:
- Playwright (recommended for Next.js)

## 4) Smoke Tests (CI)
Scope: Minimal check for build and critical endpoints.

Recommended:
- `npm run lint`
- `npm run build`
- Hit `/api/health` (create a simple endpoint) or `/api/prompt` with mock auth

## 5) Data & Auth Tests
Scope: Supabase integration with a test project.

Suggested:
- Seed a test user
- Ensure `user_seen_recommendations` prevents repeats
- Ensure `user_recommendations` stores only 5

## Suggested CI Order (Lightweight)
1) Lint + Typecheck
2) Unit tests

E2E tests run locally via the pre-commit hook.

## Feature/Test Policy
- Every new feature must include at least one automated test.
- Every bug fix must include a regression test that would have failed before the fix.
- Tests should be added in the same change set as the feature or fix.

## Current Test Coverage (Implemented)
### Unit/Integration
- `tests/albumLookup.test.ts` - album key normalization + dedupe
- `tests/recommendations.route.test.ts` - recommendation pipeline with mocked AI/iTunes
- `tests/albumDetails.route.test.ts` - enrichment pipeline with mocked AI + iTunes
- `tests/albumSearch.route.test.ts` - search dedupe + cover url
- `tests/prompt.route.test.ts` - prompt storage + history
- `tests/promptRandomize.route.test.ts` - AI prompt generation
- `tests/baseQuest.route.test.ts` - base quest summary
- `tests/settings.route.test.ts` - settings load/save/clamp
- `tests/library.route.test.ts` - library read/write
- `tests/recommendationsStore.route.test.ts` - recommendation storage

### E2E
- `tests/e2e/basic.spec.ts` - home loads, settings and library sign-in gating

## Running Tests Locally
These run automatically before each commit via Husky:
- `npm run test`
- `npm run test:e2e`

If you need to bypass (not recommended):
`HUSKY=0 git commit`
