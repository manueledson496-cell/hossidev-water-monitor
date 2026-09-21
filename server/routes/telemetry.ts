import { Router } from 'express';
import crypto from 'crypto';
import { loadDb, saveDb, TelemetryReadingRecord, LogRecord } from '../db';
import { authMiddleware, requireAdmin, AuthRequest } from '../auth';

const router = Router();

// Ingestion endpoint for Arduino / ESP32 Gateway / Web Serial Client Bridge
// POST /api/telemetry/ingest
router.post('/ingest', (req, res) => {
  const payload = req.body;

  if (!payload) {
    return res.status(400).json({ error: 'Payload de telemetria vazio.' });
  }

  const db = loadDb();
  const now = Date.now();
  const isoTime = new Date().toISOString();
  const timeStr = new Date().toLocaleTimeString();

  // Support Unified Arduino Master Gateway JSON:
  // e.g. { device: "kizomba", uptime: 120, node1: { status: "online", tanks: [...] }, node2: { ... }, node3: { ... } }
  // OR Single Node: { node: 1, tanks: [...] }
  // OR Flat Array: { tanks: [...] }
  // OR Single Tank: { id: 1, level: 75, sensors: [...] }

  const incomingTanks: Array<{
    id: number;
    level?: number;
    pump?: number;
    sensors?: number[];
    fault?: number;
    fault_mask?: number[];
    nodeId?: number;
  }> = [];

  // 1. Check for node1, node2, node3 in payload
  for (const nodeKey of ['node1', 'node2', 'node3'] as const) {
    const nodeData = payload[nodeKey];
    if (nodeData && typeof nodeData === 'object') {
      const nId = nodeKey === 'node1' ? 1 : nodeKey === 'node2' ? 2 : 3;
      if (db.nodes[nodeKey]) {
        db.nodes[nodeKey].status = nodeData.status === 'online' || Array.isArray(nodeData.tanks) ? 'online' : 'offline';
        db.nodes[nodeKey].lastPing = now;
        db.nodes[nodeKey].packetCount += 1;
      }
      if (Array.isArray(nodeData.tanks)) {
        for (const t of nodeData.tanks) {
          incomingTanks.push({ ...t, nodeId: nId });
        }
      }
    }
  }

  // 2. Check for direct tanks array or node property
  if (Array.isArray(payload.tanks)) {
    const defaultNodeId = Number(payload.node || payload.nodeId || 1);
    const nodeKey = `node${defaultNodeId}` as 'node1' | 'node2' | 'node3';
    if (db.nodes[nodeKey]) {
      db.nodes[nodeKey].status = 'online';
      db.nodes[nodeKey].lastPing = now;
      db.nodes[nodeKey].packetCount += 1;
    }
    for (const t of payload.tanks) {
      incomingTanks.push({ ...t, nodeId: t.nodeId || defaultNodeId });
    }
  } else if (payload.id && (payload.level !== undefined || payload.sensors !== undefined)) {
    const defaultNodeId = Number(payload.node || payload.nodeId || 1);
    incomingTanks.push({ ...payload, nodeId: defaultNodeId });
  }

  let updatedCount = 0;

  for (const t of incomingTanks) {
    const tankId = Number(t.id);
    if (!db.currentTanks[tankId]) continue;

    const tank = db.currentTanks[tankId];
    const nId = t.nodeId || tank.nodeId || 1;

    // Compute actual 10-probe sensor array if passed, or synthesize from level
    let sensors = Array.isArray(t.sensors) && t.sensors.length === 10 ? t.sensors.map((v) => (v ? 1 : 0)) : null;
    let level = typeof t.level === 'number' && !isNaN(t.level) ? Math.min(100, Math.max(0, Math.round(t.level))) : null;

    if (sensors && level === null) {
      // If discrete sensors provided, level is count of submerged probes * 10
      const activeCount = sensors.filter((s) => s === 1).length;
      level = activeCount * 10;
    } else if (level !== null && !sensors) {
      // If level is provided, active probes correspond to level
      const activeProbes = Math.min(10, Math.max(0, Math.floor(level / 10)));
      sensors = Array.from({ length: 10 }, (_, i) => (i < activeProbes ? 1 : 0));
    } else if (!sensors && level === null) {
      continue;
    }

    // Physical sensor discontinuity analysis (real sensor fault detection)
    const fault_mask = Array.isArray(t.fault_mask) && t.fault_mask.length === 10
      ? t.fault_mask
      : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    // Detect optical probe discontinuity (e.g. sensor 1 is 1, sensor 2 is 0, sensor 3 is 1)
    if (sensors) {
      for (let i = 0; i < 9; i++) {
        if (sensors[i] === 0 && sensors[i + 1] === 1) {
          fault_mask[i] = 1; // Mark probe i as faulty/disconnected
        }
      }
    }

    const hasFault = fault_mask.some((f) => f === 1) || Number(t.fault || 0) === 1 ? 1 : 0;
    const pumpState = Number(t.pump || 0) === 1 ? 1 : 0;

    tank.level = level!;
    tank.pump = pumpState;
    tank.sensors = sensors!;
    tank.fault = hasFault;
    tank.fault_mask = fault_mask;
    tank.lastUpdated = now;
    tank.hasRealData = true;

    // Record in historical telemetry database
    const historyEntry: TelemetryReadingRecord = {
      id: crypto.randomUUID(),
      timestamp: now,
      isoTime,
      nodeId: nId,
      tankId,
      level: level!,
      pump: pumpState,
      sensors: sensors!,
      fault: hasFault,
      fault_mask,
      source: payload.source || 'serial_bridge',
    };

    db.telemetryHistory.push(historyEntry);

    // Keep history capped at 10,000 records to prevent memory overflow
    if (db.telemetryHistory.length > 10000) {
      db.telemetryHistory.splice(0, db.telemetryHistory.length - 10000);
    }

    updatedCount++;
  }

  // Add Log Entry
  const primaryNodeId = Number(payload.node || payload.nodeId || 1);
  const logItem: LogRecord = {
    id: crypto.randomUUID(),
    time: timeStr,
    type: 'rx',
    nodeId: primaryNodeId,
    text: `RX Arduino: ${updatedCount} reservatório(s) sincronizado(s).`,
    rawJson: JSON.stringify(payload),
  };

  db.logs.push(logItem);
  if (db.logs.length > 300) {
    db.logs.splice(0, db.logs.length - 300);
  }

  saveDb();

  res.status(200).json({
    success: true,
    message: 'Telemetria do Arduino processada e persistida com sucesso.',
    updatedTanks: updatedCount,
    timestamp: now,
  });
});

// GET /api/telemetry/current
// Returns current state filtered by user permissions
router.get('/current', authMiddleware, (req: AuthRequest, res) => {
  const user = req.user!;
  const db = loadDb();
  const now = Date.now();
  const watchdogTimeout = db.systemConfig.watchdogTimeoutMs || 8000;

  // Check Watchdog on all nodes
  const nodes = { ...db.nodes };
  for (const k of ['node1', 'node2', 'node3'] as const) {
    const node = nodes[k];
    if (node.lastPing && now - node.lastPing > watchdogTimeout) {
      node.status = 'offline';
    }
  }

  // Filter tanks based on user permissions
  const permittedTanks: Record<number, any> = {};
  let totalCapacityLiters = 0;
  let currentTotalLiters = 0;
  let activePumps = 0;
  let totalFaultySensors = 0;
  let hasAnyRealData = false;
  let latestUpdateTimestamp: number | null = null;

  for (const idStr of Object.keys(db.currentTanks)) {
    const tankId = Number(idStr);
    const tank = db.currentTanks[tankId];

    // Check permission (default to all 6 tanks if not explicitly set)
    const userPermittedIds = Array.isArray(user.permittedTankIds) ? user.permittedTankIds : [1, 2, 3, 4, 5, 6];
    if (user.role !== 'admin' && !userPermittedIds.includes(tankId)) {
      continue;
    }

    const nodeKey = `node${tank.nodeId}` as 'node1' | 'node2' | 'node3';
    const isNodeOnline = nodes[nodeKey] && nodes[nodeKey].status === 'online';

    // If node is offline, this tank has no live connection and is rendered empty
    const effectiveTank = isNodeOnline && tank.hasRealData && tank.level !== null ? tank : {
      ...tank,
      level: null,
      pump: 0,
      sensors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      fault: 0,
      fault_mask: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hasRealData: false,
    };

    const tankCap = typeof effectiveTank.capacityLiters === 'number' ? effectiveTank.capacityLiters : null;
    const computedLiters = effectiveTank.hasRealData && effectiveTank.level !== null && tankCap !== null
      ? Math.round((effectiveTank.level / 100) * tankCap)
      : null;

    permittedTanks[tankId] = {
      ...effectiveTank,
      capacityLiters: tankCap,
      capacity_value: effectiveTank.capacity_value ?? tankCap,
      capacity_unit: effectiveTank.capacity_unit || 'L',
      currentLiters: computedLiters,
    };

    if (tankCap !== null) {
      totalCapacityLiters += tankCap;
    }

    if (effectiveTank.hasRealData && effectiveTank.level !== null) {
      hasAnyRealData = true;
      if (computedLiters !== null) {
        currentTotalLiters += computedLiters;
      }
      if (effectiveTank.pump === 1) activePumps++;
      totalFaultySensors += effectiveTank.fault_mask.filter((f: number) => f === 1).length;

      if (!latestUpdateTimestamp || (effectiveTank.lastUpdated && effectiveTank.lastUpdated > latestUpdateTimestamp)) {
        latestUpdateTimestamp = effectiveTank.lastUpdated;
      }
    }
  }

  const isAnyNodeOnline = Object.values(nodes).some((n) => n.status === 'online');
  
  // Calculate percentage: if volumetric capacity is defined for any tank, use volume ratio;
  // otherwise, average the percentage levels of active tanks
  let totalPercentage = 0;
  if (totalCapacityLiters > 0) {
    totalPercentage = (currentTotalLiters / totalCapacityLiters) * 100;
  } else {
    const activeTanksList = Object.values(permittedTanks).filter((t: any) => t.hasRealData && t.level !== null);
    if (activeTanksList.length > 0) {
      const sumPct = activeTanksList.reduce((acc: number, t: any) => acc + (t.level || 0), 0);
      totalPercentage = sumPct / activeTanksList.length;
    }
  }

  res.json({
    hasRealData: hasAnyRealData,
    isOnline: isAnyNodeOnline,
    lastCommunication: latestUpdateTimestamp ? new Date(latestUpdateTimestamp).toLocaleTimeString() : null,
    lastCommunicationTimestamp: latestUpdateTimestamp,
    tanks: permittedTanks,
    nodes,
    systemConfig: db.systemConfig,
    metrics: {
      totalCapacityLiters,
      currentTotalLiters,
      totalPercentage: Math.round(totalPercentage * 10) / 10,
      activePumps,
      totalFaultySensors,
      estimatedAutonomyHours: currentTotalLiters > 0 ? currentTotalLiters / 850 : 0,
      dailyConsumptionEstimateLiters: currentTotalLiters > 0 ? 18500 : 0,
    },
  });
});

// GET /api/telemetry/history
// Returns real history filtered by tank, period, and user permissions
router.get('/history', authMiddleware, (req: AuthRequest, res) => {
  const user = req.user!;
  const db = loadDb();

  const tankIdParam = req.query.tankId ? Number(req.query.tankId) : null;
  const periodParam = (req.query.period as string) || '24h'; // '1h' | '6h' | '24h' | '7d' | 'all'

  const now = Date.now();
  let timeThreshold = 0;
  if (periodParam === '1h') timeThreshold = now - 1 * 60 * 60 * 1000;
  else if (periodParam === '6h') timeThreshold = now - 6 * 60 * 60 * 1000;
  else if (periodParam === '24h') timeThreshold = now - 24 * 60 * 60 * 1000;
  else if (periodParam === '7d') timeThreshold = now - 7 * 24 * 60 * 60 * 1000;

  let records = db.telemetryHistory.filter((r) => r.timestamp >= timeThreshold);

  // Filter by user's permitted tanks
  if (user.role !== 'admin') {
    records = records.filter((r) => user.permittedTankIds.includes(r.tankId));
  }

  // Filter by specific tank if requested
  if (tankIdParam) {
    if (user.role !== 'admin' && !user.permittedTankIds.includes(tankIdParam)) {
      return res.status(403).json({ error: 'Acesso não permitido a este reservatório.' });
    }
    records = records.filter((r) => r.tankId === tankIdParam);
  }

  // Aggregate time buckets if needed for chart display
  res.json({
    totalRecords: records.length,
    period: periodParam,
    tankId: tankIdParam,
    records,
  });
});

// POST /api/telemetry/command
// Sends command to Arduino
router.post('/command', authMiddleware, (req: AuthRequest, res) => {
  const user = req.user!;
  const { command, tankId, nodeId, value } = req.body;

  if (!command) {
    return res.status(400).json({ error: 'Comando não especificado.' });
  }

  // Check tank permission if tankId is specified
  if (tankId && user.role !== 'admin' && !user.permittedTankIds.includes(Number(tankId))) {
    return res.status(403).json({ error: 'Permissão negada para comandar este reservatório.' });
  }

  const db = loadDb();
  const timeStr = new Date().toLocaleTimeString();

  const logEntry: LogRecord = {
    id: crypto.randomUUID(),
    time: timeStr,
    type: 'tx',
    nodeId: nodeId ? Number(nodeId) : undefined,
    text: `TX [Operador: ${user.username}]: Comando "${command}" enviado ao barramento.`,
    rawJson: JSON.stringify({ command, tankId, nodeId, value, user: user.username }),
  };

  db.logs.push(logEntry);
  if (db.logs.length > 300) db.logs.splice(0, db.logs.length - 300);

  saveDb();

  res.json({
    success: true,
    message: `Comando "${command}" registrado e enfileirado para o Arduino.`,
    timestamp: Date.now(),
  });
});

// POST /api/telemetry/simulate
// Allows direct manual test/calibration of tank levels and sensor probes
router.post('/simulate', authMiddleware, (req: AuthRequest, res) => {
  const { tankId, level, pump, fault_mask } = req.body;
  if (!tankId) {
    return res.status(400).json({ error: 'tankId obrigatório.' });
  }

  const db = loadDb();
  const id = Number(tankId);
  const tank = db.currentTanks[id];

  if (!tank) {
    return res.status(404).json({ error: 'Reservatório não encontrado.' });
  }

  if (typeof level === 'number') {
    tank.level = Math.min(100, Math.max(0, Math.round(level)));
    const activeProbes = Math.min(10, Math.max(0, Math.floor(tank.level / 10)));
    tank.sensors = Array.from({ length: 10 }, (_, i) => (i < activeProbes ? 1 : 0));
  }

  if (typeof pump === 'number') {
    tank.pump = pump === 1 ? 1 : 0;
  }

  if (Array.isArray(fault_mask) && fault_mask.length === 10) {
    tank.fault_mask = fault_mask;
    tank.fault = fault_mask.some((f: number) => f === 1) ? 1 : 0;
  }

  tank.lastUpdated = Date.now();
  tank.hasRealData = true;

  saveDb();

  res.json({
    success: true,
    message: `Reservatório ${id} ajustado com sucesso.`,
    tank,
  });
});

// GET /api/telemetry/logs
router.get('/logs', authMiddleware, (_req, res) => {
  const db = loadDb();
  res.json({ logs: db.logs });
});

// DELETE /api/telemetry/logs
router.delete('/logs', authMiddleware, requireAdmin, (_req, res) => {
  const db = loadDb();
  db.logs = [
    {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString(),
      type: 'system',
      text: 'Buffer de logs seriais limpo pelo administrador.',
    },
  ];
  saveDb();
  res.json({ success: true, message: 'Logs limpos com sucesso.' });
});

export default router;
