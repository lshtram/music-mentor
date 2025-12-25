export interface Artist {
  id: string;
  name: string;
  bio?: string;
}

export interface PersonnelMember {
  name: string;
  role: string;
  artistId?: string;
}

export interface Album {
  id: string;
  title: string;
  artist: Artist;
  coverUrl: string;
  previewUrl?: string;
  appleMusicUrl?: string;
  summary: string;
  rating?: 1 | 2 | 3 | 4 | 5;
  listened: boolean;
  dateAdded?: string;
  skipped?: boolean;
  personnel?: PersonnelMember[];
  releaseYear?: number;
  genres?: string[];
}

export interface AlbumSeed {
  title: string;
  artist: string;
}

export interface UserSettings {
  recommendationsCount: number;
  preferredMusicApp: 'apple' | 'spotify' | 'other';
}
