function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // or your site origin
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// Pull dog blocks dynamically from fields like dog_name_1, safe_in_yard_1, dog_comment_1, etc.
function extractDogs(body) {
  const dogs = [];
  for (let i = 1; i <= 10; i++) {
    const name = body[`dog_name_${i}`];
    const safe = body[`safe_in_yard_${i}`];
    const comment = body[`dog_comment_${i}`];

    if (name || safe || comment) {
      dogs.push({
        index: i,
        name: name || '',
        safe_in_yard: safe || '',
        comment: comment || ''
      });
    }
  }
  return dogs;
}

// Build a readable "notes" block to preserve your extra form fields
function buildNotes(body) {
  const dogs = extractDogs(body);

  const extras = {
    coupon_code: body.coupon_code || '',
    gate_location: body.gate_location || '',
    gated_community: body.gated_community || '',
    cleanup_notifications: body.cleanup_notifications || '',
    notification_type: body.notification_type || '',
    payment_method: body.payment_method || '',
    heard_about: body.heard_about || '',
    additional_comments: body.additional_comments || '',
    dogs
  };

  // Remove empty fields
  for (const k of Object.keys(extras)) {
    const v = extras[k];
    const isEmptyArray = Array.isArray(v) && v.length === 0;
    const isEmptyString = typeof v === 'string' && v.trim() === '';
    if (isEmptyArray || isEmptyString) delete extras[k];
  }

  if (Object.keys(extras).length === 0) return '';

  return `Webflow Signup Details:\n${JSON.stringify(extras, null, 2)}`;
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.SWEEP_API_TOKEN) {
    return res.status(500).json({ error: 'server_misconfig', note: 'SWEEP_API_TOKEN is not set' });
  }

  try {
    const body =
      (req.body && typeof req.body === 'object')
        ? req.body
        : (typeof req.body === 'string' && req.body ? JSON.parse(req.body) : {});

    const {
      email, first_name, last_name, phone,
      address, city, state, zip_code,
      clean_up_frequency, billing_interval
    } = body;

    if (!email || !first_name || !last_name || !address || !city || !state || !zip_code) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const notes = buildNotes(body);

    const payload = {
      organization: 'doody-free-xriqu',
      email,
      first_name,
      last_name,
      home_phone_number: phone || '',
      home_address: address,
      city,
      state,
      zip_code,
      category: 'cleanup',
      clean_up_frequency: clean_up_frequency || 'weekly',
      billing_interval: billing_interval || 'monthly',

      // ✅ Preserve all extra form answers (safe fallback)
      ...(notes ? { notes } : {})
    };

    const upstream = await fetch(
      'https://openapi.sweepandgo.com/api/v2/client_on_boarding/create_client_with_package',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SWEEP_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );

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
