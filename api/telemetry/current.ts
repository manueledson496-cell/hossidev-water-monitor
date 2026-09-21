export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    hasRealData: false,
    isOnline: true,
    lastCommunication: null,
    lastCommunicationTimestamp: null,
    tanks: {},
    nodes: {
      node1: { id: 1, name: 'Node 1', label: 'Água Tratada', role: 'Tanques 1 e 2', busPort: 'COM3', status: 'offline', lastPing: null, packetCount: 0 },
      node2: { id: 2, name: 'Node 2', label: 'Água Não Tratada', role: 'Tanques 3 e 4', busPort: 'COM4', status: 'offline', lastPing: null, packetCount: 0 },
      node3: { id: 3, name: 'Node 3', label: 'Água Bruta', role: 'Tanques 5 e 6', busPort: 'COM5', status: 'offline', lastPing: null, packetCount: 0 },
    },
    systemConfig: {
      audioAlarmEnabled: true,
      emergencyLockout: false,
      watchdogTimeoutMs: 30000,
    },
    metrics: {
      totalCapacityLiters: 90000,
      totalCurrentLiters: 0,
      averageLevelPercent: 0,
      activePumpsCount: 0,
      activeAlarmsCount: 0,
      faultsCount: 0,
    },
    isOfflineFallback: true,
  });
}
