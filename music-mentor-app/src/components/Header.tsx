'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMusic } from '@/context/MusicContext';

export default function Header() {
  const { library, userEmail, signInWithEmail, signOut, error, authReady } = useMusic();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');

  return (
    <header className="border-b divider">
      <nav className="container mx-auto px-6 py-4 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <Link href="/" className="flex items-center gap-3 text-3xl font-serif tracking-[0.12em]">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          <span>SoundPath</span>
        </Link>
        <div className="flex items-center gap-6 flex-wrap text-sm">
          <Link href="/" className="text-muted hover:text-[var(--text)]">
            Home
          </Link>
          <Link href="/library" className="text-muted hover:text-[var(--text)]">
            Library ({library.length})
          </Link>
          <Link href="/settings" className="text-muted hover:text-[var(--text)]">
            Settings
          </Link>
          {authReady && userEmail ? (
            <div className="flex items-center gap-3">
              <span className="text-muted">{userEmail}</span>
              <button
                onClick={() => signOut()}
                className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-2 py-1 text-sm bg-transparent border-b divider focus:outline-none"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-2 py-1 text-sm bg-transparent border-b divider focus:outline-none"
              />
              <button
                onClick={async () => {
                  await signInWithEmail(email, password, mode);
                }}
                className="text-sm underline decoration-transparent hover:decoration-current underline-offset-4"
              >
                {mode === 'sign-up' ? 'Sign up' : 'Sign in'}
              </button>
              <button
                onClick={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
                className="text-sm text-muted underline decoration-transparent hover:decoration-current underline-offset-4"
              >
                {mode === 'sign-in' ? 'Create account' : 'Use existing'}
              </button>
            </div>
          )}
        </div>
      </nav>
      {error && <p className="px-6 pb-4 text-sm text-red-700">{error}</p>}
    </header>
  );
}
