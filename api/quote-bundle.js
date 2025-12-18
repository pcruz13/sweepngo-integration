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
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const zip_code = String(body.zip_code || '').trim().slice(0, 5);
    const dogs = String(body.dogs || '1').trim();
    const clean_up_frequency = String(body.clean_up_frequency || '').trim();

    if (!zip_code || !clean_up_frequency) {
      return res.status(400).json({ error: 'missing_fields', required: ['zip_code','clean_up_frequency'] });
    }

    // 1) Quote
    const quoteUp = await fetch('https://openapi.sweepandgo.com/api/v2/client_on_boarding/get_quote', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SWEEP_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        organization: 'doody-free-xriqu',
        zip_code,
        dogs,
        clean_up_frequency
      })
    });

    const quoteText = await quoteUp.text();
    let quoteData; try { quoteData = JSON.parse(quoteText); } catch { quoteData = { raw: quoteText }; }

    if (!quoteUp.ok) {
      return res.status(quoteUp.status).json({ error: 'upstream_error', where: 'quote', details: quoteData });
    }

    // 2) Cross sells: try from quote, otherwise fetch packages_list
    let crossSells = Array.isArray(quoteData?.cross_sells) ? quoteData.cross_sells : [];

    if (!crossSells.length) {
      const pkgUp = await fetch('https://openapi.sweepandgo.com/api/v2/packages_list', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.SWEEP_API_TOKEN}` }
      });

      const pkgText = await pkgUp.text();
      let pkg; try { pkg = JSON.parse(pkgText); } catch { pkg = { raw: pkgText }; }

      if (pkgUp.ok) {
        // handle both possible shapes
        const maybe = pkg?.cross_sells || pkg?.data?.cross_sells || [];
        crossSells = Array.isArray(maybe) ? maybe : [];
      }
    }

    return res.status(200).json({
      success: true,
      quote: quoteData,
      cross_sells: crossSells
    });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}
