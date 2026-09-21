import { SyncOverview, SyncStateName } from '../types';
import { dbService } from '../db/localDb';
import { authStorage } from './authStorage';

class SyncService {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isServerReachable: boolean = false;
  private isSerialConnected: boolean = false;
  private isSyncing: boolean = false;
  private state: SyncStateName = 'online';
  private lastSyncTime: number | null = null;
  private pendingCount: number = 0;
  private failedCount: number = 0;
  private lastError: string | null = null;
  private pingMs: number = 0;
  private timer: any = null;
  private listeners: Set<(overview: SyncOverview) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notify();
        this.syncNow();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.isServerReachable = false;
        this.state = 'offline';
        this.notify();
      });

      // Periodic sync loop (every 20s)
      this.timer = setInterval(() => {
        if (this.isOnline && authStorage.isUserLoggedIn() && !this.isSyncing) {
          this.syncNow();
        } else {
          this.refreshCounts();
        }
      }, 20000);

      // Initial check
      setTimeout(() => {
        this.refreshCounts();
        this.checkServerHealth();
      }, 1000);
    }
  }

  public subscribe(callback: (overview: SyncOverview) => void): () => void {
    this.listeners.add(callback);
    callback(this.getOverview());
    return () => this.listeners.delete(callback);
  }

  private notify() {
    const overview = this.getOverview();
    for (const listener of this.listeners) {
      try {
        listener(overview);
      } catch (err) {
        console.error('[SyncService] Listener error:', err);
      }
    }
  }

  public getOverview(): SyncOverview {
    return {
      state: this.state,
      isOnline: this.isOnline,
      isServerReachable: this.isServerReachable,
      isSerialConnected: this.isSerialConnected,
      lastSyncTime: this.lastSyncTime,
      pendingCount: this.pendingCount,
      failedCount: this.failedCount,
      lastError: this.lastError,
      pingMs: this.pingMs,
    };
  }

  public setSerialConnected(connected: boolean) {
    this.isSerialConnected = connected;
    this.notify();
  }

  public async refreshCounts(): Promise<{ pending: number; failed: number }> {
    try {
      const stats = await dbService.getDatabaseStats();
      this.pendingCount = stats.pendingCount;
      this.failedCount = stats.failedCount;

      if (!this.isOnline) {
        this.state = 'offline';
      } else if (!this.isServerReachable && this.isOnline) {
        this.state = 'servidorIndisponivel';
      } else if (this.isSyncing) {
        this.state = 'sincronizando';
      } else if (this.failedCount > 0) {
        this.state = 'erro';
      } else if (this.pendingCount > 0) {
        this.state = 'pendente';
      } else {
        this.state = 'sincronizado';
      }

      this.notify();
      return { pending: this.pendingCount, failed: this.failedCount };
    } catch {
      return { pending: this.pendingCount, failed: this.failedCount };
    }
  }

  public async checkServerHealth(): Promise<boolean> {
    if (!this.isOnline) {
      this.isServerReachable = false;
      this.notify();
      return false;
    }

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/health', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache', Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      this.pingMs = Date.now() - start;
      const contentType = res.headers.get('content-type') || '';
      // A valid backend must return 200 OK and application/json (not an HTML fallback from static hosting)
      const isValidApi = res.ok && contentType.includes('application/json');
      this.isServerReachable = isValidApi;
      this.notify();
      return isValidApi;
    } catch {
      this.isServerReachable = false;
      this.notify();
      return false;
    }
  }

  public async syncNow(): Promise<boolean> {
    if (this.isSyncing) return false;

    await this.refreshCounts();

    if (!this.isOnline) {
      this.state = 'offline';
      this.notify();
      return false;
    }

    const reachable = await this.checkServerHealth();
    if (!reachable) {
      this.state = 'servidorIndisponivel';
      this.notify();
      return false;
    }

    const token = authStorage.getToken();
    if (!token) {
      // User not logged in, server reachable
      this.state = 'online';
      this.notify();
      return true;
    }

    this.isSyncing = true;
    this.state = 'sincronizando';
    this.lastError = null;
    this.notify();

    try {
      // 1. PUSH: Send pending operations to server
      const pendingOps = await dbService.getPendingOperations();
      if (pendingOps.length > 0) {
        const pushRes = await fetch('/api/sync/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ operations: pendingOps }),
        });

        if (pushRes.status === 401 || pushRes.status === 403) {
          this.state = 'sessaoExpirada';
          this.lastError = 'Sessão expirada. Faça login novamente.';
          this.isSyncing = false;
          this.notify();
          return false;
        }

        if (pushRes.status === 405 || pushRes.status === 404) {
          // Static host (e.g. Vercel without serverless API routes) or endpoint not deployed
          this.isServerReachable = false;
          this.state = 'servidorIndisponivel';
          this.lastError = 'Servidor de sincronização remoto não configurado nesta hospedagem. Operando 100% em modo local.';
          this.isSyncing = false;
          this.notify();
          return false;
        }

        if (pushRes.ok) {
          const pushData = await pushRes.json();
          if (Array.isArray(pushData.processedIds)) {
            for (const id of pushData.processedIds) {
              await dbService.markOperationCompleted(id);
            }
          }
          if (Array.isArray(pushData.errors)) {
            for (const errItem of pushData.errors) {
              await dbService.markOperationFailed(errItem.id, errItem.error);
            }
          }
        } else {
          const errData = await pushRes.json().catch(() => ({}));
          throw new Error(errData.error || `Erro de envio: HTTP ${pushRes.status}`);
        }
      }

      // 2. PULL: Download latest server state
      const pullRes = await fetch('/api/sync/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (pullRes.status === 405 || pullRes.status === 404) {
        this.isServerReachable = false;
        this.state = 'servidorIndisponivel';
        this.isSyncing = false;
        this.notify();
        return false;
      }

      if (pullRes.ok) {
        const pullData = await pullRes.json();
        if (pullData.tanks && typeof pullData.tanks === 'object') {
          const tanksList = Object.values(pullData.tanks) as any[];
          await dbService.saveTanks(tanksList, 'online', true);
        }

        // Save telemetry readings
        if (Array.isArray(pullData.recentTelemetry)) {
          for (const reading of pullData.recentTelemetry) {
            await dbService.saveReading(
              {
                id: reading.id,
                tankId: reading.tankId,
                nodeId: reading.nodeId,
                level: reading.level,
                currentLiters: reading.currentLiters,
                capacityLiters: reading.capacityLiters,
                pump: reading.pump,
                fault: reading.fault,
                sensors: reading.sensors,
                fault_mask: reading.fault_mask,
                timestamp: reading.timestamp,
                isoTime: reading.isoTime,
                source: reading.source || 'online_sync',
              },
              true // marked as synced
            );
          }
        }

        if (pullData.systemConfig) {
          await dbService.setConfig('systemConfig', pullData.systemConfig);
        }

        this.lastSyncTime = Date.now();
        await dbService.setConfig('lastSyncTime', this.lastSyncTime);
      }

      await this.refreshCounts();

      // Dispatch window event so components can refresh local state
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('hossidev:sync-completed', { detail: { time: this.lastSyncTime } }));
      }

      return true;
    } catch (err: any) {
      console.warn('[SyncService] Erro na sincronização:', err);
      this.lastError = err.message || 'Falha na conexão durante sincronização.';
      this.state = 'erro';
      await this.refreshCounts();
      return false;
    } finally {
      this.isSyncing = false;
      this.notify();
    }
  }

  public async retryFailed(): Promise<void> {
    await dbService.retryFailedOperations();
    await this.refreshCounts();
    await this.syncNow();
  }

  public async clearCompleted(): Promise<number> {
    const cleared = await dbService.clearCompletedOperations();
    await this.refreshCounts();
    return cleared;
  }
}

export const syncService = new SyncService();
