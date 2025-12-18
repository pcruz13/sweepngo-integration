function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.SWEEP_API_TOKEN) {
    return res.status(500).json({ error: 'server_misconfig', note: 'SWEEP_API_TOKEN is not set' });
  }

  try {
    const { zip_code, dogs, clean_up_frequency, last_time_yard_was_thoroughly_cleaned, coupon_code } =
      (req.body && typeof req.body === 'object') ? req.body : {};

    if (!zip_code || !dogs || !clean_up_frequency) {
      return res.status(400).json({ error: 'missing_fields', missing: ['zip_code','dogs','clean_up_frequency'].filter(k => !req.body?.[k]) });
    }

    // NOTE: This is the endpoint described in the docs as:
    // "Get price, tax percent, cross sells, cross sells placement, custom price and more"
    // (We’re using the same one the onboarding flow relies on.) :contentReference[oaicite:3]{index=3}
    const url = new URL('https://openapi.sweepandgo.com/api/v2/client_on_boarding/get_price');
    url.searchParams.set('organization', 'doody-free-xriqu');
    url.searchParams.set('zip_code', String(zip_code));
    url.searchParams.set('dogs', String(dogs));
    url.searchParams.set('clean_up_frequency', String(clean_up_frequency));

    // Only send these if you use them
    if (coupon_code) url.searchParams.set('coupon_code', String(coupon_code));
    if (last_time_yard_was_thoroughly_cleaned) {
      url.searchParams.set('last_time_yard_was_thoroughly_cleaned', String(last_time_yard_was_thoroughly_cleaned));
    }

    const upstream = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SWEEP_API_TOKEN}`,
        'Accept': 'application/json'
      }
    });

    const text = await upstream.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }

    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'upstream_error', details: data });
    }

    // Pull cross_sells from the quote payload (if present)
    const crossSells = Array.isArray(data?.cross_sells) ? data.cross_sells : [];
    const cross_sell_id = crossSells?.[0]?.id ? String(crossSells[0].id) : null;

    return res.status(200).json({
      success: true,
      quote: data,
      cross_sell_id
    });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}
