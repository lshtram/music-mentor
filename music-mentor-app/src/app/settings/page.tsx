'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { useMusic } from '@/context/MusicContext';

export default function SettingsPage() {
  const { settings, updateSettings, updatePassword, isAuthenticated, authReady } = useMusic();
  const [baseQuest, setBaseQuest] = useState('');
  const [isLoadingQuest, setIsLoadingQuest] = useState(false);
  const [questError, setQuestError] = useState('');
  const [recommendationsCount, setRecommendationsCount] = useState(settings.recommendationsCount);
  const [preferredMusicApp, setPreferredMusicApp] = useState(settings.preferredMusicApp);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setRecommendationsCount(settings.recommendationsCount);
    setPreferredMusicApp(settings.preferredMusicApp);
  }, [settings.recommendationsCount, settings.preferredMusicApp]);

  useEffect(() => {
    const loadBaseQuest = async () => {
      if (!isAuthenticated) return;
      setIsLoadingQuest(true);
      setQuestError('');
      try {
        const { data } = await supabaseClient.auth.getSession();
        const token = data.session?.access_token;
        if (!token) {
          setQuestError('No session found.');
          return;
        }
        const response = await fetch('/api/base-quest', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Failed to load base quest.');
        }
        const dataResponse = await response.json();
        setBaseQuest(dataResponse?.summary || '');
      } catch (error) {
        setQuestError(error instanceof Error ? error.message : 'Failed to load base quest.');
      } finally {
        setIsLoadingQuest(false);
      }
    };
    loadBaseQuest();
  }, [isAuthenticated]);

  if (!authReady) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <p className="text-muted">Checking sign-in status...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-serif mb-4">Settings</h1>
        <p className="text-muted">Sign in to manage your settings.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <h1 className="text-4xl font-serif mb-8">Settings</h1>

      <section className="mb-10">
        <h2 className="text-2xl font-serif mb-3">Base Quest</h2>
        {isLoadingQuest ? (
          <p className="text-muted">Summarizing your prompts...</p>
        ) : questError ? (
          <p className="text-sm text-red-700">{questError}</p>
        ) : (
          <p className="text-muted leading-relaxed">
            {baseQuest || 'No prompt history yet.'}
          </p>
        )}
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-serif mb-3">Recommendations</h2>
        <div className="flex flex-col gap-4 max-w-sm">
          <label className="text-sm text-muted">Albums to show</label>
          <input
            type="number"
            min={3}
            max={10}
            value={recommendationsCount}
            onChange={(event) => setRecommendationsCount(Number(event.target.value))}
            className="p-2 bg-transparent border-b divider focus:outline-none text-muted"
          />
          <button
            onClick={async () => {
              await updateSettings({ recommendationsCount });
              setStatus('Settings saved.');
            }}
            className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4 self-start"
          >
            Save recommendation count
          </button>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-2xl font-serif mb-3">Music App</h2>
        <div className="flex flex-col gap-4 max-w-sm">
          <label className="text-sm text-muted">Preferred app</label>
          <select
            value={preferredMusicApp}
            onChange={(event) => setPreferredMusicApp(event.target.value as 'apple' | 'spotify' | 'other')}
            className="p-2 bg-transparent border-b divider focus:outline-none text-muted"
          >
            <option value="apple">Apple Music</option>
            <option value="spotify">Spotify</option>
            <option value="other">Other</option>
          </select>
          <button
            onClick={async () => {
              await updateSettings({ preferredMusicApp });
              setStatus('Settings saved.');
            }}
            className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4 self-start"
          >
            Save music app
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-serif mb-3">Password</h2>
        <div className="flex flex-col gap-4 max-w-sm">
          <label className="text-sm text-muted">New password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="p-2 bg-transparent border-b divider focus:outline-none text-muted"
          />
          <button
            onClick={async () => {
              await updatePassword(password);
              setPassword('');
              setStatus('Password updated.');
            }}
            className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4 self-start"
          >
            Update password
          </button>
        </div>
      </section>

      {status && <p className="mt-6 text-sm text-muted">{status}</p>}
    </div>
  );
}
