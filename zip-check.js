export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try {
    const { zip } = (req.body && typeof req.body === 'object') ? req.body : {};
    if (!zip) return res.status(400).json({error:'Missing zip'});

    const url = new URL('https://openapi.sweepandgo.com/api/v2/client_on_boarding/check_zip_code_exists');
    url.searchParams.set('organization', 'doody-free-xriqu');
    url.searchParams.set('value', String(zip));

    const r = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SWEEP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text }; }
    if (!r.ok) return res.status(r.status).json({error:'upstream', details:data});

    return res.status(200).json({ exists: data?.exists === 'exists' });
  } catch (e) {
    return res.status(500).json({error:'server', message:e.message});
  }
}
