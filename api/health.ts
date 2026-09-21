export default function handler(req: any, res: any) {
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(200).json({
    status: 'ok',
    service: 'Hossidev Water Monitor SCADA Serverless',
    time: new Date().toISOString(),
    version: '2.0.0-VERCEL',
    mode: 'serverless-edge',
  });
}
