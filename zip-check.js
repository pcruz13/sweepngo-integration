export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 0) Safe check for the token
  if (!process.env.SWEEP_API_TOKEN) {
    return res.status(500).json({ error: 'server_misconfig', note: 'SWEEP_API_TOKEN is not set in Vercel env' });
  }

  try {
    // 1) Parse body (supports Next API routes and various clients)
    let zip = '';
    try {
      if (req.body && typeof req.body === 'object') {
        zip = String(req.body.zip || '').trim();
      } else if (typeof req.body === 'string' && req.body) {
        zip = String(JSON.parse(req.body).zip || '').trim();
      }
    } catch (_) { /* ignore */ }

    if (!zip) return res.status(400).json({ error: 'Missing zip' });

    // 2) Call Sweep&Go
    const url = new URL('https://openapi.sweepandgo.com/api/v2/client_on_boarding/check_zip_code_exists');
    url.searchParams.set('organization', 'doody-free-xriqu');
    url.searchParams.set('value', zip);

    const upstream = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SWEEP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const text = await upstream.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    // 3) If upstream errors, show status + a hint (helps debugging)
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: 'upstream_error',
        upstream_status: upstream.status,
        upstream_body: data
      });
    }

    // Expected: { exists: "exists" | "not_exists" }
    const existsFlag = String(data?.exists || data?.status || '').toLowerCase();
    return res.status(200).json({ exists: existsFlag === 'exists' });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}

