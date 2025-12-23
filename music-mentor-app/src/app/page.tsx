'use client';

import AlbumCard from '@/components/AlbumCard';
import PromptEditor from '@/components/PromptEditor';
import { useMusic } from '@/context/MusicContext';

export default function Home() {
  const { recommendations, isLoading, error, isAuthenticated, authReady } = useMusic();

  if (!authReady) {
    return (
      <div className="container mx-auto p-6">
        <PromptEditor />
        <p className="text-gray-400">Checking sign-in status...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto p-6">
        <PromptEditor />
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-gray-200">
          <h2 className="text-xl font-bold mb-2">Sign in required</h2>
          <p className="text-gray-400">Sign in to save your prompt and recommendations.</p>
        </div>
      </div>
    );
  }

  if (error && recommendations.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <PromptEditor />
        <div className="bg-red-900 border border-red-700 rounded-lg p-6 text-red-200">
          <h2 className="text-xl font-bold mb-2">Setup Required</h2>
          <p className="mb-4">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <PromptEditor />
      <h2 className="text-2xl font-bold mb-4 text-white">Your Recommendations</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
        {recommendations.map(album => (
          <AlbumCard key={album.id} album={album} />
        ))}
        {recommendations.length < 5 && (
          [...Array(5 - recommendations.length)].map((_, i) => (
            <div
              key={`loading-${i}`}
              className="bg-gray-800 rounded-lg shadow-xl flex items-center justify-center h-full min-h-[400px]"
            >
              <div className="text-center">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-400">Loading recommendations...</p>
                  </>
                ) : (
                  <p className="text-gray-500">No more recommendations</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

