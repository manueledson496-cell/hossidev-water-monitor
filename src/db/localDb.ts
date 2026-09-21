import Dexie, { Table } from 'dexie';
import {
  LocalUserRecord,
  LocalTankRecord,
  LocalReadingRecord,
  LocalEventRecord,
  PendingOperation,
  LocalConfigRecord,
  AuthSessionRecord,
  AuthUser,
  TankData,
  OperationType,
} from '../types';

// ==========================================
// CRYPTOGRAPHY UTILITIES (SHA-256 + Salt)
// ==========================================

export function generateSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    return Array.from(arr, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:hossidev_salt_key`);

  if (typeof crypto !== 'undefined' && crypto.subtle && crypto.subtle.digest) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback if subtle crypto unavailable
  let hash = 0;
  const str = `${salt}:${password}:fallback`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}

export function getOrCreateDeviceId(): string {
  const KEY = 'hossidev_device_id';
  let deviceId = localStorage.getItem(KEY);
  if (!deviceId) {
    deviceId = 'dev_' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2));
    localStorage.setItem(KEY, deviceId);
  }
  return deviceId;
}

// ==========================================
// DEXIE DATABASE DEFINITION
// ==========================================

export class HossidevWaterDatabase extends Dexie {
  users!: Table<LocalUserRecord, string>;
  tanks!: Table<LocalTankRecord, number>;
  readings!: Table<LocalReadingRecord, string>;
  events!: Table<LocalEventRecord, string>;
  pendingOperations!: Table<PendingOperation, string>;
  localConfig!: Table<LocalConfigRecord, string>;
  authSession!: Table<AuthSessionRecord, string>;

  constructor() {
    super('HossidevWaterDB');
    this.version(1).stores({
      users: 'id, username, email, role, active, updatedAt',
      tanks: 'id, nodeId, sector, synced, updatedAt',
      readings: 'id, tankId, nodeId, timestamp, synced, createdAt',
      events: 'id, tankId, type, userId, timestamp, synced',
      pendingOperations: 'id, tipoOperacao, entidade, estado, criadoEm, tentativas',
      localConfig: 'chave, atualizadoEm',
      authSession: 'userId, deviceId, expiresAt',
    });
  }
}

export const localDb = new HossidevWaterDatabase();

// ==========================================
// DATABASE ACCESS METHODS & REPOSITORIES
// ==========================================

export const dbService = {
  // --- USERS & AUTH ---
  async saveOrUpdateLocalUser(
    user: AuthUser,
    plainPassword?: string,
    token?: string
  ): Promise<LocalUserRecord> {
    const now = new Date().toISOString();
    const existing = await localDb.users.get(user.id);

    let passwordSalt = existing?.passwordSalt || generateSalt();
    let passwordHash = existing?.passwordHash || '';

    if (plainPassword) {
      passwordSalt = generateSalt();
      passwordHash = await hashPasswordWithSalt(plainPassword, passwordSalt);
    }

    const localUser: LocalUserRecord = {
      id: user.id,
      username: user.username.toLowerCase(),
      name: user.name || user.username,
      email: user.email.toLowerCase(),
      role: user.role,
      permittedTankIds: Array.isArray(user.permittedTankIds) ? user.permittedTankIds : [1, 2, 3, 4, 5, 6],
      passwordSalt,
      passwordHash,
      token: token || existing?.token || '',
      active: true,
      firstOnlineLogin: existing?.firstOnlineLogin || now,
      lastOnlineLogin: now,
      lastOfflineLogin: existing?.lastOfflineLogin || null,
      lastAccess: now,
      updatedAt: now,
    };

    await localDb.users.put(localUser);

    // Record session
    await localDb.authSession.put({
      userId: user.id,
      username: user.username,
      localSessionId: 'sess_' + Date.now(),
      expiresAt: Date.now() + 7 * 24 * 3600 * 1000,
      lastOnlineLogin: now,
      lastOfflineLogin: null,
      permittedTankIds: localUser.permittedTankIds,
      deviceId: getOrCreateDeviceId(),
    });

    return localUser;
  },

  async verifyOfflineCredentials(
    identifier: string,
    plainPassword: string
  ): Promise<LocalUserRecord> {
    const clean = identifier.trim().toLowerCase();
    
    // Find user by username or email
    const users = await localDb.users.toArray();
    const user = users.find(
      (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );

    if (!user) {
      throw new Error(
        'Este usuário ainda precisa realizar o primeiro login com internet nesta máquina para habilitar o acesso offline.'
      );
    }

    if (!user.active) {
      throw new Error('Acesso bloqueado: Este usuário foi desativado pelo administrador.');
    }

    if (!user.passwordHash || !user.passwordSalt) {
      throw new Error(
        'Credencial local incompleta. Por favor, conecte-se à internet para sincronizar seu acesso.'
      );
    }

    const calculatedHash = await hashPasswordWithSalt(plainPassword, user.passwordSalt);
    if (calculatedHash !== user.passwordHash) {
      throw new Error('Senha incorreta.');
    }

    // Update offline login record
    const now = new Date().toISOString();
    user.lastOfflineLogin = now;
    user.lastAccess = now;
    user.updatedAt = now;
    await localDb.users.put(user);

    // Update session
    await localDb.authSession.put({
      userId: user.id,
      username: user.username,
      localSessionId: 'offline_sess_' + Date.now(),
      expiresAt: Date.now() + 3 * 24 * 3600 * 1000,
      lastOnlineLogin: user.lastOnlineLogin,
      lastOfflineLogin: now,
      permittedTankIds: user.permittedTankIds,
      deviceId: getOrCreateDeviceId(),
    });

    // Log offline login event
    await dbService.recordEvent({
      type: 'login',
      description: `Login offline realizado com sucesso pelo usuário ${user.username}`,
      userId: user.id,
      userName: user.name,
      origin: 'local',
      synced: false,
    });

    return user;
  },

  async getLocalUsers(): Promise<LocalUserRecord[]> {
    return localDb.users.toArray();
  },

  // --- TANKS REPOSITORY ---
  async saveTanks(
    tanks: TankData[],
    readingOrigin: 'online' | 'local_serial' | 'cached' = 'online',
    synced: boolean = true
  ): Promise<void> {
    const now = new Date().toISOString();
    await localDb.transaction('rw', localDb.tanks, async () => {
      for (const t of tanks) {
        const existing = await localDb.tanks.get(t.id);
        const record: LocalTankRecord = {
          id: t.id,
          name: t.name,
          grid: t.grid,
          sector: t.sector,
          sectorName: t.sectorName,
          nodeId: t.nodeId,
          capacity_value: t.capacity_value ?? t.capacityLiters,
          capacity_unit: t.capacity_unit || 'L',
          capacityLiters: t.capacityLiters ?? null,
          level: t.level ?? null,
          currentLiters: t.currentLiters ?? null,
          pump: t.pump ?? 0,
          fault: t.fault ?? 0,
          sensors: t.sensors || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          fault_mask: t.fault_mask || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          waterClass: t.waterClass,
          lastUpdated: t.lastUpdated || Date.now(),
          hasRealData: t.hasRealData ?? false,
          synced,
          readingOrigin,
          version: (existing?.version || 0) + 1,
          updatedAt: now,
        };
        await localDb.tanks.put(record);
      }
    });
  },

  async getTanks(): Promise<LocalTankRecord[]> {
    return localDb.tanks.orderBy('id').toArray();
  },

  async getTank(id: number): Promise<LocalTankRecord | undefined> {
    return localDb.tanks.get(id);
  },

  // --- READINGS & TELEMETRY ---
  async saveReading(
    reading: Omit<LocalReadingRecord, 'id' | 'createdAt' | 'synced'> & { id?: string; synced?: boolean },
    synced: boolean = false
  ): Promise<LocalReadingRecord> {
    const id = reading.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'rd_' + Date.now() + '_' + Math.random().toString(36).substring(2));
    const now = new Date().toISOString();
    const isSynced = reading.synced !== undefined ? reading.synced : synced;

    const record: LocalReadingRecord = {
      ...reading,
      id,
      synced: isSynced,
      createdAt: now,
    };

    await localDb.readings.put(record);

    // Also update localDb.tanks to guarantee immediate and offline persistence of current tank state
    try {
      const existingTank = await localDb.tanks.get(reading.tankId);
      if (existingTank) {
        existingTank.level = reading.level;
        if (existingTank.capacityLiters) {
          existingTank.currentLiters = Math.round((reading.level / 100) * existingTank.capacityLiters);
        }
        if (reading.pump !== undefined) existingTank.pump = reading.pump;
        if (reading.fault !== undefined) existingTank.fault = reading.fault;
        if (reading.sensors) existingTank.sensors = reading.sensors;
        if (reading.fault_mask) existingTank.fault_mask = reading.fault_mask;
        existingTank.lastUpdated = reading.timestamp || Date.now();
        existingTank.hasRealData = true;
        existingTank.synced = isSynced;
        existingTank.readingOrigin = isSynced ? 'online' : 'local_serial';
        existingTank.updatedAt = now;
        await localDb.tanks.put(existingTank);
      }
    } catch (e) {
      console.warn('[LocalDB] Erro ao sincronizar tanque local com leitura:', e);
    }

    // If not synced, queue pending operation for cloud sync (using idempotent reading ID)
    if (!isSynced) {
      await dbService.enqueueOperation({
        id,
        tipoOperacao: 'ingest_telemetry',
        entidade: 'telemetry',
        entidadeId: id,
        dados: {
          id,
          tankId: reading.tankId,
          level: reading.level,
          sensors: reading.sensors,
          fault: reading.fault,
          fault_mask: reading.fault_mask,
          pump: reading.pump,
          timestamp: reading.timestamp,
          source: reading.source,
        },
      });
    }

    return record;
  },

  async getRecentReadings(limit: number = 100, tankId?: number): Promise<LocalReadingRecord[]> {
    if (tankId) {
      return localDb.readings
        .where('tankId')
        .equals(tankId)
        .reverse()
        .sortBy('timestamp')
        .then((items) => items.slice(0, limit));
    }
    return localDb.readings
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  },

  // --- EVENTS ---
  async recordEvent(
    event: Omit<LocalEventRecord, 'id' | 'eventDate' | 'timestamp'> & { id?: string; timestamp?: number }
  ): Promise<LocalEventRecord> {
    const id = event.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'ev_' + Date.now());
    const timestamp = event.timestamp || Date.now();
    const eventDate = new Date(timestamp).toISOString();

    const record: LocalEventRecord = {
      ...event,
      id,
      timestamp,
      eventDate,
      synced: event.synced ?? false,
    };

    await localDb.events.put(record);

    if (!record.synced) {
      await dbService.enqueueOperation({
        id,
        tipoOperacao: 'log_event',
        entidade: 'event',
        entidadeId: id,
        dados: {
          text: record.description,
          type: record.type,
          timestamp,
        },
      });
    }

    return record;
  },

  // --- PENDING OPERATIONS QUEUE ---
  async enqueueOperation(params: {
    id?: string;
    tipoOperacao: OperationType;
    entidade: 'tank' | 'telemetry' | 'system' | 'event';
    entidadeId: string | number;
    dados: any;
  }): Promise<PendingOperation> {
    const id = params.id || (params.entidadeId ? `op_${params.entidade}_${params.entidadeId}` : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'op_' + Date.now() + '_' + Math.random().toString(36).substring(2)));
    const now = new Date().toISOString();

    const existing = await localDb.pendingOperations.get(id);
    if (existing && existing.estado === 'completed') {
      return existing;
    }

    const op: PendingOperation = {
      id,
      tipoOperacao: params.tipoOperacao,
      entidade: params.entidade,
      entidadeId: params.entidadeId,
      dados: params.dados,
      criadoEm: existing?.criadoEm || now,
      atualizadoEm: now,
      tentativas: existing?.tentativas || 0,
      estado: 'pending',
    };

    await localDb.pendingOperations.put(op);
    return op;
  },

  async getPendingOperations(): Promise<PendingOperation[]> {
    return localDb.pendingOperations
      .where('estado')
      .anyOf(['pending', 'syncing', 'failed'])
      .toArray();
  },

  async getAllOperations(): Promise<PendingOperation[]> {
    return localDb.pendingOperations.orderBy('criadoEm').reverse().toArray();
  },

  async markOperationCompleted(id: string): Promise<void> {
    const op = await localDb.pendingOperations.get(id);
    if (op) {
      op.estado = 'completed';
      op.atualizadoEm = new Date().toISOString();
      await localDb.pendingOperations.put(op);
    }
  },

  async markOperationFailed(id: string, error: string): Promise<void> {
    const op = await localDb.pendingOperations.get(id);
    if (op) {
      op.estado = 'failed';
      op.tentativas = (op.tentativas || 0) + 1;
      op.últimoErro = error;
      op.atualizadoEm = new Date().toISOString();
      await localDb.pendingOperations.put(op);
    }
  },

  async clearCompletedOperations(): Promise<number> {
    const completed = await localDb.pendingOperations
      .where('estado')
      .equals('completed')
      .toArray();
    const ids = completed.map((c) => c.id);
    await localDb.pendingOperations.bulkDelete(ids);
    return ids.length;
  },

  async retryFailedOperations(): Promise<void> {
    const failed = await localDb.pendingOperations
      .where('estado')
      .equals('failed')
      .toArray();
    for (const op of failed) {
      op.estado = 'pending';
      op.atualizadoEm = new Date().toISOString();
      await localDb.pendingOperations.put(op);
    }
  },

  // --- CONFIG ---
  async setConfig(chave: string, valor: any): Promise<void> {
    await localDb.localConfig.put({
      chave,
      valor,
      atualizadoEm: new Date().toISOString(),
    });
  },

  async getConfig<T = any>(chave: string, defaultValue?: T): Promise<T | undefined> {
    const item = await localDb.localConfig.get(chave);
    return item ? (item.valor as T) : defaultValue;
  },

  async setLocalConfig(chave: string, valor: any): Promise<void> {
    await localDb.localConfig.put({
      chave,
      valor,
      atualizadoEm: new Date().toISOString(),
    });
  },

  async getLocalConfig<T = any>(chave: string, defaultValue?: T): Promise<T | undefined> {
    const item = await localDb.localConfig.get(chave);
    return item ? (item.valor as T) : defaultValue;
  },

  // --- STATS & BACKUP ---
  async getDatabaseStats() {
    const [usersCount, tanksCount, readingsCount, eventsCount, pendingCount, failedCount] =
      await Promise.all([
        localDb.users.count(),
        localDb.tanks.count(),
        localDb.readings.count(),
        localDb.events.count(),
        localDb.pendingOperations.where('estado').equals('pending').count(),
        localDb.pendingOperations.where('estado').equals('failed').count(),
      ]);

    return {
      usersCount,
      tanksCount,
      readingsCount,
      eventsCount,
      pendingCount,
      failedCount,
      totalOperations: await localDb.pendingOperations.count(),
    };
  },

  async exportDatabaseBackup(): Promise<string> {
    const [users, tanks, readings, events, pendingOperations, localConfig] = await Promise.all([
      localDb.users.toArray(),
      localDb.tanks.toArray(),
      localDb.readings.toArray(),
      localDb.events.toArray(),
      localDb.pendingOperations.toArray(),
      localDb.localConfig.toArray(),
    ]);

    const backup = {
      app: 'Hossidev Water Monitor',
      version: '2.5.0-offline',
      exportedAt: new Date().toISOString(),
      data: {
        users: users.map((u) => ({ ...u, token: '' })), // Clear session token from export
        tanks,
        readings,
        events,
        pendingOperations,
        localConfig,
      },
    };

    return JSON.stringify(backup, null, 2);
  },

  async importDatabaseBackup(jsonString: string): Promise<{ success: boolean; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data) {
        throw new Error('Arquivo de backup inválido: dados ausentes.');
      }

      await localDb.transaction(
        'rw',
        [
          localDb.users,
          localDb.tanks,
          localDb.readings,
          localDb.events,
          localDb.pendingOperations,
          localDb.localConfig,
        ],
        async () => {
          if (Array.isArray(parsed.data.users)) {
            await localDb.users.bulkPut(parsed.data.users);
          }
          if (Array.isArray(parsed.data.tanks)) {
            await localDb.tanks.bulkPut(parsed.data.tanks);
          }
          if (Array.isArray(parsed.data.readings)) {
            await localDb.readings.bulkPut(parsed.data.readings);
          }
          if (Array.isArray(parsed.data.events)) {
            await localDb.events.bulkPut(parsed.data.events);
          }
          if (Array.isArray(parsed.data.pendingOperations)) {
            await localDb.pendingOperations.bulkPut(parsed.data.pendingOperations);
          }
          if (Array.isArray(parsed.data.localConfig)) {
            await localDb.localConfig.bulkPut(parsed.data.localConfig);
          }
        }
      );

      return { success: true, message: 'Backup importado e restaurado com sucesso!' };
    } catch (err: any) {
      return { success: false, message: `Falha ao importar backup: ${err.message}` };
    }
  },
};
