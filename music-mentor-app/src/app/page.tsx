'use client';

import AlbumCard from '@/components/AlbumCard';
import PromptEditor from '@/components/PromptEditor';
import { useMusic } from '@/context/MusicContext';

export default function Home() {
  const { recommendations, isLoading, error, isAuthenticated, authReady, settings } = useMusic();

  if (!authReady) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <PromptEditor />
        <p className="text-muted">Checking sign-in status...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <PromptEditor />
        <div className="mt-10">
          <h2 className="text-3xl font-serif mb-3">A place to begin</h2>
          <p className="text-muted">Sign in to save your prompt and recommendations.</p>
        </div>
      </div>
    );
  }

  if (error && recommendations.length === 0) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <PromptEditor />
        <div className="mt-8 text-red-700">
          <h2 className="text-2xl font-serif mb-2">Setup Required</h2>
          <p className="mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
      <div className="container mx-auto px-6 py-8 max-w-5xl">
        <PromptEditor />
      {recommendations.length > 0 && recommendations.length < settings.recommendationsCount && (
        <div className="mb-6 text-sm text-muted">
          Showing {recommendations.length} verified albums. Searching for more in the background.
        </div>
      )}
      {error && recommendations.length > 0 && (
        <div className="mb-6 text-sm text-red-700">
          Some recommendations could not be verified. Showing what is available.
        </div>
      )}
      <div className="space-y-6">
        {recommendations.map(album => (
          <AlbumCard key={album.id} album={album} isRefreshing={isLoading} />
        ))}
        {recommendations.length < settings.recommendationsCount && (
          [...Array(settings.recommendationsCount - recommendations.length)].map((_, i) => (
            <div
              key={`loading-${i}`}
              className="flex flex-col md:flex-row gap-5 pb-6 border-b divider"
            >
              {isLoading ? (
                <>
                  <div className="w-full h-72 md:w-56 md:h-56 bg-[var(--divider)] animate-pulse" />
                  <div className="flex flex-col flex-grow gap-3 animate-pulse">
                    <div className="h-6 bg-[var(--divider)] w-2/3" />
                    <div className="h-3 bg-[var(--divider)] w-1/3" />
                    <div className="h-4 bg-[var(--divider)] w-full mt-4" />
                    <div className="h-4 bg-[var(--divider)] w-5/6" />
                  </div>
                </>
              ) : (
                <div className="text-muted text-sm">No more recommendations</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
