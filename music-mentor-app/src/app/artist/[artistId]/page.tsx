'use client';

import { useParams } from 'next/navigation';
import { useMusic } from '@/context/MusicContext';
import AlbumCard from '@/components/AlbumCard';
import Link from 'next/link';

export default function ArtistDetailPage() {
  const params = useParams();
  const { getArtistDetails, getAlbumsByArtist } = useMusic();

  const artistId = params.artistId as string;

  const artist = getArtistDetails(artistId);
  const albums = getAlbumsByArtist(artistId);

  if (!artist) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h1 className="text-2xl font-bold">Artist not found</h1>
        <Link href="/" className="text-blue-400 hover:underline mt-4 inline-block">
          &larr; Back to Recommendations
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">{artist.name}</h1>
        <p className="text-gray-400 max-w-2xl">{artist.bio}</p>
      </div>
      
      <h2 className="text-2xl font-bold mb-4 text-white">Albums in your collection</h2>
      {albums.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {albums.map(album => (
            <AlbumCard key={album.id} album={album} />
          ))}
        </div>
      ) : (
        <p className="text-gray-500">No albums by this artist have been recommended yet.</p>
      )}
    </div>
  );
}
