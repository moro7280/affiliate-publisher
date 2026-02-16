export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL mancante' });
    }

    // Follow redirects and fetch the final landing page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Errore fetch: ${response.status}` });
    }

    const html = await response.text();
    const finalUrl = response.url;

    // Extract useful text content - strip scripts, styles, and HTML tags
    let text = html
      // Remove scripts and styles
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
      // Keep some structure hints
      .replace(/<h[1-6][^>]*>/gi, '\n### ')
      .replace(/<\/h[1-6]>/gi, '\n')
      .replace(/<li[^>]*>/gi, '\n- ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<div[^>]*>/gi, '\n')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&euro;/g, '€')
      .replace(/&nbsp;/g, ' ')
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Truncate to ~4000 chars to fit in AI context
    if (text.length > 4000) {
      text = text.substring(0, 4000) + '...';
    }

    // Also extract meta tags
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([\s\S]*?)["']/i);

    // Extract all image URLs from the page
    const imgMatches = [...html.matchAll(/<img[^>]*src=["'](https?:\/\/[^"']+)["'][^>]*>/gi)];
    const images = imgMatches.map(m => m[1]).filter(u => !u.includes('pixel') && !u.includes('track') && !u.includes('1x1')).slice(0, 5);

    return res.status(200).json({
      finalUrl,
      title: (ogTitleMatch?.[1] || titleMatch?.[1] || '').trim(),
      description: (ogDescMatch?.[1] || descMatch?.[1] || '').trim(),
      ogImage: ogImageMatch?.[1] || '',
      images,
      text,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
