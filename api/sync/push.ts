export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { operations = [] } = req.body || {};
  const processedIds: string[] = [];

  if (Array.isArray(operations)) {
    for (const op of operations) {
      if (op && op.id) {
        processedIds.push(op.id);
      }
    }
  }

  return res.status(200).json({
    ok: true,
    processedCount: processedIds.length,
    processedIds,
    errors: [],
    timestamp: new Date().toISOString(),
    mode: 'vercel-edge-sync',
  });
}
