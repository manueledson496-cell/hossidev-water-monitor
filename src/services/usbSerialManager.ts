import {
  UsbSerialConnectionState,
  UsbDeviceConfig,
  SerialDiagnosticsMetrics,
  SerialCommandRecord,
} from '../types';
import { dbService } from '../db/localDb';

type StateListener = (state: UsbSerialConnectionState) => void;
type TelemetryListener = (data: any) => void;
type LogListener = (log: { type: 'rx' | 'tx' | 'fault' | 'system'; text: string; rawJson?: string }) => void;
type MetricsListener = (metrics: SerialDiagnosticsMetrics) => void;

const STORAGE_KEY_CONFIG = 'hossidev_usb_device_config';
const BACKOFF_DELAYS = [1000, 2000, 5000, 10000, 30000]; // 1s, 2s, 5s, 10s, 30s
const MAX_FAST_RECONNECT_ATTEMPTS = 5;
const HEARTBEAT_INTERVAL_MS = 12000;
const HEARTBEAT_TIMEOUT_MS = 8000;
const NO_DATA_TIMEOUT_MS = 18000;

export class UsbSerialManager {
  private static instance: UsbSerialManager;

  private state: UsbSerialConnectionState = 'idle';
  private port: any = null; // SerialPort
  private reader: any = null; // ReadableStreamDefaultReader
  private writer: any = null; // WritableStreamDefaultWriter
  private sessionToken: number = 0;
  private isClosing: boolean = false;
  private isOpening: boolean = false;
  private isIntentionalDisconnect: boolean = false;

  private reconnectTimer: any = null;
  private countdownTimer: any = null;
  private heartbeatTimer: any = null;
  private lastPingSentAt: number | null = null;
  private noDataTimer: any = null;

  private reconnectAttempt: number = 0;
  private nextReconnectInSec: number | null = null;

  // Configuration
  private config: UsbDeviceConfig = {
    deviceId: 'placa-1',
    friendlyName: 'Placa 1 - Barramento Mestre USB',
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: 'none',
    autoReconnect: true,
  };

  // Metrics
  private metrics: SerialDiagnosticsMetrics = {
    totalPacketsReceived: 0,
    totalPacketsInvalid: 0,
    reconnectCount: 0,
    readErrorCount: 0,
    writeErrorCount: 0,
    lastMessageTime: null,
    lastHeartbeatTime: null,
    lastHeartbeatStatus: 'none',
    lastCommandSent: null,
    lastCommandResult: null,
    lastLatencyMs: null,
    reconnectAttempt: 0,
    nextReconnectInSec: null,
    activePortInfo: null,
    lastErrorText: null,
  };

  // Command Queue
  private commandQueue: Array<{
    record: SerialCommandRecord;
    resolve: (val: boolean) => void;
  }> = [];
  private isProcessingQueue: boolean = false;

  // Listeners
  private stateListeners = new Set<StateListener>();
  private telemetryListeners = new Set<TelemetryListener>();
  private logListeners = new Set<LogListener>();
  private metricsListeners = new Set<MetricsListener>();

  private constructor() {
    this.loadSavedConfig();
    this.setupWebSerialEventListeners();
  }

  public static getInstance(): UsbSerialManager {
    if (!UsbSerialManager.instance) {
      UsbSerialManager.instance = new UsbSerialManager();
    }
    return UsbSerialManager.instance;
  }

  // --- CONFIGURATION PERSISTENCE ---

  private loadSavedConfig(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
      if (raw) {
        const parsed = JSON.parse(raw);
        this.config = { ...this.config, ...parsed };
      }
    } catch (e) {
      console.warn('[UsbSerialManager] Erro ao carregar config:', e);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(this.config));
      await dbService.setLocalConfig(STORAGE_KEY_CONFIG, this.config);
    } catch (e) {
      console.warn('[UsbSerialManager] Erro ao salvar config:', e);
    }
  }

  public updateConfig(newConfig: Partial<UsbDeviceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.notifyMetrics();
  }

  public getConfig(): UsbDeviceConfig {
    return { ...this.config };
  }

  public forgetSavedDevice(): void {
    this.config.usbVendorId = undefined;
    this.config.usbProductId = undefined;
    this.config.serialNumber = undefined;
    this.config.lastConnectedAt = undefined;
    this.metrics.activePortInfo = null;
    this.saveConfig();
    this.notifyLog('system', 'Dispositivo USB esquecido da memória do navegador.');
    this.notifyMetrics();
  }

  // --- BROWSER / NATIVE EVENTS ---

  private setupWebSerialEventListeners(): void {
    if (typeof navigator !== 'undefined' && 'serial' in navigator) {
      // Connect Event: Triggered when a physical USB port is plugged into the machine
      // @ts-ignore
      navigator.serial.addEventListener('connect', async (event: any) => {
        const port = event.target;
        const portInfo = port?.getInfo ? port.getInfo() : {};
        this.notifyLog(
          'system',
          `[USB Plug] Dispositivo USB plugado: VID=0x${(portInfo.usbVendorId || 0).toString(16)} PID=0x${(portInfo.usbProductId || 0).toString(16)}`
        );

        // If we are waiting for this device or in disconnected state without intentional disconnect, auto-connect!
        if (
          !this.isIntentionalDisconnect &&
          this.config.autoReconnect &&
          (this.state === 'disconnected' ||
            this.state === 'waitingForDevice' ||
            this.state === 'error' ||
            this.state === 'idle')
        ) {
          const match = this.matchesSavedDevice(portInfo);
          if (match || !this.config.usbVendorId) {
            this.notifyLog('system', 'Dispositivo reconhecido correspondente à central. Iniciando conexão automática...');
            this.connectPort(port);
          }
        }
      });

      // Disconnect Event: Triggered when physical USB cable is pulled out
      // @ts-ignore
      navigator.serial.addEventListener('disconnect', async (event: any) => {
        this.notifyLog('fault', 'Dispositivo USB foi desconectado fisicamente do computador.');
        this.metrics.readErrorCount++;
        this.metrics.lastErrorText = 'Cabo USB desconectado fisicamente';

        if (this.state === 'connected' || this.state === 'reading' || this.state === 'connecting') {
          // Unintentional disconnect! Clean up locks and initiate auto-reconnect policy
          await this.closeConnection(false);
          this.startAutoReconnect('Cabo USB desconectado fisicamente');
        }
      });
    }
  }

  private matchesSavedDevice(portInfo: any): boolean {
    if (!portInfo) return false;
    if (this.config.usbVendorId && portInfo.usbVendorId) {
      if (this.config.usbVendorId !== portInfo.usbVendorId) return false;
    }
    if (this.config.usbProductId && portInfo.usbProductId) {
      if (this.config.usbProductId !== portInfo.usbProductId) return false;
    }
    return true;
  }

  // --- SUBSCRIPTIONS ---

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.state);
    return () => this.stateListeners.delete(listener);
  }

  public subscribeTelemetry(listener: TelemetryListener): () => void {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  public subscribeLogs(listener: LogListener): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  public subscribeMetrics(listener: MetricsListener): () => void {
    this.metricsListeners.add(listener);
    listener(this.getMetrics());
    return () => this.metricsListeners.delete(listener);
  }

  private setState(newState: UsbSerialConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.stateListeners.forEach((fn) => fn(newState));
      this.notifyMetrics();
    }
  }

  private notifyLog(type: 'rx' | 'tx' | 'fault' | 'system', text: string, rawJson?: string): void {
    this.logListeners.forEach((fn) => fn({ type, text, rawJson }));
  }

  private notifyMetrics(): void {
    const m = this.getMetrics();
    this.metricsListeners.forEach((fn) => fn(m));
  }

  public getState(): UsbSerialConnectionState {
    return this.state;
  }

  public getMetrics(): SerialDiagnosticsMetrics {
    return {
      ...this.metrics,
      reconnectAttempt: this.reconnectAttempt,
      nextReconnectInSec: this.nextReconnectInSec,
    };
  }

  // --- CONNECT / RECONNECT LOGIC ---

  /**
   * Request user permission for a new port and open connection.
   */
  public async requestAndConnect(baudRate?: number): Promise<boolean> {
    if (this.isOpening || this.state === 'connecting') {
      this.notifyLog('system', 'Tentativa de conexão já em andamento. Aguarde.');
      return false;
    }

    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      this.setState('unauthorized');
      this.notifyLog('fault', 'Web Serial API não é suportada neste navegador. Use Google Chrome ou Microsoft Edge.');
      return false;
    }

    this.isIntentionalDisconnect = false;
    this.clearTimers();
    this.setState('requestingPermission');

    try {
      // @ts-ignore
      const port = await navigator.serial.requestPort();
      if (!port) {
        this.setState('idle');
        return false;
      }

      if (baudRate) {
        this.config.baudRate = baudRate;
      }

      return await this.connectPort(port);
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (err?.name === 'NotFoundError' || msg.includes('No port selected') || msg.includes('canceled')) {
        this.setState('idle');
        this.notifyLog('system', 'Seleção de porta cancelada pelo usuário.');
      } else if (err?.name === 'SecurityError' || msg.includes('disallowed') || msg.includes('permission')) {
        this.setState('unauthorized');
        this.notifyLog('fault', `Permissão USB negada pelo navegador: ${msg}`);
      } else {
        this.setState('error');
        this.metrics.lastErrorText = msg;
        this.notifyLog('fault', `Falha ao selecionar porta USB: ${msg}`);
      }
      return false;
    }
  }

  /**
   * Tries to find and automatically connect to the last authorized device.
   */
  public async connectSavedDevice(): Promise<boolean> {
    if (this.isOpening || this.state === 'connecting' || this.state === 'connected' || this.state === 'reading') {
      return false;
    }

    if (typeof navigator === 'undefined' || !('serial' in navigator)) {
      return false;
    }

    try {
      // @ts-ignore
      const authorizedPorts: any[] = await navigator.serial.getPorts();
      if (!authorizedPorts || authorizedPorts.length === 0) {
        this.notifyLog('system', 'Nenhuma porta serial previamente autorizada encontrada.');
        this.setState('disconnected');
        return false;
      }

      // Try to find matching port
      let targetPort: any = null;
      if (this.config.usbVendorId && this.config.usbProductId) {
        targetPort = authorizedPorts.find((p) => {
          const info = p.getInfo ? p.getInfo() : {};
          return info.usbVendorId === this.config.usbVendorId && info.usbProductId === this.config.usbProductId;
        });
      }

      // Fallback: if only 1 authorized port exists and no specific id is saved, pick it
      if (!targetPort && authorizedPorts.length === 1) {
        targetPort = authorizedPorts[0];
      }

      if (targetPort) {
        this.notifyLog('system', 'Última central autorizada localizada. Conectando...');
        return await this.connectPort(targetPort);
      } else {
        this.notifyLog('system', 'Último dispositivo gravado não está presente nas portas conectadas.');
        this.setState('waitingForDevice');
        return false;
      }
    } catch (e: any) {
      console.warn('[UsbSerialManager] Erro ao recuperar portas salvas:', e);
      this.setState('error');
      return false;
    }
  }

  /**
   * Opens and starts communication with a specific SerialPort instance.
   */
  private async connectPort(port: any): Promise<boolean> {
    if (this.isOpening) return false;
    this.isOpening = true;
    this.setState('connecting');

    try {
      // If port is already opened in a zombie state or another session, try to close it cleanly first
      if (this.port && this.port !== port) {
        await this.closeConnection(false);
      }

      const info = port.getInfo ? port.getInfo() : {};
      const vid = info.usbVendorId ? `0x${info.usbVendorId.toString(16)}` : 'N/A';
      const pid = info.usbProductId ? `0x${info.usbProductId.toString(16)}` : 'N/A';
      const displayName = `USB Serial (VID: ${vid}, PID: ${pid})`;

      // Open the port with strict parameters
      await port.open({
        baudRate: this.config.baudRate || 115200,
        dataBits: this.config.dataBits || 8,
        stopBits: this.config.stopBits || 1,
        parity: this.config.parity || 'none',
        flowControl: this.config.flowControl || 'none',
      });

      this.port = port;
      this.sessionToken = Date.now() + Math.random();
      this.reconnectAttempt = 0;
      this.nextReconnectInSec = null;
      this.isIntentionalDisconnect = false;

      // Update and save config
      if (info.usbVendorId) this.config.usbVendorId = info.usbVendorId;
      if (info.usbProductId) this.config.usbProductId = info.usbProductId;
      this.config.lastConnectedAt = new Date().toISOString();
      this.saveConfig();

      this.metrics.activePortInfo = {
        usbVendorId: info.usbVendorId,
        usbProductId: info.usbProductId,
        displayName,
      };
      this.metrics.lastErrorText = null;

      this.setState('connected');
      this.notifyLog('system', `Porta aberta com sucesso (${this.config.baudRate} bps, 8N1).`);

      // Start reader stream loop
      this.startReadLoop(this.sessionToken);

      // Start periodic heartbeat
      this.startHeartbeat();

      this.isOpening = false;
      return true;
    } catch (err: any) {
      this.isOpening = false;
      const msg = err?.message || String(err);
      this.metrics.lastErrorText = msg;

      if (msg.includes('already open') || msg.includes('already being used') || msg.includes('locked')) {
        this.setState('busy');
        this.notifyLog('fault', 'A porta serial já está aberta por outro componente ou processo.');
      } else {
        this.setState('error');
        this.notifyLog('fault', `Erro ao abrir porta serial: ${msg}`);
      }

      return false;
    }
  }

  // --- READ LOOP ---

  private async startReadLoop(currentSessionToken: number): Promise<void> {
    if (!this.port || !this.port.readable) return;

    this.setState('reading');

    try {
      // @ts-ignore
      const textDecoder = new TextDecoderStream();
      const readableClosed = this.port.readable.pipeTo(textDecoder.writable);
      const reader = textDecoder.readable.getReader();
      this.reader = reader;

      let lineBuffer = '';

      while (this.sessionToken === currentSessionToken && !this.isClosing) {
        const { value, done } = await reader.read();

        if (done) {
          this.notifyLog('system', 'Fluxo de leitura serial concluído (EOF).');
          break;
        }

        if (value) {
          lineBuffer += value;
          const lines = lineBuffer.split(/\r?\n/);
          lineBuffer = lines.pop() || ''; // Keep incomplete fragment

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            this.handleIncomingLine(trimmed);
          }
        }
      }

      await readableClosed.catch(() => {});
    } catch (err: any) {
      // Only process error if this session is still active and not intentionally closing
      if (this.sessionToken === currentSessionToken && !this.isClosing) {
        const msg = err?.message || String(err);
        this.metrics.readErrorCount++;
        this.metrics.lastErrorText = msg;
        this.notifyLog('fault', `Erro no stream de leitura: ${msg}`);

        // Involuntary disconnect / reader abort
        await this.closeConnection(false);
        this.startAutoReconnect('Erro no stream serial');
      }
    } finally {
      // Ensure reader lock is safely released
      try {
        if (this.reader) {
          this.reader.releaseLock();
          this.reader = null;
        }
      } catch (e) {
        console.warn('[UsbSerialManager] Erro ao liberar reader lock:', e);
      }
    }
  }

  private handleIncomingLine(line: string): void {
    const now = Date.now();
    this.metrics.lastMessageTime = now;
    this.resetNoDataWatchdog();

    // 1. Check for Heartbeat Pong
    if (line.includes('"pong"') || line.includes('"type":"pong"')) {
      this.metrics.lastHeartbeatTime = now;
      this.metrics.lastHeartbeatStatus = 'ok';
      if (this.lastPingSentAt) {
        this.metrics.lastLatencyMs = now - this.lastPingSentAt;
        this.lastPingSentAt = null;
      }
      this.notifyLog('rx', `[HEARTBEAT PONG] Placa respondeu OK (${this.metrics.lastLatencyMs ?? 0}ms)`);
      this.notifyMetrics();
      return;
    }

    // 2. Parse Standard Telemetry JSON
    try {
      const parsed = JSON.parse(line);
      this.metrics.totalPacketsReceived++;
      this.metrics.lastHeartbeatTime = now;
      this.metrics.lastHeartbeatStatus = 'ok';

      // Dispatch to telemetry subscribers
      this.telemetryListeners.forEach((fn) => fn(parsed));
      this.notifyLog('rx', line, line);
      this.notifyMetrics();
    } catch (e) {
      // Raw or non-JSON line (e.g. debug prints from Arduino setup)
      this.metrics.totalPacketsInvalid++;
      this.notifyLog('rx', `[RAW] ${line}`);
      this.notifyMetrics();
    }
  }

  // --- WRITE / COMMAND QUEUE ---

  public async sendCommand(
    payload: string | object,
    metadata?: {
      isPumpCommand?: boolean;
      tankId?: number;
      nodeId?: number;
      userId?: string;
      userName?: string;
    }
  ): Promise<boolean> {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const commandText = str.endsWith('\n') ? str : str + '\n';

    const cmdRecord: SerialCommandRecord = {
      id: 'cmd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      command: str.trim(),
      tankId: metadata?.tankId,
      nodeId: metadata?.nodeId,
      userId: metadata?.userId,
      userName: metadata?.userName,
      timestamp: Date.now(),
      status: 'queued',
      attempt: 1,
      isPumpCommand: metadata?.isPumpCommand,
    };

    return new Promise<boolean>((resolve) => {
      this.commandQueue.push({ record: cmdRecord, resolve });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) return;
    if (this.commandQueue.length === 0) return;

    this.isProcessingQueue = true;
    const item = this.commandQueue.shift()!;
    const { record, resolve } = item;

    record.status = 'sending';
    this.metrics.lastCommandSent = record.command;

    if (!this.port || !this.port.writable || this.state !== 'reading' && this.state !== 'connected') {
      record.status = 'failed';
      record.result = 'Porta serial não conectada';
      this.metrics.lastCommandResult = 'failed';
      this.metrics.writeErrorCount++;
      this.notifyLog('fault', `Comando abortado: Porta serial não está pronta. (${record.command})`);
      this.isProcessingQueue = false;
      resolve(false);
      this.processQueue();
      return;
    }

    let writer: any = null;
    let timer: any = null;

    try {
      // @ts-ignore
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
      writer = textEncoder.writable.getWriter();

      // Enforce 3000ms timeout
      const writePromise = writer.write(record.command + '\n');
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Timeout de escrita (3s)')), 3000);
      });

      await Promise.race([writePromise, timeoutPromise]);
      clearTimeout(timer);

      record.status = 'sent';
      record.result = 'Transmitido com sucesso';
      this.metrics.lastCommandResult = 'success';

      this.notifyLog('tx', `[TX SERIAL] ${record.command}`);
      this.notifyMetrics();

      await writer.close().catch(() => {});
      await writableStreamClosed.catch(() => {});

      resolve(true);
    } catch (err: any) {
      if (timer) clearTimeout(timer);
      const msg = err?.message || String(err);
      record.status = 'failed';
      record.result = msg;
      this.metrics.lastCommandResult = 'failed';
      this.metrics.writeErrorCount++;
      this.notifyLog('fault', `Falha ao transmitir comando: ${msg}`);

      // Note: for safety reasons, we NEVER blindly auto-retry dangerous pump toggle commands
      if (record.isPumpCommand) {
        this.notifyLog(
          'fault',
          `SEGURANÇA: Comando de bomba retido sem reenvio automático para evitar choques no relé.`
        );
      }

      resolve(false);
    } finally {
      try {
        if (writer) {
          writer.releaseLock();
        }
      } catch (e) {
        console.warn('[UsbSerialManager] Erro ao liberar writer lock:', e);
      }
      this.isProcessingQueue = false;
      this.processQueue();
    }
  }

  // --- HEARTBEAT & NO-DATA WATCHDOG ---

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(async () => {
      if (this.state === 'reading' || this.state === 'connected') {
        this.lastPingSentAt = Date.now();
        // Ping packet compliant with Arduino sketch
        this.sendCommand({ device: 'kizomba', cmd: 'ping', t: this.lastPingSentAt });
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private resetNoDataWatchdog(): void {
    if (this.noDataTimer) clearTimeout(this.noDataTimer);
    this.noDataTimer = setTimeout(() => {
      if (this.state === 'reading' || this.state === 'connected') {
        this.metrics.lastHeartbeatStatus = 'timeout';
        this.notifyLog(
          'fault',
          `AVISO: Nenhuma leitura ou ping recebido nos últimos ${NO_DATA_TIMEOUT_MS / 1000}s. Verifique o cabo ou firmware da placa.`
        );
        this.notifyMetrics();
      }
    }, NO_DATA_TIMEOUT_MS);
  }

  // --- AUTO-RECONNECT WITH PROGRESSIVE BACKOFF ---

  private startAutoReconnect(reason: string): void {
    if (this.isIntentionalDisconnect || !this.config.autoReconnect) {
      this.notifyLog('system', 'Reconexão automática suprimida (desconexão intencional ou desativada).');
      return;
    }

    this.reconnectAttempt++;
    this.metrics.reconnectCount++;

    if (this.reconnectAttempt > MAX_FAST_RECONNECT_ATTEMPTS) {
      this.setState('waitingForDevice');
      this.notifyLog(
        'system',
        'Limite de tentativas imediatas atingido. Aguardando conexão do barramento USB ou reconexão manual.'
      );
      // Keep slow background check every 30s
      this.scheduleReconnect(30000);
      return;
    }

    const delayIndex = Math.min(this.reconnectAttempt - 1, BACKOFF_DELAYS.length - 1);
    const delayMs = BACKOFF_DELAYS[delayIndex];

    this.setState('reconnecting');
    this.notifyLog(
      'system',
      `[Reconexão ${this.reconnectAttempt}/${MAX_FAST_RECONNECT_ATTEMPTS}] Tentando restabelecer conexão em ${delayMs / 1000}s... (${reason})`
    );

    this.scheduleReconnect(delayMs);
  }

  private scheduleReconnect(delayMs: number): void {
    this.clearTimers();
    let secondsLeft = Math.ceil(delayMs / 1000);
    this.nextReconnectInSec = secondsLeft;
    this.notifyMetrics();

    this.countdownTimer = setInterval(() => {
      secondsLeft--;
      this.nextReconnectInSec = Math.max(0, secondsLeft);
      this.notifyMetrics();
      if (secondsLeft <= 0) {
        clearInterval(this.countdownTimer);
        this.countdownTimer = null;
      }
    }, 1000);

    this.reconnectTimer = setTimeout(async () => {
      this.nextReconnectInSec = null;
      this.notifyMetrics();
      const ok = await this.connectSavedDevice();
      if (!ok && this.state !== 'connected' && this.state !== 'reading') {
        this.startAutoReconnect('Falha na tentativa anterior');
      }
    }, delayMs);
  }

  public async reconnectNow(): Promise<boolean> {
    this.clearTimers();
    this.isIntentionalDisconnect = false;
    this.reconnectAttempt = 0;
    this.nextReconnectInSec = null;
    this.notifyLog('system', 'Solicitação manual de reconexão imediata.');
    return await this.connectSavedDevice();
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
      this.countdownTimer = null;
    }
    if (this.noDataTimer) {
      clearTimeout(this.noDataTimer);
      this.noDataTimer = null;
    }
  }

  // --- DISCONNECT / CLOSE CONNECTION ---

  /**
   * Idempotent, safe connection close routine.
   * Guarantees all locks (reader, writer) are strictly released in finally blocks.
   */
  public async closeConnection(isIntentional = true): Promise<void> {
    if (this.isClosing) return;
    this.isClosing = true;

    if (isIntentional) {
      this.isIntentionalDisconnect = true;
      this.clearTimers();
      this.reconnectAttempt = 0;
      this.nextReconnectInSec = null;
    }

    this.stopHeartbeat();
    this.sessionToken = 0; // Invalidate any running read loop immediately

    try {
      // 1. Cancel Reader
      if (this.reader) {
        try {
          await this.reader.cancel();
        } catch (e) {
          // Ignore abort errors
        } finally {
          try {
            this.reader.releaseLock();
          } catch (e) {}
          this.reader = null;
        }
      }

      // 2. Release Writer
      if (this.writer) {
        try {
          this.writer.releaseLock();
        } catch (e) {}
        this.writer = null;
      }

      // 3. Close Port
      if (this.port) {
        try {
          await this.port.close();
        } catch (e) {
          console.warn('[UsbSerialManager] Erro ao fechar porta:', e);
        }
        this.port = null;
      }

      this.metrics.activePortInfo = null;
      this.setState(isIntentional ? 'intentionalDisconnect' : 'disconnected');
      this.notifyLog(
        'system',
        isIntentional ? 'Barramento USB desconectado pelo operador.' : 'Barramento USB liberado.'
      );
    } catch (err: any) {
      console.error('[UsbSerialManager] Exceção em closeConnection:', err);
      this.setState('error');
    } finally {
      this.isClosing = false;
      this.notifyMetrics();
    }
  }

  /**
   * Test communication with a PING packet.
   */
  public async testCommunication(): Promise<boolean> {
    this.notifyLog('system', 'Enviando teste de comunicação (PING) ao barramento...');
    const now = Date.now();
    this.lastPingSentAt = now;
    return await this.sendCommand({
      device: 'kizomba',
      cmd: 'ping',
      test: true,
      timestamp: now,
    });
  }
}

// Export singleton instance
export const usbSerialManager = UsbSerialManager.getInstance();
