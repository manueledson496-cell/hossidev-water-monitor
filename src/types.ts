export type SectorType = 'filtrada' | 'nao-filtrada' | 'bruta';
export type CapacityUnit = 'L' | 'm3' | 'gal';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  permittedTankIds: number[];
  assignedTankIds?: number[];
}

export interface StoredSession {
  token: string;
  user: AuthUser;
  userId: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  assignedTankIds: number[];
  permittedTankIds: number[];
  rememberMe: boolean;
  loginTimestamp: number;
  expiresAt: number;
}

export interface TankData {
  id: number;
  name: string;
  grid: string;
  sector: SectorType;
  sectorName: string;
  nodeId: number;
  capacity_value?: number | null; // Optional: numeric capacity value
  capacity_unit?: CapacityUnit | null; // Optional: unit ('L', 'm3', 'gal')
  capacityLiters: number | null; // null when in 'Modo Percentual' (unconfigured)
  level: number | null; // null when no real reading received yet
  pump: number; // 0: OFF, 1: ON / Enchendo
  fault: number; // 0: OK, 1: Fault detected
  sensors: number[]; // 10 elements (0: dry, 1: wet)
  fault_mask: number[]; // 10 elements (0: ok, 1: faulty)
  waterClass: string;
  lastUpdated?: number | null;
  hasRealData: boolean;
  currentLiters?: number | null;
  flowRateLpm?: number;
  assignedUsers?: Array<{ id: string; username: string; name: string }>;
}

export interface NodeStatus {
  id: number;
  name: string;
  label: string;
  role: string;
  busPort: string;
  status: 'online' | 'offline';
  lastPing: number | null;
  packetCount: number;
  tanks?: TankData[];
}

export interface SystemData {
  device: string;
  uptime: number;
  totalPackets: number;
  lastReceivedTime: number | null;
  isSerialConnected: boolean;
  isOnline: boolean;
  globalFaultCount: number;
  audioAlarmEnabled: boolean;
  emergencyLockout: boolean;
  nodes: {
    node1: NodeStatus;
    node2: NodeStatus;
    node3: NodeStatus;
  };
}

export interface LogItem {
  id: string;
  time: string;
  type: 'rx' | 'tx' | 'alarm' | 'system' | 'fault';
  nodeId?: number;
  text: string;
  rawJson?: string;
}

export interface HistoricalDataPoint {
  id?: string;
  time: string;
  timestamp: number;
  tankId?: number;
  level: number;
  pump: number;
  sensors?: number[];
  fault?: number;
  totalLiters?: number;
  source?: string;
}

export interface CondominiumMetrics {
  totalCapacityLiters: number;
  currentTotalLiters: number;
  totalPercentage: number;
  activePumps: number;
  totalFaultySensors: number;
  estimatedAutonomyHours: number;
  dailyConsumptionEstimateLiters: number;
}

export interface UserManagementItem {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  permittedTankIds: number[];
  createdAt: string;
  lastLogin?: string;
}

// ==========================================
// OFFLINE-FIRST ARCHITECTURE TYPES
// ==========================================

export interface LocalUserRecord {
  id: string;
  username: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  permittedTankIds: number[];
  passwordSalt: string;
  passwordHash: string; // SHA-256 (password + salt), never plaintext
  token: string;
  active: boolean;
  firstOnlineLogin: string;
  lastOnlineLogin: string;
  lastOfflineLogin?: string | null;
  lastAccess: string;
  updatedAt: string;
}

export interface LocalTankRecord {
  id: number;
  name: string;
  grid: string;
  sector: SectorType;
  sectorName: string;
  nodeId: number;
  capacity_value?: number | null;
  capacity_unit?: CapacityUnit | null;
  capacityLiters: number | null;
  level: number | null;
  currentLiters?: number | null;
  pump: number;
  fault: number;
  sensors: number[];
  fault_mask: number[];
  waterClass: string;
  lastUpdated?: number | null;
  hasRealData: boolean;
  synced: boolean;
  readingOrigin: 'online' | 'local_serial' | 'cached';
  version: number;
  updatedAt: string;
}

export interface LocalReadingRecord {
  id: string; // UUID
  tankId: number;
  nodeId: number;
  level: number;
  currentLiters: number | null;
  capacityLiters: number | null;
  pump: number;
  fault: number;
  sensors: number[];
  fault_mask: number[];
  timestamp: number;
  isoTime: string;
  source: 'serial_bridge' | 'http_ingest' | 'manual_simulate' | 'online_sync';
  synced: boolean;
  createdAt: string;
}

export interface LocalEventRecord {
  id: string;
  tankId?: number;
  type: 'login' | 'logout' | 'pump_command' | 'emergency_stop' | 'config_change' | 'fault' | 'sync';
  description: string;
  userId: string;
  userName: string;
  eventDate: string;
  timestamp: number;
  origin: 'local' | 'remote';
  synced: boolean;
}

export type OperationType =
  | 'ingest_telemetry'
  | 'pump_command'
  | 'emergency_stop'
  | 'update_tank_config'
  | 'log_event';

export type OperationStatus = 'pending' | 'syncing' | 'failed' | 'completed';

export interface PendingOperation {
  id: string; // Unique idempotent UUID
  tipoOperacao: OperationType;
  entidade: 'tank' | 'telemetry' | 'system' | 'event';
  entidadeId: string | number;
  dados: any;
  criadoEm: string;
  atualizadoEm: string;
  tentativas: number;
  últimoErro?: string | null;
  estado: OperationStatus;
}

export interface LocalConfigRecord {
  chave: string;
  valor: any;
  atualizadoEm: string;
}

export interface AuthSessionRecord {
  userId: string;
  username: string;
  localSessionId: string;
  expiresAt: number;
  lastOnlineLogin: string;
  lastOfflineLogin: string | null;
  permittedTankIds: number[];
  deviceId: string;
}

export type SyncStateName =
  | 'online'
  | 'offline'
  | 'sincronizando'
  | 'sincronizado'
  | 'pendente'
  | 'erro'
  | 'servidorIndisponivel'
  | 'sessaoExpirada';

export interface SyncOverview {
  state: SyncStateName;
  isOnline: boolean; // browser navigator.onLine
  isServerReachable: boolean; // ping to /api/health succeeded
  isSerialConnected: boolean; // Web Serial USB active
  lastSyncTime: number | null;
  pendingCount: number;
  failedCount: number;
  lastError: string | null;
  pingMs?: number;
}

// ==========================================
// USB SERIAL MANAGER TYPES
// ==========================================

export type UsbSerialConnectionState =
  | 'idle'
  | 'requestingPermission'
  | 'connecting'
  | 'connected'
  | 'reading'
  | 'reconnecting'
  | 'disconnected'
  | 'intentionalDisconnect'
  | 'error'
  | 'waitingForDevice'
  | 'unauthorized'
  | 'busy';

export interface UsbDeviceConfig {
  deviceId: string;
  friendlyName: string;
  usbVendorId?: number;
  usbProductId?: number;
  serialNumber?: string;
  manufacturer?: string;
  productName?: string;
  baudRate: number;
  dataBits: 7 | 8;
  parity: 'none' | 'even' | 'odd';
  stopBits: 1 | 2;
  flowControl: 'none' | 'hardware';
  lastConnectedAt?: string;
  autoReconnect: boolean;
}

export interface SerialDiagnosticsMetrics {
  totalPacketsReceived: number;
  totalPacketsInvalid: number;
  reconnectCount: number;
  readErrorCount: number;
  writeErrorCount: number;
  lastMessageTime: number | null;
  lastHeartbeatTime: number | null;
  lastHeartbeatStatus: 'ok' | 'timeout' | 'none';
  lastCommandSent?: string | null;
  lastCommandResult?: 'success' | 'failed' | 'timeout' | null;
  lastLatencyMs?: number | null;
  reconnectAttempt: number;
  nextReconnectInSec?: number | null;
  activePortInfo?: {
    usbVendorId?: number;
    usbProductId?: number;
    displayName: string;
  } | null;
  lastErrorText?: string | null;
}

export interface SerialCommandRecord {
  id: string;
  command: string;
  tankId?: number;
  nodeId?: number;
  userId?: string;
  userName?: string;
  timestamp: number;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'timeout';
  attempt: number;
  result?: string;
  isPumpCommand?: boolean;
}

