function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*'); // or lock to your site origin
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

// --- SIMPLE PRICE TABLE (edit to match your Sweep&Go pricing) ---
// Keys: clean_up_frequency × dogs
const PRICE_TABLE = {
  weekly:      { '1': 16,  '2': 18,  '3': 20,  '4': 22 },
  two_per_week:{ '1': 28,  '2': 32,  '3': 36,  '4': 40 },
  monthly:     { '1': 50,  '2': 60,  '3': 70,  '4': 80 }
};

// Optional: delivery/first-visit, yard-size fee, etc.
function computeQuote({ dogs, clean_up_frequency }) {
  const d = String(dogs || '1');
  const f = String(clean_up_frequency || 'weekly');
  const base = PRICE_TABLE[f]?.[d];
  if (typeof base !== 'number') return null;
  return {
    currency: 'USD',
    interval: (f === 'monthly') ? 'per month' : 'per cleanup',
    price: base,
    breakdown: [{ label: 'Base service', amount: base }]
  };
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body
               : (typeof req.body === 'string' && req.body ? JSON.parse(req.body) : {});
    const { zip_code, dogs, clean_up_frequency } = body;

    if (!zip_code) return res.status(400).json({ error: 'Missing zip_code' });

    // (Optional) you can re-check zip eligibility here by calling your /api/zip-check

    const quote = computeQuote({ dogs, clean_up_frequency });
    if (!quote) return res.status(400).json({ error: 'Unable to compute quote with provided inputs' });

    return res.status(200).json({ success: true, quote });
  } catch (e) {
    return res.status(500).json({ error: 'server_error', message: e.message });
  }
}
