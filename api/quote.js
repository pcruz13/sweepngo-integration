function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.SWEEP_API_TOKEN) {
    return res.status(500).json({ error: 'server_misconfig', note: 'SWEEP_API_TOKEN is not set' });
  }

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : JSON.parse(req.body || '{}');
    const zip_code = String(body.zip_code || '').trim();
    const number_of_dogs = String(body.dogs || body.number_of_dogs || '').trim();
    const clean_up_frequency = String(body.clean_up_frequency || '').trim();

    // Pick a default that matches Sweep&Go’s accepted values
    const last_time_yard_was_thoroughly_cleaned =
      String(body.last_time_yard_was_thoroughly_cleaned || 'one_week').trim();

    if (!zip_code || zip_code.length !== 5) return res.status(400).json({ error: 'invalid_zip' });
    if (!number_of_dogs) return res.status(400).json({ error: 'missing_number_of_dogs' });
    if (!clean_up_frequency) return res.status(400).json({ error: 'missing_clean_up_frequency' });

    const url = new URL('https://openapi.sweepandgo.com/api/v2/client_on_boarding/price_registration_form');
    url.searchParams.set('organization', 'doody-free-xriqu');
    url.searchParams.set('zip_code', zip_code);
    url.searchParams.set('number_of_dogs', number_of_dogs);
    url.searchParams.set('clean_up_frequency', clean_up_frequency);

    const upstream = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.SWEEP_API_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const text = await upstream.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'upstream_error', details: data });
    }

    // Return the whole Sweep&Go payload, or simplify it here once you see its shape
    return res.status(200).json({ success: true, quote: data });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}
