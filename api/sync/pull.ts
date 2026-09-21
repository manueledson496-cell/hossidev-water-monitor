export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    ok: true,
    tanks: {},
    recentTelemetry: [],
    systemConfig: {
      audioAlarmEnabled: true,
      emergencyLockout: false,
      watchdogTimeoutMs: 30000,
    },
    timestamp: new Date().toISOString(),
    mode: 'vercel-edge-sync',
  });
}
