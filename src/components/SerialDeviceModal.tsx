import React, { useState, useEffect } from 'react';
import {
  Usb,
  X,
  RefreshCw,
  Power,
  Trash2,
  Send,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Settings2,
  HelpCircle,
  ExternalLink,
  Zap,
  Info,
} from 'lucide-react';
import {
  UsbSerialConnectionState,
  UsbDeviceConfig,
  SerialDiagnosticsMetrics,
} from '../types';
import { usbSerialManager } from '../services/usbSerialManager';

interface SerialDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentState: UsbSerialConnectionState;
  metrics: SerialDiagnosticsMetrics;
  onOpenArduinoBridge: () => void;
}

export const SerialDeviceModal: React.FC<SerialDeviceModalProps> = ({
  isOpen,
  onClose,
  currentState,
  metrics,
  onOpenArduinoBridge,
}) => {
  const [config, setConfig] = useState<UsbDeviceConfig>(usbSerialManager.getConfig());
  const [baudRate, setBaudRate] = useState<number>(config.baudRate || 115200);
  const [autoReconnect, setAutoReconnect] = useState<boolean>(config.autoReconnect ?? true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'failed' | null>(null);

  useEffect(() => {
    if (isOpen) {
      const current = usbSerialManager.getConfig();
      setConfig(current);
      setBaudRate(current.baudRate);
      setAutoReconnect(current.autoReconnect);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPort = async () => {
    usbSerialManager.updateConfig({ baudRate, autoReconnect });
    await usbSerialManager.requestAndConnect(baudRate);
  };

  const handleReconnect = async () => {
    await usbSerialManager.reconnectNow();
  };

  const handleDisconnect = async () => {
    await usbSerialManager.closeConnection(true);
  };

  const handleForgetDevice = () => {
    usbSerialManager.forgetSavedDevice();
    setConfig(usbSerialManager.getConfig());
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    usbSerialManager.updateConfig({
      baudRate,
      autoReconnect,
    });
    setConfig(usbSerialManager.getConfig());
  };

  const handleTestCommunication = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const ok = await usbSerialManager.testCommunication();
      setTestResult(ok ? 'success' : 'failed');
    } catch {
      setTestResult('failed');
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestResult(null), 5000);
    }
  };

  const isConnected = currentState === 'connected' || currentState === 'reading';
  const isConnecting = currentState === 'connecting' || currentState === 'requestingPermission';
  const isReconnecting = currentState === 'reconnecting';
  const isWaiting = currentState === 'waitingForDevice';

  const formatHex = (val?: number) => (val ? `0x${val.toString(16).toUpperCase()}` : 'Nenhum');

  return (
    <div
      id="serialDeviceModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div
              className={`p-2.5 rounded-2xl border ${
                isConnected
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : isReconnecting || isWaiting
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse'
                  : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
              }`}
            >
              <Usb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Gerenciador de Barramento USB / Serial
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Web Serial API • Reconexão Automática & Recuperação de Porta
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {/* Status Banner */}
          <div
            className={`p-4 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : isReconnecting
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                : isWaiting
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : currentState === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-slate-900/60 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                  isConnected
                    ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : isReconnecting
                    ? 'bg-cyan-400 animate-spin'
                    : isWaiting
                    ? 'bg-amber-400 animate-pulse'
                    : currentState === 'error'
                    ? 'bg-rose-500'
                    : 'bg-slate-600'
                }`}
              />
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <span>
                    {isConnected
                      ? 'USB Conectado & Operacional'
                      : isReconnecting
                      ? `Reconectando automaticamente... (${metrics.nextReconnectInSec ?? 0}s)`
                      : isWaiting
                      ? 'Aguardando o último barramento USB'
                      : currentState === 'connecting'
                      ? 'Abrindo porta serial...'
                      : currentState === 'requestingPermission'
                      ? 'Aguardando seleção do usuário...'
                      : currentState === 'busy'
                      ? 'Porta ocupada por outro processo'
                      : currentState === 'unauthorized'
                      ? 'Permissão Web Serial negada'
                      : currentState === 'intentionalDisconnect'
                      ? 'Desconectado manualmente'
                      : 'Barramento Desconectado'}
                  </span>
                </div>
                <div className="text-[11px] opacity-80 font-mono mt-0.5">
                  Estado interno: <span className="font-bold">{currentState}</span>
                  {metrics.lastErrorText && ` • Erro: ${metrics.lastErrorText}`}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {isConnected ? (
                <button
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>Desconectar</span>
                </button>
              ) : (
                <button
                  onClick={handleReconnect}
                  disabled={isConnecting || isReconnecting}
                  className="px-3.5 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                  <span>Reconectar Agora</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleSelectPort}
              className="p-4 rounded-3xl bg-slate-900/80 hover:bg-slate-800 border border-cyan-500/30 hover:border-cyan-500/60 transition-all flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20">
                  <Usb className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-100 text-xs">Selecionar Barramento USB</div>
                  <div className="text-[10px] text-slate-400">Solicitar porta COM / ttyUSB ao navegador</div>
                </div>
              </div>
            </button>

            <button
              onClick={handleTestCommunication}
              disabled={!isConnected || isTesting}
              className={`p-4 rounded-3xl border transition-all flex items-center justify-between cursor-pointer group ${
                isConnected
                  ? 'bg-slate-900/80 hover:bg-slate-800 border-indigo-500/30 hover:border-indigo-500/60'
                  : 'bg-slate-950/40 border-slate-900 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3 text-left">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20">
                  <Zap className={`w-5 h-5 ${isTesting ? 'animate-bounce' : ''}`} />
                </div>
                <div>
                  <div className="font-bold text-slate-100 text-xs flex items-center gap-1.5">
                    <span>Testar Comunicação</span>
                    {testResult === 'success' && (
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    )}
                    {testResult === 'failed' && (
                      <span className="text-[10px] text-rose-400 font-bold flex items-center gap-0.5">
                        <AlertTriangle className="w-3 h-3" /> Falha
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">Envia pacote de PING ao barramento RS485</div>
                </div>
              </div>
            </button>
          </div>

          {/* Device Profile & Memory */}
          <div className="glass-panel rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2 text-white font-bold">
                <Settings2 className="w-4 h-4 text-cyan-400" />
                <span>Identificação do Dispositivo Memorizado</span>
              </div>

              {config.usbVendorId && (
                <button
                  onClick={handleForgetDevice}
                  className="px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer"
                  title="Remove o vínculo de identificação do último dispositivo"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Esquecer Dispositivo</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Vendor ID (VID)</span>
                <span className="font-mono text-white font-bold">{formatHex(config.usbVendorId)}</span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Product ID (PID)</span>
                <span className="font-mono text-white font-bold">{formatHex(config.usbProductId)}</span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Taxa de Transmissão</span>
                <span className="font-mono text-cyan-400 font-bold">{config.baudRate} bps</span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Formato de Dados</span>
                <span className="font-mono text-slate-300 font-bold">8N1 (Padrão)</span>
              </div>
            </div>

            <form onSubmit={handleSaveSettings} className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="text-slate-300 font-semibold block text-xs">
                    Velocidade do Barramento (Baud Rate)
                  </label>
                  <p className="text-[10px] text-slate-500">
                    Deve coincidir com a configuração Serial.begin() do Arduino / ESP32.
                  </p>
                </div>
                <select
                  value={baudRate}
                  onChange={(e) => setBaudRate(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                >
                  <option value={9600}>9600 bps</option>
                  <option value={19200}>19200 bps</option>
                  <option value={38400}>38400 bps</option>
                  <option value={57600}>57600 bps</option>
                  <option value={115200}>115200 bps (Recomendado)</option>
                  <option value={230400}>230400 bps</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                <div>
                  <span className="text-slate-300 font-semibold block text-xs">
                    Reconexão Automática (Auto-Reconnect)
                  </span>
                  <p className="text-[10px] text-slate-500">
                    Tenta reabrir automaticamente a porta em caso de queda involuntária ou reinício de cabo.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={autoReconnect}
                  onChange={(e) => setAutoReconnect(e.target.checked)}
                  className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Salvar Preferências
                </button>
              </div>
            </form>
          </div>

          {/* Operational Metrics */}
          <div className="glass-panel rounded-3xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-white font-bold border-b border-slate-800/80 pb-2.5">
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Métricas de Telemetria e Diagnóstico UART</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Pacotes Válidos</span>
                <span className="font-mono text-emerald-400 font-bold text-sm">
                  {metrics.totalPacketsReceived}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Pacotes Inválidos</span>
                <span className="font-mono text-amber-400 font-bold text-sm">
                  {metrics.totalPacketsInvalid}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Quedas / Reconexões</span>
                <span className="font-mono text-cyan-400 font-bold text-sm">
                  {metrics.reconnectCount}
                </span>
              </div>
              <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Latência Ping</span>
                <span className="font-mono text-indigo-400 font-bold text-sm">
                  {metrics.lastLatencyMs !== null ? `${metrics.lastLatencyMs} ms` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Chrome Web Serial Diagnostics Hint */}
          <div className="p-4 rounded-3xl bg-slate-900/40 border border-slate-800 flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1 text-slate-400 leading-relaxed text-[11px]">
              <span className="font-semibold text-slate-200">Dica de Diagnóstico de Hardware:</span>
              <p>
                No Google Chrome e Microsoft Edge, digite{' '}
                <code className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono">
                  chrome://device-log
                </code>{' '}
                na barra de endereços para inspecionar eventos de nível de sistema operacional (plug/unplug do cabo USB, erros de kernel e suspensão de portas).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
