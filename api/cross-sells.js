function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.SWEEP_API_TOKEN) {
    return res.status(500).json({ error: 'server_misconfig', note: 'SWEEP_API_TOKEN is not set' });
  }

  try {
    const upstream = await fetch('https://openapi.sweepandgo.com/api/v2/packages_list', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${process.env.SWEEP_API_TOKEN}` }
    });

    const text = await upstream.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'upstream_error', details: data });
    }

    const list = data?.cross_sells || data?.data?.cross_sells || [];
    const arr = Array.isArray(list) ? list : [];
    const first = arr[0];

    const id = first?.id || first?.uuid || first?.cross_sell_id || first?.promotion_id || null;
    if (!id) {
      return res.status(404).json({ error: 'no_cross_sells_found', details: data });
    }

    return res.status(200).json({ success: true, cross_sell_id: String(id) });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}
