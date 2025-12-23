'use client';

import { useMusic } from '@/context/MusicContext';

export default function PromptEditor() {
  const { prompt, setPrompt, regenerateRecommendations, isLoading, error } = useMusic();

  const handleSave = async () => {
    await regenerateRecommendations(true); // Replace all 5
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
      <h2 className="text-lg font-semibold mb-2 text-gray-200">Your Prompt</h2>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full h-24 p-2 bg-gray-900 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
        placeholder="Enter your music preferences..."
        disabled={isLoading}
      />
      {error && (
        <div className="mt-2 p-2 bg-red-900 border border-red-700 rounded text-red-200 text-sm">
          {error}
        </div>
      )}
      <div className="flex justify-end mt-2">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg shadow-md transition-colors duration-200"
        >
          {isLoading ? 'Regenerating...' : 'Save & Regenerate'}
        </button>
      </div>
    </div>
  );
}
