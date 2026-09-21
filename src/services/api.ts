import { AuthUser, TankData, NodeStatus, LogItem, UserManagementItem, CondominiumMetrics } from '../types';
import { authStorage } from './authStorage';
import { dbService } from '../db/localDb';
import { syncService } from './syncService';
import { INITIAL_TANKS } from '../data/tanksConfig';

export function getStoredToken(): string | null {
  return authStorage.getToken();
}

export function setStoredAuth(token: string, user: AuthUser, rememberMe: boolean = true): void {
  authStorage.saveSession(user, token, rememberMe);
}

export function getStoredUser(): AuthUser | null {
  return authStorage.getUser();
}

export function clearStoredAuth(): void {
  authStorage.clearSession();
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = authStorage.getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    authStorage.clearSession();
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Erro de requisição (${res.status})`);
  }

  return data as T;
}

export const api = {
  auth: {
    getStoredToken,
    getStoredUser,
    clearStoredAuth,

    login: async (
      identifier: string,
      password: string,
      rememberMe: boolean = true
    ): Promise<{ token: string; user: AuthUser; isOffline?: boolean }> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (isOnline) {
        try {
          // Attempt Online Authentication with Backend
          const data = await request<{ token: string; user: AuthUser }>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password }),
          });

          // 1. Save in local session storage
          authStorage.saveSession(data.user, data.token, rememberMe);

          // 2. Persist in IndexedDB with secure salt+hash for offline availability
          await dbService.saveOrUpdateLocalUser(data.user, password, data.token);

          // 3. Trigger immediate background sync
          syncService.syncNow().catch((err) => console.warn('[Sync] Initial sync error:', err));

          return { ...data, isOffline: false };
        } catch (onlineErr: any) {
          // If server error is credentials error (401 / 400), don't fallback to offline
          const msg = onlineErr.message || '';
          const isCredentialError =
            msg.includes('Senha incorreta') ||
            msg.includes('não encontrado') ||
            msg.includes('Credenciais inválidas');

          if (isCredentialError) {
            throw onlineErr;
          }

          // If network / connectivity failure, fallback to offline login
          console.warn('[Auth] Servidor inacessível, tentando autenticação offline:', onlineErr);
          const localUser = await dbService.verifyOfflineCredentials(identifier, password);
          const token = localUser.token || 'offline_local_token_' + Date.now();
          authStorage.saveSession(
            {
              id: localUser.id,
              username: localUser.username,
              name: localUser.name,
              email: localUser.email,
              role: localUser.role,
              permittedTankIds: localUser.permittedTankIds,
            },
            token,
            rememberMe
          );
          return {
            token,
            user: {
              id: localUser.id,
              username: localUser.username,
              name: localUser.name,
              email: localUser.email,
              role: localUser.role,
              permittedTankIds: localUser.permittedTankIds,
            },
            isOffline: true,
          };
        }
      } else {
        // Device is completely offline: Use local IndexedDB credential validation
        const localUser = await dbService.verifyOfflineCredentials(identifier, password);
        const token = localUser.token || 'offline_local_token_' + Date.now();
        authStorage.saveSession(
          {
            id: localUser.id,
            username: localUser.username,
            name: localUser.name,
            email: localUser.email,
            role: localUser.role,
            permittedTankIds: localUser.permittedTankIds,
          },
          token,
          rememberMe
        );
        return {
          token,
          user: {
            id: localUser.id,
            username: localUser.username,
            name: localUser.name,
            email: localUser.email,
            role: localUser.role,
            permittedTankIds: localUser.permittedTankIds,
          },
          isOffline: true,
        };
      }
    },

    register: async (payload: {
      username: string;
      name?: string;
      email: string;
      password: string;
      role?: 'admin' | 'user';
      permittedTankIds?: number[];
    }): Promise<{ token: string; user: AuthUser }> => {
      const data = await request<{ token: string; user: AuthUser }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      authStorage.saveSession(data.user, data.token, true);
      return data;
    },

    getMe: async (): Promise<{ user: AuthUser }> => {
      try {
        const res = await request<{ user: AuthUser }>('/api/auth/me');
        if (res.user) {
          authStorage.updateSessionUser(res.user);
        }
        return res;
      } catch (err) {
        // If offline, check local storage
        const user = authStorage.getUser();
        if (user) {
          return { user };
        }
        throw err;
      }
    },

    logout: async (): Promise<void> => {
      try {
        await request('/api/auth/logout', { method: 'POST' });
      } catch {
        // Ignore network errors on logout
      } finally {
        authStorage.clearSession();
      }
    },
  },

  telemetry: {
    getCurrent: async (): Promise<{
      hasRealData: boolean;
      isOnline: boolean;
      lastCommunication: string | null;
      lastCommunicationTimestamp: number | null;
      tanks: Record<number, TankData>;
      nodes: {
        node1: NodeStatus;
        node2: NodeStatus;
        node3: NodeStatus;
      };
      systemConfig: {
        audioAlarmEnabled: boolean;
        emergencyLockout: boolean;
        watchdogTimeoutMs: number;
      };
      metrics: CondominiumMetrics;
      isOfflineFallback?: boolean;
    }> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (isOnline) {
        try {
          const data = await request<any>('/api/telemetry/current');
          if (data && data.tanks) {
            const tanksList: TankData[] = Object.values(data.tanks);
            // Cache latest tanks state into local IndexedDB
            dbService.saveTanks(tanksList, 'online', true).catch(() => {});
          }
          return { ...data, isOfflineFallback: false };
        } catch (err) {
          console.warn('[Telemetry] Falha de rede ao consultar servidor, recorrendo à base local IndexedDB:', err);
        }
      }

      // Offline Fallback: Load latest known tanks and state from IndexedDB
      const localTanks = await dbService.getTanks();
      const tanksRecord: Record<number, TankData> = {};

      const baseTanks = localTanks.length > 0 ? localTanks : INITIAL_TANKS;
      for (const t of baseTanks) {
        tanksRecord[t.id] = {
          id: t.id,
          name: t.name,
          grid: t.grid,
          sector: t.sector,
          sectorName: t.sectorName,
          nodeId: t.nodeId,
          capacity_value: t.capacity_value ?? t.capacityLiters,
          capacity_unit: t.capacity_unit || 'L',
          capacityLiters: t.capacityLiters,
          level: t.level,
          currentLiters: t.currentLiters ?? (t.level !== null && t.capacityLiters ? Math.round((t.level / 100) * t.capacityLiters) : 0),
          pump: t.pump || 0,
          fault: t.fault || 0,
          sensors: t.sensors || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          fault_mask: t.fault_mask || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
          waterClass: t.waterClass,
          lastUpdated: t.lastUpdated,
          hasRealData: Boolean(t.hasRealData),
        };
      }

      const hasReal = Object.values(tanksRecord).some((t) => t.hasRealData && t.level !== null);

      return {
        hasRealData: hasReal,
        isOnline: false,
        lastCommunication: null,
        lastCommunicationTimestamp: null,
        tanks: tanksRecord,
        nodes: {
          node1: { id: 1, name: 'Node 1', label: 'Água Tratada', role: 'Tanques 1 e 2', busPort: 'COM3', status: 'offline', lastPing: null, packetCount: 0 },
          node2: { id: 2, name: 'Node 2', label: 'Água Não Tratada', role: 'Tanques 3 e 4', busPort: 'COM4', status: 'offline', lastPing: null, packetCount: 0 },
          node3: { id: 3, name: 'Node 3', label: 'Água Bruta', role: 'Tanques 5 e 6', busPort: 'COM5', status: 'offline', lastPing: null, packetCount: 0 },
        },
        systemConfig: {
          audioAlarmEnabled: true,
          emergencyLockout: false,
          watchdogTimeoutMs: 8000,
        },
        metrics: {
          totalCapacityLiters: 140000,
          currentTotalLiters: 0,
          totalPercentage: 0,
          activePumps: 0,
          totalFaultySensors: 0,
          estimatedAutonomyHours: 0,
          dailyConsumptionEstimateLiters: 28000,
        },
        isOfflineFallback: true,
      };
    },

    getHistory: async (params?: { tankId?: number; period?: string }): Promise<{
      totalRecords: number;
      period: string;
      tankId: number | null;
      records: Array<{
        id: string;
        timestamp: number;
        isoTime: string;
        nodeId: number;
        tankId: number;
        level: number;
        pump: number;
        sensors: number[];
        fault: number;
        fault_mask: number[];
        source: string;
      }>;
    }> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      if (isOnline) {
        try {
          const query = new URLSearchParams();
          if (params?.tankId) query.append('tankId', String(params.tankId));
          if (params?.period) query.append('period', params.period);
          const qStr = query.toString() ? `?${query.toString()}` : '';
          const res = await request<any>(`/api/telemetry/history${qStr}`);
          return res;
        } catch {
          // Fallback to local
        }
      }

      // Offline History from IndexedDB
      const readings = await dbService.getRecentReadings(100, params?.tankId);
      return {
        totalRecords: readings.length,
        period: params?.period || '24h',
        tankId: params?.tankId || null,
        records: readings.map((r) => ({
          id: r.id,
          timestamp: r.timestamp,
          isoTime: r.isoTime,
          nodeId: r.nodeId,
          tankId: r.tankId,
          level: r.level,
          pump: r.pump,
          sensors: r.sensors,
          fault: r.fault,
          fault_mask: r.fault_mask,
          source: r.source,
        })),
      };
    },

    ingest: async (payload: {
      nodeId?: number;
      node?: number;
      tanks: Array<{
        id: number;
        level?: number;
        pump?: number;
        sensors?: number[];
        fault?: number;
        fault_mask?: number[];
      }>;
      device?: string;
      source?: string;
    }): Promise<{ success: boolean; updatedTanks: number; timestamp: number }> => {
      const now = Date.now();

      // Always save to IndexedDB first (Local-First Guarantee)
      if (Array.isArray(payload.tanks)) {
        for (const t of payload.tanks) {
          const tankId = Number(t.id);
          const levelVal = typeof t.level === 'number' ? t.level : 0;
          await dbService.saveReading(
            {
              tankId,
              nodeId: Number(payload.nodeId || payload.node || 1),
              level: levelVal,
              currentLiters: null,
              capacityLiters: null,
              pump: t.pump || 0,
              fault: t.fault || 0,
              sensors: t.sensors || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              fault_mask: t.fault_mask || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              timestamp: now,
              isoTime: new Date(now).toISOString(),
              source: (payload.source as any) || 'serial_bridge',
            },
            false // not synced yet
          );
        }
      }

      // If online, also dispatch to server
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline) {
        try {
          return await request('/api/telemetry/ingest', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        } catch {
          // Saved locally, will sync when online
        }
      }

      return {
        success: true,
        updatedTanks: payload.tanks?.length || 0,
        timestamp: now,
      };
    },

    sendCommand: async (cmd: {
      command: string;
      tankId?: number;
      nodeId?: number;
      value?: any;
    }): Promise<{ success: boolean; message: string }> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      // Always record command as a local event and queue for sync
      const user = authStorage.getUser();
      await dbService.recordEvent({
        type: 'pump_command',
        description: `Comando ${cmd.command} para Tanque ${cmd.tankId || 'Geral'}`,
        userId: user?.id || 'local_op',
        userName: user?.name || 'Operador Local',
        origin: 'local',
        synced: false,
      });

      if (isOnline) {
        try {
          return await request('/api/telemetry/command', {
            method: 'POST',
            body: JSON.stringify(cmd),
          });
        } catch (err: any) {
          console.warn('[Telemetry] Comando salvo na fila offline após falha de envio:', err);
        }
      }

      // Queue in pendingOperations
      await dbService.enqueueOperation({
        tipoOperacao: cmd.command.includes('emergency') ? 'emergency_stop' : 'pump_command',
        entidade: 'tank',
        entidadeId: cmd.tankId || 0,
        dados: cmd,
      });

      return {
        success: true,
        message: `Comando "${cmd.command}" registrado e enfileirado localmente na base offline.`,
      };
    },

    getLogs: async (): Promise<{ logs: LogItem[] }> => {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (isOnline) {
        try {
          return await request('/api/telemetry/logs');
        } catch {}
      }
      // Return local events as logs
      const events = await dbService.recordEvent({
        type: 'sync',
        description: 'Consulta de logs em modo offline',
        userId: 'system',
        userName: 'Sistema',
        origin: 'local',
        synced: true,
      });
      return {
        logs: [
          {
            id: events.id,
            time: new Date().toLocaleTimeString(),
            type: 'system',
            text: 'Modo Offline: exibindo eventos locais armazenados no IndexedDB.',
          },
        ],
      };
    },

    clearLogs: async (): Promise<{ success: boolean }> => {
      try {
        return await request('/api/telemetry/logs', { method: 'DELETE' });
      } catch {
        return { success: true };
      }
    },
  },

  admin: {
    getUsers: async (): Promise<{ users: UserManagementItem[] }> => {
      return request('/api/admin/users');
    },
    createUser: async (payload: {
      username: string;
      name?: string;
      email: string;
      password: string;
      role: 'admin' | 'user';
      permittedTankIds: number[];
    }): Promise<{ success: boolean; user: UserManagementItem; message?: string }> => {
      return request('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    updateUser: async (
      id: string,
      payload: {
        username?: string;
        name?: string;
        email?: string;
        role?: 'admin' | 'user';
        permittedTankIds?: number[];
        password?: string;
      }
    ): Promise<{ success: boolean; user: UserManagementItem; message?: string }> => {
      return request(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    },
    resetPassword: async (id: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
      return request(`/api/admin/users/${id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
    },
    deleteUser: async (id: string): Promise<{ success: boolean; message: string }> => {
      return request(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });
    },
    getBackup: async (): Promise<any> => {
      return request('/api/admin/backup');
    },
    restoreBackup: async (backupPayload: any): Promise<{ success: boolean; message: string; stats?: any }> => {
      return request('/api/admin/restore', {
        method: 'POST',
        body: JSON.stringify(backupPayload),
      });
    },
    getStats: async (): Promise<{
      success: boolean;
      stats: {
        fileSizeBytes: number;
        usersCount: number;
        historyCount: number;
        logsCount: number;
        lastBackupAt?: string;
        uptimeSeconds: number;
      };
    }> => {
      return request('/api/admin/stats');
    },
    getConfig: async (): Promise<{
      success: boolean;
      config: {
        audioAlarmEnabled: boolean;
        emergencyLockout: boolean;
        watchdogTimeoutMs: number;
        dailyConsumptionEstimateLiters?: number;
        lowLevelAlertPercentage?: number;
        criticalLevelAlertPercentage?: number;
        condominiumName?: string;
        lastBackupAt?: string;
      };
    }> => {
      return request('/api/admin/config');
    },
    getTanks: async (): Promise<{
      success: boolean;
      tanks: Array<{
        id: number;
        name: string;
        grid: string;
        sector: string;
        sectorName: string;
        nodeId: number;
        capacityLiters: number;
        waterClass: string;
        defaultCapacityLiters: number;
      }>;
    }> => {
      return request('/api/admin/tanks');
    },
    updateTankCapacities: async (capacities: Record<number, number>): Promise<{
      success: boolean;
      message: string;
      updatedTanks: Record<number, number>;
      tanks: any;
    }> => {
      return request('/api/admin/tanks/capacities', {
        method: 'PUT',
        body: JSON.stringify({ capacities }),
      });
    },
    resetTankCapacities: async (): Promise<{
      success: boolean;
      message: string;
      tanks: any;
    }> => {
      return request('/api/admin/tanks/reset-capacities', {
        method: 'POST',
      });
    },
    updateConfig: async (configPayload: any): Promise<{
      success: boolean;
      message: string;
      config: any;
    }> => {
      return request('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify(configPayload),
      });
    },
  },

  sync: {
    syncNow: () => syncService.syncNow(),
    getOverview: () => syncService.getOverview(),
    retryFailed: () => syncService.retryFailed(),
    clearCompleted: () => syncService.clearCompleted(),
    exportLocalBackup: () => dbService.exportDatabaseBackup(),
    importLocalBackup: (json: string) => dbService.importDatabaseBackup(json),
    getStats: () => dbService.getDatabaseStats(),
  },
};
