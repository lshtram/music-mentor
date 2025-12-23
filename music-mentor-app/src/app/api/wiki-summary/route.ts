const WIKI_BASE_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const title = url.searchParams.get('title')?.trim() || '';

    if (!title) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }

    const wikiUrl = `${WIKI_BASE_URL}${encodeURIComponent(title)}`;
    const response = await fetch(wikiUrl, {
      headers: {
        'User-Agent': 'music-mentor/0.1 (dev@example.com)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      return Response.json(
        { title, exists: false },
        { status: response.status === 404 ? 200 : response.status }
      );
    }

    const data = await response.json();
    const extract = typeof data.extract === 'string' ? data.extract.trim() : '';
    const pageUrl = data?.content_urls?.desktop?.page || '';

    return Response.json({
      title: data.title || title,
      extract,
      url: pageUrl,
      exists: Boolean(extract),
    });
  } catch (error) {
    console.error('Wiki summary error:', error);
    return Response.json({ error: 'Failed to fetch summary' }, { status: 500 });
  }
}
