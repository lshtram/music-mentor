# Quick Start Guide - Real-Time AI Recommendations

## What Changed

The app now generates album recommendations **in real-time** using AI, based on:
- ✅ User's editable prompt (visible in the Recommendation screen)
- ✅ User's complete library history (all rated/listened albums)

All mock data has been removed.

---

## Getting Started

### Step 1: Install Dependencies (if needed)

```bash
cd music-mentor-app
npm install
```

### Step 2: Choose an AI Provider

**Option A: OpenAI (Recommended)**
```bash
npm install openai
```

**Option B: Anthropic**
```bash
npm install @anthropic-ai/sdk
```

### Step 3: Add Environment Variables

Create `.env.local` in `music-mentor-app/`:

**For OpenAI:**
```
OPENAI_API_KEY=sk-your-key-here
```

**For Anthropic:**
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### Step 4: Implement the AI Service

Edit `/src/app/api/recommendations/route.ts`:
- Replace the placeholder with your AI service call
- See `AI_SETUP.md` for complete code examples

### Step 5: Run the App

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## How It Works

1. **User edits prompt** → Saved in MusicContext
2. **User clicks "Save & Regenerate"** → Calls `/api/recommendations`
3. **API sends to AI:**
   - Current prompt
   - User's library history
   - Number of existing recommendations
4. **AI returns 5 albums** → Displayed in grid
5. **User rates/listens** → Album moves to Library
6. **Next regeneration considers library** → More personalized

---

## Testing Without AI Setup

You can test the UI flow by modifying `/src/app/api/recommendations/route.ts` to return mock data temporarily:

```typescript
// For testing only
export async function POST(request: Request) {
  return Response.json([
    {
      id: "test-1",
      title: "Test Album",
      artist: { id: "test-artist", name: "Test Artist" },
      coverUrl: "",
      summary: "A test album",
      reviews: [],
      listened: false
    }
  ]);
}
```

---

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── recommendations/
│   │       └── route.ts          ← IMPLEMENT HERE
│   ├── page.tsx                  ← Home (Recommendations)
│   └── library/
│       └── page.tsx              ← Library screen
├── components/
│   ├── AlbumCard.tsx            ← Album display & actions
│   └── PromptEditor.tsx         ← Prompt input & regenerate button
├── context/
│   └── MusicContext.tsx         ← State management
└── lib/
    ├── types.ts                 ← Album, Artist, Review interfaces
    └── data.ts                  ← Artist reference only (mock data removed)
```

---

## Key Files to Understand

1. **`src/app/api/recommendations/route.ts`** - API endpoint (TO IMPLEMENT)
2. **`src/context/MusicContext.tsx`** - State management & AI calls
3. **`src/components/PromptEditor.tsx`** - User input for recommendations
4. **`src/components/AlbumCard.tsx`** - Album display & user actions

---

## Troubleshooting

**Error: "AI recommendation service not configured"**
- You haven't implemented `/api/recommendations/route.ts`
- Follow step 4 above

**No recommendations showing**
- Check browser console for API errors
- Verify API key is set in `.env.local`
- Test API endpoint with `curl` or Postman

**Environment variable not working**
- Restart dev server: `npm run dev`
- Restart VS Code terminal

---

## Documentation

- **AI_SETUP.md** - Detailed setup with OpenAI & Anthropic examples
- **ARCHITECTURE.md** - System architecture & data flow diagrams
- **REFACTORING_SUMMARY.md** - What was changed and why

---

## Next: Optional Enhancements

After basic setup works:

- [ ] Auto-regenerate when user rates/listens
- [ ] Fetch real album data from Spotify/Last.fm
- [ ] Show album reviews from real sources
- [ ] Add prompt versioning/history
- [ ] Implement advanced Library filters
- [ ] Export recommendations as playlist

Enjoy building personalized music discovery! 🎵
