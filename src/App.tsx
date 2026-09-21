import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Droplets,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Radio,
  SlidersHorizontal,
  X,
  RefreshCw,
  Usb,
  Cpu,
  Layers,
  Waves,
  Zap,
  Lock,
  Wifi,
  AlertCircle,
} from 'lucide-react';
import {
  TankData,
  SystemData,
  LogItem,
  CondominiumMetrics,
  SectorType,
  AuthUser,
} from './types';
import { INITIAL_TANKS, INITIAL_NODES, SECTOR_INFO } from './data/tanksConfig';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { SectorSection } from './components/SectorSection';
import { SecurityBanner } from './components/SecurityBanner';
import { DiagnosticsModal } from './components/DiagnosticsModal';
import { AnalyticsModal } from './components/AnalyticsModal';
import { ReportModal } from './components/ReportModal';
import { TankDetailModal } from './components/TankDetailModal';
import { SerialContextModal } from './components/SerialContextModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AuthModal } from './components/AuthModal';
import { UserManagementModal } from './components/UserManagementModal';
import { ArduinoBridgeModal } from './components/ArduinoBridgeModal';
import { MobileExperienceModal } from './components/MobileExperienceModal';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { OfflineSyncModal } from './components/OfflineSyncModal';
import { SerialDeviceModal } from './components/SerialDeviceModal';
import { notificationService } from './services/notificationService';
import { api } from './services/api';
import { authStorage } from './services/authStorage';
import { syncService } from './services/syncService';
import { usbSerialManager } from './services/usbSerialManager';
import { SyncOverview, UsbSerialConnectionState, SerialDiagnosticsMetrics } from './types';
import { playAlarmBeep, playSuccessChime } from './utils/audio';

// Web Serial types
interface SerialPort {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array>;
  writable?: WritableStream<Uint8Array>;
}

export default function App() {
  // Authentication State with local storage hydration
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authStorage.getUser());
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(() => !authStorage.isUserLoggedIn());
  const [userMgmtModalOpen, setUserMgmtModalOpen] = useState<boolean>(false);
  const [arduinoBridgeModalOpen, setArduinoBridgeModalOpen] = useState<boolean>(false);
  const [serialDeviceModalOpen, setSerialDeviceModalOpen] = useState<boolean>(false);

  // USB / Serial Connection State & Diagnostics Metrics
  const [serialState, setSerialState] = useState<UsbSerialConnectionState>(() => usbSerialManager.getState());
  const [serialMetrics, setSerialMetrics] = useState<SerialDiagnosticsMetrics>(() => usbSerialManager.getMetrics());

  // Core Tank & System State (Initialized with real empty state, awaiting Arduino packets)
  const [tanks, setTanks] = useState<TankData[]>(() =>
    INITIAL_TANKS.map((t) => ({
      ...t,
      level: null,
      currentLiters: 0,
      pump: 0,
      fault: 0,
      sensors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      fault_mask: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      hasRealData: false,
    }))
  );

  const [system, setSystem] = useState<SystemData>({
    device: 'kizomba',
    uptime: 0,
    totalPackets: 0,
    lastReceivedTime: 0,
    isSerialConnected: false,
    isOnline: false,
    globalFaultCount: 0,
    audioAlarmEnabled: true,
    emergencyLockout: false,
    nodes: INITIAL_NODES,
  });

  const [logs, setLogs] = useState<LogItem[]>([
    {
      id: 'init-1',
      time: new Date().toLocaleTimeString(),
      type: 'system',
      text: 'Sistema Hossidev Water Monitor pronto para telemetria em tempo real.',
    },
  ]);

  const [serialNotification, setSerialNotification] = useState<{
    visible: boolean;
    type: 'connected' | 'disconnected';
    message: string;
  } | null>(null);

  // UI Navigation & Modals State
  const [activeTab, setActiveTab] = useState('overview');
  const [sectorFilter, setSectorFilter] = useState<'all' | SectorType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedDetailTank, setSelectedDetailTank] = useState<TankData | null>(null);
  const [nodesDrawerOpen, setNodesDrawerOpen] = useState(false);
  const [serialContextModalOpen, setSerialContextModalOpen] = useState(false);
  const [mobileExperienceOpen, setMobileExperienceOpen] = useState(false);
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncOverview, setSyncOverview] = useState<SyncOverview>(() => syncService.getOverview());
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Subscribe to offline-first sync state changes
  useEffect(() => {
    const unsub = syncService.subscribe((overview) => {
      setSyncOverview(overview);
    });
    return () => unsub();
  }, []);

  // Register PWA Service Worker & Capture A2HS (Add to Home Screen) Install Prompt
  useEffect(() => {
    notificationService.registerServiceWorker();

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    } else {
      setMobileExperienceOpen(true);
    }
  };

  // Add Log Helper
  const addLog = useCallback((type: 'rx' | 'tx' | 'fault' | 'system', text: string, rawJson?: string) => {
    setLogs((prev) => [
      ...prev.slice(-150),
      {
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type,
        text,
        rawJson,
      },
    ]);
  }, []);

  // Process Real Arduino Telemetry JSON Packet instantly (Web Serial & REST)
  const processUnifiedJSON = useCallback((data: any) => {
    if (!data || typeof data !== 'object') return;

    const now = Date.now();
    const extractedTanks: Array<{
      id: number;
      level?: number;
      pump?: number;
      sensors?: number[];
      fault?: number;
      fault_mask?: number[];
      nodeId?: number;
    }> = [];

    const nodesUpdate: {
      node1?: 'online' | 'offline';
      node2?: 'online' | 'offline';
      node3?: 'online' | 'offline';
    } = {};

    // 1. Process Node 1, Node 2, Node 3
    if (data.node1) {
      nodesUpdate.node1 = data.node1.status === 'online' || Array.isArray(data.node1.tanks) ? 'online' : 'offline';
      if (Array.isArray(data.node1.tanks)) {
        for (const t of data.node1.tanks) extractedTanks.push({ ...t, nodeId: 1 });
      }
    }
    if (data.node2) {
      nodesUpdate.node2 = data.node2.status === 'online' || Array.isArray(data.node2.tanks) ? 'online' : 'offline';
      if (Array.isArray(data.node2.tanks)) {
        for (const t of data.node2.tanks) extractedTanks.push({ ...t, nodeId: 2 });
      }
    }
    if (data.node3) {
      nodesUpdate.node3 = data.node3.status === 'online' || Array.isArray(data.node3.tanks) ? 'online' : 'offline';
      if (Array.isArray(data.node3.tanks)) {
        for (const t of data.node3.tanks) extractedTanks.push({ ...t, nodeId: 3 });
      }
    }

    // 2. Process direct tanks array or single tank object
    if (Array.isArray(data.tanks)) {
      const defaultNodeId = Number(data.node || data.nodeId || 1);
      const nodeKey = `node${defaultNodeId}` as 'node1' | 'node2' | 'node3';
      nodesUpdate[nodeKey] = 'online';
      for (const t of data.tanks) {
        extractedTanks.push({ ...t, nodeId: t.nodeId || defaultNodeId });
      }
    } else if (data.id && (data.level !== undefined || data.sensors !== undefined)) {
      const defaultNodeId = Number(data.node || data.nodeId || 1);
      extractedTanks.push({ ...data, nodeId: defaultNodeId });
    }

    if (extractedTanks.length > 0) {
      setTanks((prevTanks) => {
        return prevTanks.map((tank) => {
          const incoming = extractedTanks.find((t) => Number(t.id) === tank.id);
          if (!incoming) return tank;

          let sensors = Array.isArray(incoming.sensors) && incoming.sensors.length === 10
            ? incoming.sensors.map((v) => (v ? 1 : 0))
            : null;
          let level = typeof incoming.level === 'number' && !isNaN(incoming.level)
            ? Math.min(100, Math.max(0, Math.round(incoming.level)))
            : null;

          if (sensors && level === null) {
            const activeCount = sensors.filter((s: number) => s === 1).length;
            level = activeCount * 10;
          } else if (level !== null && !sensors) {
            const activeProbes = Math.min(10, Math.max(0, Math.floor(level / 10)));
            sensors = Array.from({ length: 10 }, (_, i) => (i < activeProbes ? 1 : 0));
          } else if (!sensors && level === null) {
            return tank;
          }

          const fault_mask = Array.isArray(incoming.fault_mask) && incoming.fault_mask.length === 10
            ? incoming.fault_mask.map((v) => (v ? 1 : 0))
            : [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

          // Optical probe discontinuity analysis (real sensor fault detection)
          if (sensors) {
            for (let i = 0; i < 9; i++) {
              if (sensors[i] === 0 && sensors[i + 1] === 1) {
                fault_mask[i] = 1;
              }
            }
          }

          const hasFault = fault_mask.some((f: number) => f === 1) || Number(incoming.fault || 0) === 1 ? 1 : 0;
          const pumpState = Number(incoming.pump || 0) === 1 ? 1 : 0;
          const currentLiters = level !== null ? Math.round((level / 100) * tank.capacityLiters) : 0;

          return {
            ...tank,
            level: level!,
            currentLiters,
            pump: pumpState,
            sensors: sensors!,
            fault: hasFault,
            fault_mask,
            hasRealData: true,
            lastUpdated: now,
          };
        });
      });

      setSystem((prev) => {
        return {
          ...prev,
          totalPacketsReceived: prev.totalPacketsReceived + 1,
          lastReceivedTime: now,
          isOnline: true,
          nodes: {
            node1: {
              ...prev.nodes.node1,
              status: nodesUpdate.node1 || prev.nodes.node1.status,
              packetCount: nodesUpdate.node1 === 'online' ? prev.nodes.node1.packetCount + 1 : prev.nodes.node1.packetCount,
              lastPing: nodesUpdate.node1 === 'online' ? now : prev.nodes.node1.lastPing,
            },
            node2: {
              ...prev.nodes.node2,
              status: nodesUpdate.node2 || prev.nodes.node2.status,
              packetCount: nodesUpdate.node2 === 'online' ? prev.nodes.node2.packetCount + 1 : prev.nodes.node2.packetCount,
              lastPing: nodesUpdate.node2 === 'online' ? now : prev.nodes.node2.lastPing,
            },
            node3: {
              ...prev.nodes.node3,
              status: nodesUpdate.node3 || prev.nodes.node3.status,
              packetCount: nodesUpdate.node3 === 'online' ? prev.nodes.node3.packetCount + 1 : prev.nodes.node3.packetCount,
              lastPing: nodesUpdate.node3 === 'online' ? now : prev.nodes.node3.lastPing,
            },
          },
        };
      });

      // Persist serial reading to offline-first IndexedDB and queue for sync
      if (extractedTanks.length > 0) {
        api.telemetry
          .ingest({
            tanks: extractedTanks,
            source: 'serial_bridge',
          })
          .catch(() => {});
      }
    }
  }, []);

  // Bind UsbSerialManager lifecycle & subscriptions
  useEffect(() => {
    const unsubState = usbSerialManager.subscribeState((state) => {
      setSerialState(state);
      const isConn = state === 'connected' || state === 'reading';
      setSystem((prev) => ({
        ...prev,
        isSerialConnected: isConn,
        isOnline: isConn || prev.isOnline,
      }));
      if (isConn) {
        playSuccessChime();
      }
    });

    const unsubTelemetry = usbSerialManager.subscribeTelemetry((telemetry) => {
      processUnifiedJSON(telemetry);
      api.telemetry.ingest(telemetry).catch(() => {});
    });

    const unsubLogs = usbSerialManager.subscribeLogs((log) => {
      addLog(log.type, log.text, log.rawJson);
    });

    const unsubMetrics = usbSerialManager.subscribeMetrics((m) => {
      setSerialMetrics(m);
    });

    // Auto-connect to previously authorized USB device on startup if enabled
    if (usbSerialManager.getConfig().autoReconnect) {
      usbSerialManager.connectSavedDevice().catch(() => {});
    }

    return () => {
      unsubState();
      unsubTelemetry();
      unsubLogs();
      unsubMetrics();
    };
  }, [addLog, processUnifiedJSON]);

  // Fetch Current Telemetry from Real Backend API
  const fetchCurrentTelemetry = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.telemetry.getCurrent();
      const rawTanks = data.tanks || {};
      const backendTanksList: TankData[] = Object.values(rawTanks);

      // Merge backend tanks with frontend static metadata (names, capacities, sectors)
      setTanks((prevTanks) => {
        return INITIAL_TANKS.map((initialTank) => {
          const backendTank = backendTanksList.find((bt) => bt.id === initialTank.id);
          const effectiveCapacity = backendTank?.capacityLiters || initialTank.capacityLiters;

          if (!backendTank) {
            return {
              ...initialTank,
              capacityLiters: effectiveCapacity,
              level: null,
              currentLiters: 0,
              pump: 0,
              sensors: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              fault: 0,
              fault_mask: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
              hasRealData: false,
            };
          }

          const hasRealData = (backendTank.hasRealData === true || backendTank.level !== null) && backendTank.level !== null && backendTank.level !== undefined;
          const levelVal = hasRealData ? Number(backendTank.level) : null;
          const currentLiters = levelVal !== null ? Math.round((levelVal / 100) * effectiveCapacity) : 0;

          return {
            ...initialTank,
            name: backendTank.name || initialTank.name,
            sector: backendTank.sector || initialTank.sector,
            sectorName: backendTank.sectorName || initialTank.sectorName,
            capacity_value: backendTank.capacity_value ?? effectiveCapacity,
            capacity_unit: backendTank.capacity_unit || initialTank.capacity_unit || 'L',
            capacityLiters: effectiveCapacity,
            level: levelVal,
            currentLiters,
            pump: backendTank.pump ?? 0,
            fault: backendTank.fault ?? 0,
            sensors: backendTank.sensors || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            fault_mask: backendTank.fault_mask || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            hasRealData,
            lastUpdated: backendTank.lastUpdated || Date.now(),
          };
        });
      });

      // Update System Node Statuses & Metrics
      setSystem((prev) => {
        const isOnline = data.isOnline;
        const totalFaults = backendTanksList.reduce((acc: number, t: TankData) => {
          return acc + (t.fault_mask ? t.fault_mask.filter((f: number) => f === 1).length : 0);
        }, 0);

        return {
          ...prev,
          lastReceivedTime: data.lastCommunicationTimestamp || prev.lastReceivedTime,
          isOnline,
          globalFaultCount: totalFaults,
          nodes: {
            node1: {
              ...prev.nodes.node1,
              status: data.nodes?.node1?.status || 'offline',
              packetCount: data.nodes?.node1?.packetCount || 0,
              lastPing: data.nodes?.node1?.lastPing || 0,
            },
            node2: {
              ...prev.nodes.node2,
              status: data.nodes?.node2?.status || 'offline',
              packetCount: data.nodes?.node2?.packetCount || 0,
              lastPing: data.nodes?.node2?.lastPing || 0,
            },
            node3: {
              ...prev.nodes.node3,
              status: data.nodes?.node3?.status || 'offline',
              packetCount: data.nodes?.node3?.packetCount || 0,
              lastPing: data.nodes?.node3?.lastPing || 0,
            },
          },
        };
      });
    } catch (err) {
      console.warn('Telemetry poll error:', err);
    }
  }, [currentUser]);

  // Telemetry Polling Interval (Every 1.5s when logged in)
  useEffect(() => {
    if (!currentUser) return;
    fetchCurrentTelemetry();
    const interval = setInterval(fetchCurrentTelemetry, 1500);
    return () => clearInterval(interval);
  }, [currentUser, fetchCurrentTelemetry]);

  // Serial Client Watchdog: if serial is active but no packets received in > 3.5s, mark node status as offline without destroying tank history
  useEffect(() => {
    const watchdogTimer = setInterval(() => {
      const isBusActive = serialState === 'connected' || serialState === 'reading';
      if (isBusActive && system.lastReceivedTime > 0) {
        const elapsed = Date.now() - system.lastReceivedTime;
        if (elapsed > 3500 && (system.isSerialConnected || system.nodes.node1.status === 'online')) {
          setSystem((prev) => ({
            ...prev,
            isSerialConnected: false,
            nodes: {
              node1: { ...prev.nodes.node1, status: 'offline' },
              node2: { ...prev.nodes.node2, status: 'offline' },
              node3: { ...prev.nodes.node3, status: 'offline' },
            },
          }));
        }
      }
    }, 1000);
    return () => clearInterval(watchdogTimer);
  }, [system.lastReceivedTime, system.isSerialConnected, system.nodes.node1.status, serialState]);

  // Keep syncService updated with serial connection
  useEffect(() => {
    syncService.setSerialConnected(system.isSerialConnected);
  }, [system.isSerialConnected]);

  // When sync completes, refresh current telemetry
  useEffect(() => {
    const handleSyncComplete = () => {
      fetchCurrentTelemetry();
    };
    window.addEventListener('hossidev:sync-completed', handleSyncComplete);
    return () => window.removeEventListener('hossidev:sync-completed', handleSyncComplete);
  }, [fetchCurrentTelemetry]);

  // Verify auth session validity and restore user permissions on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authStorage.isUserLoggedIn()) {
        try {
          const res = await api.auth.getMe();
          if (res.user) {
            setCurrentUser(res.user);
            authStorage.updateSessionUser(res.user);
          }
        } catch (err) {
          // If offline or network unavailable, do not kick out if valid stored session exists
          const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
          const user = authStorage.getUser();
          if (user && (isOffline || !syncOverview.isServerReachable)) {
            setCurrentUser(user);
            return;
          }

          console.warn('Sessão expirada ou revogada pelo servidor:', err);
          authStorage.clearSession();
          setCurrentUser(null);
          setAuthModalOpen(true);
        }
      } else {
        authStorage.clearSession();
        setCurrentUser(null);
        setAuthModalOpen(true);
      }
    };
    checkAuth();
  }, [syncOverview.isServerReachable]);

  // Filter tanks by User Role & Permissions (RBAC + Storage Assigned Tanks)
  const permittedTanks = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return tanks;

    const permittedIds = Array.isArray(currentUser.permittedTankIds) && currentUser.permittedTankIds.length > 0
      ? currentUser.permittedTankIds
      : Array.isArray(currentUser.assignedTankIds) && currentUser.assignedTankIds.length > 0
      ? currentUser.assignedTankIds
      : authStorage.getPermittedTankIds();

    return tanks.filter((t) => permittedIds.includes(t.id));
  }, [tanks, currentUser]);

  // Calculate Condominium Aggregate Metrics based on Real Permitted Tanks
  const metrics: CondominiumMetrics = useMemo(() => {
    const totalCapacity = permittedTanks.reduce((acc, t) => acc + t.capacityLiters, 0);
    const tanksWithData = permittedTanks.filter((t) => t.hasRealData && t.level !== null);
    const currentTotal = tanksWithData.reduce((acc, t) => acc + (t.currentLiters ?? 0), 0);
    const totalPercentage = totalCapacity > 0 && tanksWithData.length > 0 ? (currentTotal / totalCapacity) * 100 : 0;
    const activePumps = permittedTanks.filter((t) => t.pump === 1).length;
    const totalFaults = tanksWithData.reduce(
      (acc, t) => acc + (t.fault_mask ? t.fault_mask.filter((f) => f === 1).length : 0),
      0
    );

    // Dynamic autonomy based on total volume
    const estimatedDailyConsumption = 28000;
    const hourlyConsumption = estimatedDailyConsumption / 24;
    const estimatedAutonomyHours = currentTotal > 0 ? currentTotal / hourlyConsumption : 0;

    return {
      totalCapacityLiters: totalCapacity,
      currentTotalLiters: currentTotal,
      totalPercentage,
      estimatedAutonomyHours,
      dailyConsumptionEstimateLiters: estimatedDailyConsumption,
      activePumps,
      totalFaultySensors: totalFaults,
    };
  }, [permittedTanks]);

  // Audio Alarm Trigger for physical faults
  useEffect(() => {
    if (system.audioAlarmEnabled && metrics.totalFaultySensors > 0) {
      playAlarmBeep();
    }
  }, [metrics.totalFaultySensors, system.audioAlarmEnabled]);

  // Web Serial Connection Handlers (Managed via UsbSerialManager)
  const handleConnectSerial = async () => {
    const isInIframe = () => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    };

    // If Web Serial is not supported or if running inside a sandboxed iframe, open context helper
    if (!('serial' in navigator) || isInIframe()) {
      setSerialContextModalOpen(true);
      return;
    }

    const ok = await usbSerialManager.requestAndConnect();
    if (ok) {
      setSerialNotification({
        visible: true,
        type: 'connected',
        message: 'Central USB conectada com sucesso (115200 bps).',
      });
      setTimeout(() => setSerialNotification(null), 5000);
    }
  };

  const handleDisconnectSerial = async () => {
    await usbSerialManager.closeConnection(true);
    setSystem((prev) => ({
      ...prev,
      isSerialConnected: false,
      nodes: {
        node1: { ...prev.nodes.node1, status: 'offline' },
        node2: { ...prev.nodes.node2, status: 'offline' },
        node3: { ...prev.nodes.node3, status: 'offline' },
      },
    }));
  };

  const handleReconnectLastSerial = async () => {
    const ok = await usbSerialManager.reconnectNow();
    if (!ok && (serialState === 'waitingForDevice' || serialState === 'disconnected')) {
      setSerialDeviceModalOpen(true);
    }
  };

  // Hardware Relay Pump Command Trigger
  const handleTogglePumpOverride = async (tankId: number) => {
    if (!currentUser) return;
    const permittedIds = currentUser.role === 'admin'
      ? [1, 2, 3, 4, 5, 6]
      : (Array.isArray(currentUser.permittedTankIds) && currentUser.permittedTankIds.length > 0
          ? currentUser.permittedTankIds
          : [1, 2, 3, 4, 5, 6]);

    if (!permittedIds.includes(tankId)) {
      addLog('fault', `Acesso negado: seu perfil não possui autorização para acionar a bomba do reservatório T${tankId}.`);
      return;
    }

    const targetTank = tanks.find((t) => t.id === tankId);
    if (!targetTank) return;
    const nextState = targetTank.pump === 1 ? 0 : 1;

    try {
      // 1. Send via local / offline REST API queue
      await api.telemetry.sendCommand({
        command: 'pump_toggle',
        tankId,
        nodeId: targetTank.nodeId,
        value: nextState,
      });

      // 2. Direct USB bus dispatch with safety checks
      if (serialState === 'connected' || serialState === 'reading') {
        await usbSerialManager.sendCommand(
          {
            device: 'kizomba',
            cmd: 'pump_toggle',
            tank: tankId,
            node: targetTank.nodeId,
            val: nextState,
          },
          {
            isPumpCommand: true,
            tankId,
            nodeId: targetTank.nodeId,
            userId: currentUser.id,
            userName: currentUser.name,
          }
        );
      }

      addLog(
        'tx',
        `[TX] Comando relé de bomba tanque T${tankId} -> ${nextState === 1 ? 'LIGAR' : 'DESLIGAR'}`
      );
      playSuccessChime();
      fetchCurrentTelemetry();
    } catch (err: any) {
      addLog('fault', `Falha ao enviar comando de bomba T${tankId}: ${err.message}`);
    }
  };

  // Emergency Stop Lockout Handler
  const handleToggleEmergencyStop = async () => {
    const nextLockout = !system.emergencyLockout;
    setSystem((prev) => ({ ...prev, emergencyLockout: nextLockout }));

    try {
      const cmdPayload = {
        device: 'kizomba',
        cmd: nextLockout ? 'emergency_stop' : 'emergency_reset',
      };

      await api.telemetry.sendCommand({
        command: nextLockout ? 'emergency_stop' : 'emergency_reset',
      });

      if (serialState === 'connected' || serialState === 'reading') {
        await usbSerialManager.sendCommand(cmdPayload, { isPumpCommand: true });
      }

      addLog(
        'tx',
        nextLockout
          ? '🚨 COMANDO: Desarme de Emergência de Todas as 6 Bombas enviado ao barramento.'
          : '✅ COMANDO: Reativação de segurança das bombas enviada ao barramento.'
      );
      fetchCurrentTelemetry();
    } catch (err: any) {
      addLog('fault', `Erro no comando de emergência: ${err.message}`);
    }
  };

  // Filter tanks by search & sector tab
  const displayedTanks = useMemo(() => {
    return permittedTanks.filter((tank) => {
      if (sectorFilter !== 'all' && tank.sector !== sectorFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = tank.name.toLowerCase().includes(q);
        const matchesSector = tank.sectorName.toLowerCase().includes(q);
        const matchesId = `t${tank.id}`.includes(q) || `#${tank.id}`.includes(q);
        return matchesName || matchesSector || matchesId;
      }
      return true;
    });
  }, [permittedTanks, sectorFilter, searchQuery]);

  const filtradaTanks = displayedTanks.filter((t) => t.sector === 'filtrada');
  const naoFiltradaTanks = displayedTanks.filter((t) => t.sector === 'nao-filtrada');
  const brutaTanks = displayedTanks.filter((t) => t.sector === 'bruta');

  // Handle Logout with complete local storage clearance
  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignorar erros de rede durante logout
    } finally {
      authStorage.clearSession();
      setCurrentUser(null);
      setAuthModalOpen(true);
    }
  };

  // If user is not authenticated, show full login/register view
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
        <AuthModal
          isOpen={true}
          onSuccess={(user) => {
            setCurrentUser(user);
            setAuthModalOpen(false);
            fetchCurrentTelemetry();
          }}
        />
      </div>
    );
  }

  return (
    <div id="main-scada-app" className="min-h-screen bg-[#020617] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      {/* Header */}
      <Header
        system={system}
        metrics={metrics}
        currentUser={currentUser}
        syncOverview={syncOverview}
        onOpenSyncModal={() => setSyncModalOpen(true)}
        onToggleAudio={() => setSystem((p) => ({ ...p, audioAlarmEnabled: !p.audioAlarmEnabled }))}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        onOpenAnalytics={() => setAnalyticsOpen(true)}
        onOpenReport={() => setReportOpen(true)}
        onOpenUsers={() => setUserMgmtModalOpen(true)}
        onOpenArduinoBridge={() => setArduinoBridgeModalOpen(true)}
        onOpenMobileExperience={() => setMobileExperienceOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Body Layout: Sticky Sidebar + Fluid Bento Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1920px] w-full mx-auto">
        {/* Left SCADA Hardware Bus Sidebar */}
        <Sidebar
          system={system}
          currentUser={currentUser}
          serialState={serialState}
          reconnectCount={serialMetrics.reconnectCount}
          nextReconnectInSec={serialMetrics.nextReconnectInSec}
          onConnectSerial={handleConnectSerial}
          onDisconnectSerial={handleDisconnectSerial}
          onReconnectLastSerial={handleReconnectLastSerial}
          onOpenSerialDeviceModal={() => setSerialDeviceModalOpen(true)}
          onOpenDiagnostics={() => setDiagnosticsOpen(true)}
          onToggleEmergencyStop={handleToggleEmergencyStop}
          onResetStats={() => setSystem((p) => ({ ...p, totalPackets: 0 }))}
          onOpenArduinoBridge={() => setArduinoBridgeModalOpen(true)}
        />

        {/* Center Main Dashboard Content */}
        <main className="flex-1 p-4 lg:p-8 flex flex-col gap-6 overflow-y-auto">
          {/* Serial Plug Notification Toast */}
          {serialNotification && (
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between gap-3 animate-in slide-in-from-top-2 shadow-lg backdrop-blur-md ${
                serialNotification.type === 'connected'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <Usb className="w-5 h-5 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-bold">{serialNotification.message}</span>
              </div>
              <button
                onClick={() => setSerialNotification(null)}
                className="p-1 hover:bg-white/10 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Real Security & Fault Alert Banner */}
          <SecurityBanner
            tanks={permittedTanks}
            onOpenDiagnostics={() => setDiagnosticsOpen(true)}
            onClearAllFaults={() => fetchCurrentTelemetry()}
          />

          {/* RBAC Notice for Regular Operators */}
          {currentUser.role !== 'admin' && (
            <div className="glass-panel px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  Modo Operador / Morador: Acesso restrito aos reservatórios autorizados (
                  <strong className="text-cyan-300">{permittedTanks.length} de 6 tanques</strong>).
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">ID: {currentUser.username}</span>
            </div>
          )}

          {/* Search & Sector Filter Bento Bar */}
          <div className="glass-panel p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm">
            {/* Sector Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              <button
                id="filter-all-btn"
                onClick={() => setSectorFilter('all')}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  sectorFilter === 'all'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                Todos ({permittedTanks.length})
              </button>
              <button
                id="filter-filtrada-btn"
                onClick={() => setSectorFilter('filtrada')}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  sectorFilter === 'filtrada'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Droplets className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tratada ({permittedTanks.filter((t) => t.sector === 'filtrada').length})</span>
              </button>
              <button
                id="filter-nao-filtrada-btn"
                onClick={() => setSectorFilter('nao-filtrada')}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  sectorFilter === 'nao-filtrada'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Waves className="w-3.5 h-3.5 text-sky-400" />
                <span>Não Tratada ({permittedTanks.filter((t) => t.sector === 'nao-filtrada').length})</span>
              </button>
              <button
                id="filter-bruta-btn"
                onClick={() => setSectorFilter('bruta')}
                className={`px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  sectorFilter === 'bruta'
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Água Bruta ({permittedTanks.filter((t) => t.sector === 'bruta').length})</span>
              </button>
            </div>

            {/* Live Search & Refresh */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  id="tank-search-input"
                  type="text"
                  placeholder="Pesquisar reservatório..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                />
              </div>

              <button
                onClick={fetchCurrentTelemetry}
                className="p-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                title="Sincronizar telemetria"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* No Tanks Found Empty State */}
          {displayedTanks.length === 0 ? (
            <div className="glass-panel p-12 rounded-3xl flex flex-col items-center justify-center text-center gap-3">
              <AlertCircle className="w-10 h-10 text-slate-500" />
              <h3 className="text-base font-bold text-slate-300">Nenhum reservatório correspondente</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Nenhum tanque encontrado para os filtros ativos ou você não possui permissão de visualização.
              </p>
            </div>
          ) : (
            /* Hydraulic Sectors Bento Layout */
            <div className="flex flex-col gap-6">
              {filtradaTanks.length > 0 && (
                <SectorSection
                  sectorKey="filtrada"
                  tanks={filtradaTanks}
                  onOpenDetails={(tank) => setSelectedDetailTank(tank)}
                  onTogglePumpOverride={handleTogglePumpOverride}
                />
              )}

              {naoFiltradaTanks.length > 0 && (
                <SectorSection
                  sectorKey="nao-filtrada"
                  tanks={naoFiltradaTanks}
                  onOpenDetails={(tank) => setSelectedDetailTank(tank)}
                  onTogglePumpOverride={handleTogglePumpOverride}
                />
              )}

              {brutaTanks.length > 0 && (
                <SectorSection
                  sectorKey="bruta"
                  tanks={brutaTanks}
                  onOpenDetails={(tank) => setSelectedDetailTank(tank)}
                  onTogglePumpOverride={handleTogglePumpOverride}
                />
              )}
            </div>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAnalytics={() => setAnalyticsOpen(true)}
        onOpenDiagnostics={() => setDiagnosticsOpen(true)}
        onOpenReport={() => setReportOpen(true)}
        onOpenNodesDrawer={() => setNodesDrawerOpen(true)}
        onOpenMobileExperience={() => setMobileExperienceOpen(true)}
        faultCount={metrics.totalFaultySensors}
      />

      {/* Floating PWA Install Prompt Banner */}
      <PwaInstallBanner
        onOpenMobileModal={() => setMobileExperienceOpen(true)}
        deferredPrompt={deferredPrompt}
        onInstall={handleInstallPwa}
      />

      {/* Modals & Dialogs */}
      <MobileExperienceModal
        isOpen={mobileExperienceOpen}
        onClose={() => setMobileExperienceOpen(false)}
        system={system}
        tanks={permittedTanks}
        metrics={metrics}
        deferredPrompt={deferredPrompt}
        onInstallPwa={handleInstallPwa}
      />
      <DiagnosticsModal
        isOpen={diagnosticsOpen}
        onClose={() => setDiagnosticsOpen(false)}
        logs={logs}
        onClearLogs={() => setLogs([])}
        system={system}
        metrics={serialMetrics}
        serialState={serialState}
        onSendCommand={async (cmdStr) => {
          try {
            const parsed = JSON.parse(cmdStr);
            await api.telemetry.sendCommand(parsed);
            if (serialState === 'connected' || serialState === 'reading') {
              await usbSerialManager.sendCommand(parsed);
            }
            addLog('tx', `[TX] ${cmdStr}`);
          } catch (e: any) {
            if (serialState === 'connected' || serialState === 'reading') {
              await usbSerialManager.sendCommand(cmdStr);
            }
            addLog('tx', `[TX] ${cmdStr}`);
          }
        }}
      />

      <AnalyticsModal
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        tanks={permittedTanks}
        metrics={metrics}
      />

      <ReportModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        tanks={permittedTanks}
        system={system}
        metrics={metrics}
      />

      <TankDetailModal
        tank={selectedDetailTank}
        isOpen={!!selectedDetailTank}
        onClose={() => setSelectedDetailTank(null)}
        onTogglePumpOverride={handleTogglePumpOverride}
      />

      <SerialContextModal
        isOpen={serialContextModalOpen}
        onClose={() => setSerialContextModalOpen(false)}
        onOpenArduinoBridge={() => setArduinoBridgeModalOpen(true)}
      />

      <ArduinoBridgeModal
        isOpen={arduinoBridgeModalOpen}
        onClose={() => setArduinoBridgeModalOpen(false)}
      />

      {currentUser.role === 'admin' && (
        <UserManagementModal
          isOpen={userMgmtModalOpen}
          onClose={() => setUserMgmtModalOpen(false)}
          currentUser={currentUser}
          onSystemConfigChanged={() => fetchCurrentTelemetry()}
        />
      )}

      <OfflineSyncModal
        isOpen={syncModalOpen}
        onClose={() => setSyncModalOpen(false)}
        syncOverview={syncOverview}
      />

      <SerialDeviceModal
        isOpen={serialDeviceModalOpen}
        onClose={() => setSerialDeviceModalOpen(false)}
        currentState={serialState}
        metrics={serialMetrics}
        onOpenArduinoBridge={() => {
          setSerialDeviceModalOpen(false);
          setArduinoBridgeModalOpen(true);
        }}
      />
    </div>
  );
}
