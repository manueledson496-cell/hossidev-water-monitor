import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export interface UserRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  permittedTankIds: number[]; // e.g. [1, 2, 3, 4, 5, 6] or subset
  createdAt: string;
  lastLogin?: string;
}

export interface TelemetryReadingRecord {
  id: string;
  timestamp: number; // Unix epoch ms
  isoTime: string;
  nodeId: number;
  tankId: number;
  level: number; // 0-100%
  pump: number; // 0 or 1
  sensors: number[]; // 10 elements (0: dry, 1: submerged)
  fault: number; // 0: normal, 1: fault
  fault_mask: number[]; // 10 elements (0: ok, 1: faulty sensor)
  source: 'serial_bridge' | 'http_ingest' | 'hardware_uart';
}

export interface RealNodeStatus {
  id: number;
  name: string;
  label: string;
  role: string;
  busPort: string;
  status: 'online' | 'offline';
  lastPing: number | null; // null if never contacted
  packetCount: number;
}

export interface LogRecord {
  id: string;
  time: string;
  type: 'rx' | 'tx' | 'alarm' | 'system' | 'fault';
  nodeId?: number;
  text: string;
  rawJson?: string;
}

export interface TankRecord {
  id: number;
  name: string;
  grid: string;
  sector: 'filtrada' | 'nao-filtrada' | 'bruta';
  sectorName: string;
  nodeId: number;
  capacity_value?: number | null; // Optional numeric value entered by admin
  capacity_unit?: 'L' | 'm3' | 'gal' | null; // Optional unit
  capacityLiters: number | null; // null when unconfigured / "Modo Percentual"
  level: number | null; // null when no real reading received yet
  pump: number; // 0: OFF, 1: ON
  fault: number; // 0: normal, 1: fault
  sensors: number[]; // 10 elements
  fault_mask: number[]; // 10 elements
  waterClass: string;
  lastUpdated: number | null; // null if no real reading
  hasRealData: boolean;
}

export interface DatabaseSchema {
  users: UserRecord[];
  currentTanks: {
    [tankId: number]: TankRecord;
  };
  nodes: {
    node1: RealNodeStatus;
    node2: RealNodeStatus;
    node3: RealNodeStatus;
  };
  telemetryHistory: TelemetryReadingRecord[];
  logs: LogRecord[];
  systemConfig: {
    audioAlarmEnabled: boolean;
    emergencyLockout: boolean;
    watchdogTimeoutMs: number; // e.g. 10000ms
    dailyConsumptionEstimateLiters?: number;
    lowLevelAlertPercentage?: number;
    criticalLevelAlertPercentage?: number;
    condominiumName?: string;
    lastBackupAt?: string;
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

// Initial Tank Definitions (Physical layout of Kizomba Condominium)
// Pure real-data mode: levels are null until actual Arduino hardware transmits
const INITIAL_TANKS_SCHEMA: DatabaseSchema['currentTanks'] = {
  1: {
    id: 1,
    name: 'Tanque FW1 (Tratada)',
    grid: '1/2',
    sector: 'filtrada',
    sectorName: 'Água Tratada',
    nodeId: 1,
    capacity_value: 20000,
    capacity_unit: 'L',
    capacityLiters: 20000,
    level: null,
    pump: 0,
    fault: 0,
    sensors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    fault_mask: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    waterClass: 'Consumo Humano / Potável',
    lastUpdated: null,
    hasRealData: false,
  },
  2: {
    id: 2,
    name: 'Tanque FW2 (Tratada)',
    grid: '2/2',
    sector: 'filtrada',
    sectorName: 'Água Tratada',
    nodeId: 1,
    capacity_value: 20000,
    capacity_unit: 'L',
    capacityLiters: 20000,
    level: null,
    pump: 0,
    fault: 0,
    sensors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    fault_mask: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    waterClass: 'Consumo Humano / Potável',
    lastUpdated: null,
    hasRealData: false,
  },
  3: {
    id: 3,
    name: 'Tanque RW1 (Não Tratada)',
    grid: '1/2',
    sector: 'nao-filtrada',
    sectorName: 'Água Não Tratada',
    nodeId: 2,
    capacity_value: 25000,
    capacity_unit: 'L',
    capacityLiters: 25000,
    level: null,
    pump: 0,
    fault: 0,
    sensors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    fault_mask: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    waterClass: 'Uso Geral / Sanitários',
    lastUpdated: null,
    hasRealData: false,
  },
  4: {
    id: 4,
    name: 'Tanque RW2 (Não Tratada)',
    grid: '2/2',
    sector: 'nao-filtrada',
    sectorName: 'Água Não Tratada',
    nodeId: 2,
    capacity_value: 25000,
    capacity_unit: 'L',
    capacityLiters: 25000,
    level: null,
    pump: 0,
    fault: 0,
    sensors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    fault_mask: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    waterClass: 'Uso Geral / Sanitários',
    lastUpdated: null,
    hasRealData: false,
  },
  5: {
    id: 5,
    name: 'Tanque WW1 (Bruta)',
    grid: '1/2',
    sector: 'bruta',
    sectorName: 'Água Bruta',
    nodeId: 3,
    capacity_value: 30000,
    capacity_unit: 'L',
    capacityLiters: 30000,
    level: null,
    pump: 0,
    fault: 0,
    sensors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    fault_mask: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    waterClass: 'Captação Bruta / Poço',
    lastUpdated: null,
    hasRealData: false,
  },
  6: {
    id: 6,
    name: 'Tanque WW2 (Bruta)',
    grid: '2/2',
    sector: 'bruta',
    sectorName: 'Água Bruta',
    nodeId: 3,
    capacity_value: 30000,
    capacity_unit: 'L',
    capacityLiters: 30000,
    level: null,
    pump: 0,
    fault: 0,
    sensors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    fault_mask: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    waterClass: 'Captação Bruta / Poço',
    lastUpdated: null,
    hasRealData: false,
  },
};

let inMemoryDb: DatabaseSchema | null = null;

export function loadDb(): DatabaseSchema {
  if (inMemoryDb) return inMemoryDb;

  if (fs.existsSync(DB_FILE)) {
    try {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(raw);

      // Verify watchdog on startup - if no recent telemetry, ensure nodes are offline and tanks empty
      const now = Date.now();
      const watchdogTimeout = inMemoryDb!.systemConfig?.watchdogTimeoutMs || 5000;

      for (const k of ['node1', 'node2', 'node3'] as const) {
        const node = inMemoryDb!.nodes[k];
        if (!node.lastPing || now - node.lastPing > watchdogTimeout) {
          node.status = 'offline';
        }
      }

      for (const idStr of Object.keys(inMemoryDb!.currentTanks)) {
        const tank = inMemoryDb!.currentTanks[Number(idStr)];
        const nodeKey = `node${tank.nodeId}` as 'node1' | 'node2' | 'node3';
        if (!inMemoryDb!.nodes[nodeKey] || inMemoryDb!.nodes[nodeKey].status === 'offline') {
          tank.level = null;
          tank.pump = 0;
          tank.fault = 0;
          tank.sensors = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          tank.fault_mask = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          tank.hasRealData = false;
        }
      }

      // Ensure all users have defined permittedTankIds (default [1, 2, 3, 4, 5, 6])
      if (Array.isArray(inMemoryDb!.users)) {
        for (const u of inMemoryDb!.users) {
          if (!Array.isArray(u.permittedTankIds)) {
            u.permittedTankIds = [1, 2, 3, 4, 5, 6];
          }
        }
      }

      return inMemoryDb!;
    } catch (e) {
      console.error('Error reading db.json, restoring defaults:', e);
    }
  }

  // Create default admin user: admin / admin123@Hossidev
  const defaultAdminSalt = bcrypt.genSaltSync(10);
  const defaultAdminHash = bcrypt.hashSync('admin123@Hossidev', defaultAdminSalt);

  const initialDb: DatabaseSchema = {
    users: [
      {
        id: crypto.randomUUID(),
        username: 'admin',
        name: 'Administrador Hossidev',
        email: 'admin@hossidev.com',
        passwordHash: defaultAdminHash,
        role: 'admin',
        permittedTankIds: [1, 2, 3, 4, 5, 6],
        createdAt: new Date().toISOString(),
      },
    ],
    currentTanks: INITIAL_TANKS_SCHEMA,
    nodes: {
      node1: {
        id: 1,
        name: 'Placa 1',
        label: 'Água Filtrada',
        role: 'T1 & T2',
        busPort: 'UART 1',
        status: 'offline',
        lastPing: null,
        packetCount: 0,
      },
      node2: {
        id: 2,
        name: 'Placa 2',
        label: 'Água Não Filtrada',
        role: 'T3 & T4',
        busPort: 'UART 2',
        status: 'offline',
        lastPing: null,
        packetCount: 0,
      },
      node3: {
        id: 3,
        name: 'Placa 3',
        label: 'Água Bruta',
        role: 'T5 & T6',
        busPort: 'UART 3',
        status: 'offline',
        lastPing: null,
        packetCount: 0,
      },
    },
    telemetryHistory: [],
    logs: [
      {
        id: crypto.randomUUID(),
        time: new Date().toLocaleTimeString(),
        type: 'system',
        text: 'Servidor Hossidev Water Monitor inicializado em modo de produção real. Aguardando pacotes do Arduino.',
      },
    ],
    systemConfig: {
      audioAlarmEnabled: true,
      emergencyLockout: false,
      watchdogTimeoutMs: 8000,
      dailyConsumptionEstimateLiters: 28000,
      lowLevelAlertPercentage: 20,
      criticalLevelAlertPercentage: 10,
      condominiumName: 'Condomínio Residencial Kizomba',
    },
  };

  inMemoryDb = initialDb;
  saveDb();
  return inMemoryDb;
}

export function saveDb(): void {
  if (!inMemoryDb) return;
  try {
    const tempFile = `${DB_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(inMemoryDb, null, 2), 'utf-8');
    fs.renameSync(tempFile, DB_FILE);
  } catch (err) {
    console.error('Error saving db.json:', err);
  }
}

export function restoreDb(importedData: any): { success: boolean; message: string; stats?: any } {
  if (!importedData || typeof importedData !== 'object') {
    throw new Error('Formato de dados de backup inválido.');
  }

  // Validate core schema
  if (!Array.isArray(importedData.users) || importedData.users.length === 0) {
    throw new Error('O arquivo de backup não contém usuários válidos.');
  }

  if (!importedData.currentTanks || typeof importedData.currentTanks !== 'object') {
    throw new Error('O arquivo de backup não contém a estrutura dos reservatórios.');
  }

  // Ensure default system config fallback
  const validConfig = {
    audioAlarmEnabled: Boolean(importedData.systemConfig?.audioAlarmEnabled ?? true),
    emergencyLockout: Boolean(importedData.systemConfig?.emergencyLockout ?? false),
    watchdogTimeoutMs: Number(importedData.systemConfig?.watchdogTimeoutMs || 8000),
    dailyConsumptionEstimateLiters: Number(importedData.systemConfig?.dailyConsumptionEstimateLiters || 28000),
    lowLevelAlertPercentage: Number(importedData.systemConfig?.lowLevelAlertPercentage || 20),
    criticalLevelAlertPercentage: Number(importedData.systemConfig?.criticalLevelAlertPercentage || 10),
    condominiumName: importedData.systemConfig?.condominiumName || 'Condomínio Residencial Kizomba',
    lastBackupAt: new Date().toISOString(),
  };

  inMemoryDb = {
    users: importedData.users,
    currentTanks: importedData.currentTanks,
    nodes: importedData.nodes || INITIAL_TANKS_SCHEMA,
    telemetryHistory: Array.isArray(importedData.telemetryHistory) ? importedData.telemetryHistory : [],
    logs: Array.isArray(importedData.logs) ? importedData.logs : [],
    systemConfig: validConfig,
  };

  // Add system restore log
  inMemoryDb.logs.push({
    id: crypto.randomUUID(),
    time: new Date().toLocaleTimeString(),
    type: 'system',
    text: `Backup completo restaurado com sucesso. ${inMemoryDb.users.length} usuários, ${inMemoryDb.telemetryHistory.length} registros históricos.`,
  });

  saveDb();

  return {
    success: true,
    message: 'Banco de dados restaurado com sucesso.',
    stats: {
      usersCount: inMemoryDb.users.length,
      historyCount: inMemoryDb.telemetryHistory.length,
      logsCount: inMemoryDb.logs.length,
      timestamp: new Date().toISOString(),
    },
  };
}

export function getDbStats(): {
  fileSizeBytes: number;
  usersCount: number;
  historyCount: number;
  logsCount: number;
  lastBackupAt?: string;
  uptimeSeconds: number;
} {
  const db = loadDb();
  let fileSize = 0;
  try {
    if (fs.existsSync(DB_FILE)) {
      const stats = fs.statSync(DB_FILE);
      fileSize = stats.size;
    }
  } catch (e) {
    fileSize = 0;
  }

  return {
    fileSizeBytes: fileSize,
    usersCount: db.users.length,
    historyCount: db.telemetryHistory.length,
    logsCount: db.logs.length,
    lastBackupAt: db.systemConfig.lastBackupAt,
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

