# Music Mentor - Real-Time Recommendation Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │         PromptEditor (src/components)               │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  • User edits recommendation prompt                 │   │
│  │  • "Save & Regenerate" triggers API call           │   │
│  │  • Shows loading state and errors                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                      ↓ calls                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │       MusicContext (src/context)                    │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  • Manages: prompt, recommendations, library       │   │
│  │  • regenerateRecommendations() → calls API         │   │
│  │  • Manages album actions (rate, listen, skip)      │   │
│  │  • State: albums[], prompt, isLoading, error       │   │
│  └─────────────────────────────────────────────────────┘   │
│                      ↓ calls                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     AlbumCard (src/components)                      │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  • Displays album: cover, title, artist, summary   │   │
│  │  • Actions: Rate (1-5), Listen, Skip, Play         │   │
│  │  • Updates MusicContext on action                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓ 
           POST /api/recommendations (JSON)
                {
                  prompt: string,
                  libraryAlbums: Album[],
                  currentCount: number
                }
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            BACKEND API ROUTE (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  /src/app/api/recommendations/route.ts              │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  • Receives: prompt + library history               │   │
│  │  • Formats context for AI                           │   │
│  │  • Calls AI service (OpenAI, Anthropic, etc)       │   │
│  │  • Returns: Album[] (JSON)                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                      ↓ calls                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │    External AI Service (TO BE CONFIGURED)          │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  ✓ OpenAI (GPT-4)                                   │   │
│  │  ✓ Anthropic (Claude)                              │   │
│  │  ✓ Google Vertex AI                                 │   │
│  │  ✓ Cohere                                           │   │
│  │  ✓ LLaMA (self-hosted)                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                      ↓ returns                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  AI-Generated Recommendations (5 albums)            │   │
│  │  ─────────────────────────────────────────────────  │   │
│  │  Each album includes:                               │   │
│  │  • id, title, artist info                           │   │
│  │  • summary (AI-generated description)               │   │
│  │  • reviews (publication + excerpt)                  │   │
│  │  • coverUrl (from cover archive)                    │   │
│  │  • listened: false, rating: undefined               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓ 
        Return Album[] JSON to Frontend
                            ↓
            MusicContext updates state
                            ↓
          AlbumCard components re-render
```

---

## User Journey

### First Time
1. User sees default prompt: "Recommend albums that explore minimalism..."
2. Clicks "Save & Regenerate"
3. MusicContext sends prompt (no library yet) to `/api/recommendations`
4. AI returns 5 album recommendations
5. Cards display on screen

### After Listening
1. User rates an album (1-5 stars) → album moves to Library
2. User can optionally click "Save & Regenerate" with updated prompt
3. MusicContext sends:
   - New prompt
   - Library (now includes rated album)
   - Current count
4. AI generates new recommendations considering library history
5. New albums appear on screen

### Library Screen
- All rated/listened albums stored permanently
- Can search, filter, sort
- Serves as input for future recommendations

---

## Data Structures

### Album (from `src/lib/types.ts`)
```typescript
interface Album {
  id: string;                    // Unique identifier
  title: string;                 // Album name
  artist: {
    id: string;
    name: string;
    bio?: string;
  };
  coverUrl: string;              // Album artwork URL
  summary: string;               // AI-generated description
  reviews: Array<{
    source: string;              // e.g., "Pitchfork"
    url: string;                 // Link to review
    excerpt: string;             // Quote from review
  }>;
  rating?: 1 | 2 | 3 | 4 | 5;   // User rating
  listened: boolean;             // Has user listened?
  dateAdded?: string;            // When added to library
  skipped?: boolean;             // Explicitly skipped?
}
```

### Recommendation Request
```typescript
interface RecommendationRequest {
  prompt: string;           // User's search criteria
  libraryAlbums: Album[];   // User's listening history
  currentCount: number;     // How many recommendations already shown
}
```

---

## Key Features

### Prompt-Driven
- User controls what they want to discover
- Prompt visible and editable at all times
- Changes trigger instant regeneration

### History-Aware
- AI sees complete listening history
- Learns user preferences over time
- Can avoid recommending similar albums

### Album-Centric
- Not playlist-based, not track-based
- Focuses on complete works
- Includes critical context (reviews, summaries)

### Explicit Actions
- **Rate**: Album enters library with rating
- **Listen**: Album enters library without rating
- **Skip**: Album discarded, not in library
- Each action can trigger regeneration

---

## Next Steps

1. **Configure AI Service** (see `AI_SETUP.md`)
2. **Test Recommendations** with your chosen provider
3. **Optional Enhancements**:
   - Auto-regenerate on album actions
   - Real album data (Spotify, Last.fm APIs)
   - Prompt versioning
   - Advanced filtering in Library
   - Export recommendations
