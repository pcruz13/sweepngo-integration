function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // or your site origin
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.SWEEP_API_TOKEN) {
    return res.status(500).json({ error: 'server_misconfig', note: 'SWEEP_API_TOKEN is not set' });
  }

  try {
    const {
      email, first_name, last_name, phone,
      address, city, state, zip_code,
      clean_up_frequency, billing_interval
    } = (req.body && typeof req.body === 'object') ? req.body : {};

    if (!email || !first_name || !last_name || !address || !city || !state || !zip_code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const payload = {
      organization: 'doody-free-xriqu',
      email, first_name, last_name,
      home_phone_number: phone || '',
      home_address: address,
      city, state, zip_code,
      category: 'cleanup',
      clean_up_frequency: clean_up_frequency || 'weekly',
      billing_interval: billing_interval || 'monthly'
    };

    const upstream = await fetch('https://openapi.sweepandgo.com/api/v2/client_on_boarding/create_client_with_package', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SWEEP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const text = await upstream.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'upstream_error', details: data });
    }

    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}
