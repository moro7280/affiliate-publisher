export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL mancante' });
    }

    // Fetch image server-side (no CORS issues)
    const response = await fetch(url);

    if (!response.ok) {
      return res.status(response.status).json({ error: `Errore fetch immagine: ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.byteLength);
    res.status(200).send(Buffer.from(buffer));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
