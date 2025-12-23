#!/usr/bin/env node
// Quick check script: validate a cover URL and attempt MusicBrainz -> Cover Art Archive fallback
const urlToCheck = 'https://coverartarchive.org/release/5d174f68-45f1-4b8d-b043-e347f762f141/front';
const title = 'Selected Ambient Works 85–92';
const artist = 'Aphex Twin';

async function urlLooksLikeImage(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    console.log('HEAD', url, '=>', res.status, res.statusText);
    if (!res.ok) return false;
    const ct = res.headers.get('content-type') || '';
    console.log('Content-Type:', ct);
    return ct.startsWith('image/');
  } catch (e) {
    console.error('HEAD error', e);
    return false;
  }
}

async function findCoverViaMusicBrainz(title, artistName) {
  try {
    const query = `release:"${title}" AND artist:"${artistName}"`;
    console.log('MusicBrainz query:', query);
    const mbRes = await fetch(
      `https://musicbrainz.org/ws/2/release/?query=${encodeURIComponent(query)}&fmt=json&limit=1`,
      { headers: { 'User-Agent': 'music-mentor-check/0.1 (dev@example.com)' } }
    );
    console.log('MusicBrainz status:', mbRes.status);
    if (!mbRes.ok) return null;
    const mbJson = await mbRes.json();
    const first = mbJson.releases && mbJson.releases[0];
    console.log('MusicBrainz first release:', first && (first.id || first.title));
    if (!first || !first.id) return null;
    const mbid = first.id;

    const caaRes = await fetch(`https://coverartarchive.org/release/${mbid}`);
    console.log('CoverArtArchive status:', caaRes.status);
    if (!caaRes.ok) return null;
    const caaJson = await caaRes.json();
    const images = caaJson.images || [];
    console.log('CoverArt images count:', images.length);
    if (images.length === 0) return null;
    const front = images.find(im => im.front) || images[0];
    return front.image || front.thumbnails?.large || front.thumbnails?.small || null;
  } catch (e) {
    console.error('MB/CoverArt error', e);
    return null;
  }
}

(async () => {
  console.log('Checking original URL...');
  const ok = await urlLooksLikeImage(urlToCheck);
  if (ok) {
    console.log('Original URL is a valid image:', urlToCheck);
    return;
  }
  console.log('Original URL invalid; trying MusicBrainz lookup...');
  const found = await findCoverViaMusicBrainz(title, artist);
  if (found) {
    console.log('Found cover via MusicBrainz/CoverArtArchive:', found);
  } else {
    console.log('No cover found via MusicBrainz/CoverArtArchive for', title, 'by', artist);
  }
})();
