'use client';

import { useMusic } from '@/context/MusicContext';

export default function PromptEditor() {
  const {
    prompt,
    setPrompt,
    regenerateRecommendations,
    randomizePrompt,
    restoreOriginalPrompt,
    isLoading,
    error,
  } = useMusic();

  const handleSave = async () => {
    await regenerateRecommendations(true); // Replace all 5
  };

  return (
    <div className="mb-6">
      <h2 className="text-2xl font-serif mb-3">Your Prompt</h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={2}
        className="w-full min-h-[72px] max-h-[240px] p-2 bg-transparent border-b divider focus:outline-none text-base text-muted resize-y"
        placeholder="Enter your music preferences..."
        disabled={isLoading}
      />
      {error && (
        <div className="mt-2 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="flex items-center justify-between mt-3">
        <button
          onClick={restoreOriginalPrompt}
          disabled={isLoading}
          className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4 disabled:text-muted"
        >
          Original quest
        </button>
        <div className="flex items-center gap-4">
        <button
          onClick={randomizePrompt}
          disabled={isLoading}
          className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4 disabled:text-muted"
        >
          Randomize prompt
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4 disabled:text-muted"
        >
          Save & Regenerate
        </button>
        </div>
      </div>
    </div>
  );
}
