# AI Recommendation Engine Setup

## Overview

The app now uses **real-time AI recommendations** based on:
- The user's editable prompt (visible in the Recommendation screen)
- The user's complete library history (all listened/rated albums)

Mock data has been removed. To make recommendations work, you need to:

1. Choose an AI service (OpenAI, Anthropic, etc.)
2. Configure your API credentials
3. Implement the recommendation logic in `/src/app/api/recommendations/route.ts`

---

## Setup Steps

### 1. Choose Your AI Service

**Option A: OpenAI (GPT-4)**
```bash
npm install openai
```

**Option B: Anthropic (Claude)**
```bash
npm install @anthropic-ai/sdk
```

**Option C: Other Services**
- Google Vertex AI
- Cohere
- LLaMA (self-hosted)

### 2. Add Environment Variables

Create a `.env.local` file in `music-mentor-app/`:

**For OpenAI:**
```
OPENAI_API_KEY=sk-your-api-key-here
```

**For Anthropic:**
```
ANTHROPIC_API_KEY=sk-ant-your-api-key-here
```

### 3. Implement the Recommendation Engine

Edit `/src/app/api/recommendations/route.ts` to call your AI service.

#### Example: OpenAI Implementation

```typescript
import { OpenAI } from 'openai';
import { Album } from '@/lib/types';

interface RecommendationRequest {
  prompt: string;
  libraryAlbums: Album[];
  currentCount: number;
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const body: RecommendationRequest = await request.json();
    const { prompt, libraryAlbums, currentCount } = body;

    // Build context from library
    const libraryContext = libraryAlbums.length > 0
      ? `User's library (${libraryAlbums.length} albums):\n` +
        libraryAlbums
          .slice(0, 10) // Include last 10 for context
          .map(a => `- "${a.title}" by ${a.artist.name}${a.rating ? ` (rated ${a.rating}/5)` : ''}`)
          .join('\n')
      : 'No library history yet (first recommendations)';

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a music recommendation expert. Recommend albums based on user preferences and listening history. 
          
          Return ONLY a valid JSON array with exactly ${5 - currentCount} albums. Each album must have:
          - id: string (unique identifier, e.g. "album-uuid-123")
          - title: string (album title)
          - artist: { id: string, name: string, bio?: string }
          - summary: string (2-3 sentence description)
          - reviews: { source: string, url: string, excerpt: string }[] (2-3 real or plausible reviews)
          - coverUrl: string (album cover image URL from cover.art.archive or similar)
          - listened: false
          - rating: undefined
          
          CRITICAL: Return ONLY the JSON array, no markdown or explanation.`,
          
        },
        {
          role: 'user',
          content: `${libraryContext}
          
User's search prompt: "${prompt}"

Recommend ${5 - currentCount} albums that match this prompt.`,
        },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse the JSON response
    const albums = JSON.parse(content);
    
    if (!Array.isArray(albums)) {
      throw new Error('Response is not an array');
    }

    return Response.json(albums);
  } catch (error) {
    console.error('Recommendation API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
```

#### Example: Anthropic Implementation

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { Album } from '@/lib/types';

interface RecommendationRequest {
  prompt: string;
  libraryAlbums: Album[];
  currentCount: number;
}

const client = new Anthropic();

export async function POST(request: Request) {
  try {
    const body: RecommendationRequest = await request.json();
    const { prompt, libraryAlbums, currentCount } = body;

    const libraryContext = libraryAlbums.length > 0
      ? `User's library (${libraryAlbums.length} albums):\n` +
        libraryAlbums
          .slice(0, 10)
          .map(a => `- "${a.title}" by ${a.artist.name}${a.rating ? ` (rated ${a.rating}/5)` : ''}`)
          .join('\n')
      : 'No library history yet';

    const response = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: `${libraryContext}
          
User's search prompt: "${prompt}"

Recommend ${5 - currentCount} albums. Return ONLY a JSON array with this structure for each album:
{
  "id": "unique-id",
  "title": "Album Title",
  "artist": { "id": "artist-id", "name": "Artist Name", "bio": "bio" },
  "summary": "2-3 sentence description",
  "reviews": [{"source": "Publication", "url": "url", "excerpt": "quote"}],
  "coverUrl": "image-url",
  "listened": false,
  "rating": undefined
}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    const albums = JSON.parse(content.text);
    if (!Array.isArray(albums)) {
      throw new Error('Response is not an array');
    }

    return Response.json(albums);
  } catch (error) {
    console.error('Recommendation API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    );
  }
}
```

---

## Data Flow

```
User edits prompt and clicks "Save & Regenerate"
  ↓
PromptEditor calls regenerateRecommendations()
  ↓
MusicContext sends POST to /api/recommendations with:
  - Current prompt
  - Library history (all listened/rated albums)
  - Current recommendation count
  ↓
API route calls AI service with context
  ↓
AI generates new Album objects
  ↓
Albums added to state and displayed in grid
```

---

## Album Actions & Regeneration

When users interact with albums:
- **Rate** or **Mark as Listened** → Album moves to Library
- **Skip** → Album is marked as skipped (doesn't enter Library)

You can optionally trigger automatic regeneration:

**In MusicContext.tsx:**
```typescript
const handleRate = (albumId: string, rating: 1 | 2 | 3 | 4 | 5) => {
  processAlbumAction(albumId, { rating, listened: true, skipped: false });
  regenerateRecommendations(); // Auto-regenerate
};
```

---

## Testing Without API Setup

To test the UI without setting up an AI service:

1. Modify `/src/app/api/recommendations/route.ts` to return mock data
2. The error message will guide you to implement the real service

---

## Future Improvements

- **Prompt versioning** (save multiple search prompts)
- **Smarter skip tracking** (learn from skips)
- **Real-time regeneration** (auto-refill as users interact)
- **Album metadata** (fetch from Spotify, MusicBrainz, Last.fm)
- **Review sources** (scrape real reviews or use APIs)
