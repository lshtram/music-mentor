/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useEffect, useRef } from 'react';

interface AlbumCoverProps {
  src: string;
  alt: string;
}

// Simple deterministic color generator for fallback backgrounds
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff;
    color += ('00' + Math.max(0, value - 60).toString(16)).slice(-2);
  }
  return color;
};

export default function AlbumCover({ src, alt }: AlbumCoverProps) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
    if (imgRef.current && imgRef.current.complete) {
      setLoaded(true);
    }
  }, [src]);

  if (!src || src.trim() === '') {
    return (
      <div className="w-full h-full flex items-center justify-center p-4" style={{ backgroundColor: stringToColor(alt) }}>
        <p className="text-sm sm:text-lg text-muted">{alt}</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ backgroundColor: stringToColor(alt) }}>
      {!loaded && !errored && (
        <div className="absolute inset-0">
          <div className="h-full w-full animate-pulse bg-[var(--divider)] opacity-70" />
        </div>
      )}

      {errored ? (
        <div className="w-full h-full flex items-center justify-center p-4">
          <p className="text-sm text-muted">{alt}</p>
        </div>
      ) : (
        // Use a normal <img> to avoid Next Image host whitelist problems
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onLoad={() => setLoaded(true)}
          onError={(e) => {
            console.error('AlbumCover image error', { src, alt, e });
            setErrored(true);
          }}
          loading="lazy"
        />
      )}
    </div>
  );
}
