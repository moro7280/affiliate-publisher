export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { endpoint, apiKey, payload } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key mancante' });
    }

    let url;
    if (endpoint === 'chat') {
      url = 'https://api.openai.com/v1/chat/completions';
    } else if (endpoint === 'image') {
      url = 'https://api.openai.com/v1/images/generations';
    } else {
      return res.status(400).json({ error: 'Endpoint non valido' });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || `Errore ${response.status}` });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
