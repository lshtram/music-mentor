'use client';

import { useEffect, useState } from 'react';

interface WikiSummaryData {
  title: string;
  extract: string;
  url?: string;
  exists: boolean;
}

interface WikiSummaryProps {
  name: string;
  fallback?: string;
}

export default function WikiSummary({ name, fallback }: WikiSummaryProps) {
  const [data, setData] = useState<WikiSummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isActive = true;
    const fetchSummary = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/wiki-summary?title=${encodeURIComponent(name)}`);
        const json = await response.json();
        if (isActive) {
          setData(json);
        }
      } catch (error) {
        if (isActive) {
          setData({ title: name, extract: '', exists: false });
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    if (name) {
      fetchSummary();
    }

    return () => {
      isActive = false;
    };
  }, [name]);

  if (isLoading) {
    return <p className="text-muted italic">Loading summary...</p>;
  }

  if (data?.exists && data.extract) {
    return (
      <div className="space-y-3 text-muted leading-relaxed">
        <p>{data.extract}</p>
        {data.url && (
          <a
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--accent)] hover:underline text-sm font-semibold"
          >
            → Read more on Wikipedia
          </a>
        )}
      </div>
    );
  }

  if (fallback) {
    return (
      <div className="text-muted space-y-3 leading-relaxed">
        {fallback.split('\n\n').map((paragraph, idx) => (
          <p key={idx}>{paragraph}</p>
        ))}
      </div>
    );
  }

  return <p className="text-muted italic">No summary available.</p>;
}
