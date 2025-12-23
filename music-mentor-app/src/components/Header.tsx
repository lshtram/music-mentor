'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useMusic } from '@/context/MusicContext';

export default function Header() {
  const { library, userEmail, signInWithEmail, signOut, error, authReady } = useMusic();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  return (
    <header className="bg-gray-900 text-white shadow-md">
      <nav className="container mx-auto px-6 py-4 flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <Link href="/" className="text-2xl font-bold text-white hover:text-gray-300">
          SoundPath
        </Link>
        <div className="flex items-center gap-4 flex-wrap">
          <Link href="/" className="hover:text-gray-300">
            Recommendations
          </Link>
          <Link href="/library" className="hover:text-gray-300">
            Library ({library.length})
          </Link>
          {authReady && userEmail ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300">{userEmail}</span>
              <button
                onClick={() => signOut()}
                className="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
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
                className="px-2 py-1 text-sm bg-gray-800 border border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-100"
              />
              <button
                onClick={async () => {
                  setStatus('');
                  if (!email.trim()) return;
                  await signInWithEmail(email.trim());
                  setStatus('Check your email for a sign-in link.');
                }}
                className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </nav>
      {status && <p className="px-6 pb-3 text-sm text-gray-300">{status}</p>}
      {error && <p className="px-6 pb-3 text-sm text-red-300">{error}</p>}
    </header>
  );
}
