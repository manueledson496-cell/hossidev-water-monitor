import React from 'react';
import {
  Usb,
  Cpu,
  Activity,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Shield,
  Zap,
  Power,
  HardDrive,
  ExternalLink,
  Wifi,
  Radio,
  Lock,
  CheckCircle2,
  Settings2,
} from 'lucide-react';
import { SystemData, NodeStatus, AuthUser, UsbSerialConnectionState } from '../types';

interface SidebarProps {
  system: SystemData;
  currentUser: AuthUser;
  serialState?: UsbSerialConnectionState;
  reconnectCount?: number;
  nextReconnectInSec?: number | null;
  onConnectSerial: () => void;
  onDisconnectSerial: () => void;
  onReconnectLastSerial?: () => void;
  onOpenSerialDeviceModal?: () => void;
  onOpenDiagnostics: () => void;
  onToggleEmergencyStop: () => void;
  onResetStats: () => void;
  onOpenArduinoBridge: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  system,
  currentUser,
  serialState = 'idle',
  reconnectCount = 0,
  nextReconnectInSec = null,
  onConnectSerial,
  onDisconnectSerial,
  onReconnectLastSerial,
  onOpenSerialDeviceModal,
  onOpenDiagnostics,
  onToggleEmergencyStop,
  onResetStats,
  onOpenArduinoBridge,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const permittedIds = currentUser.permittedTankIds || [];

  const isConnected = serialState === 'connected' || serialState === 'reading' || system.isSerialConnected;
  const isReconnecting = serialState === 'reconnecting';
  const isWaiting = serialState === 'waitingForDevice';
  const isBusy = serialState === 'busy';
  const isError = serialState === 'error';

  const formatUptime = (seconds: number) => {
    const hrs = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const renderNodeCard = (node: NodeStatus) => {
    const isOnline = node.status === 'online';
    const badgeId = `node${node.id}Badge`;

    return (
      <div
        key={node.id}
        id={`node-status-card-${node.id}`}
        className={`p-3.5 rounded-2xl border transition-all ${
          isOnline
            ? 'glass-panel border-cyan-500/30 shadow-md shadow-cyan-950/20'
            : 'bg-slate-950/60 border-slate-900 opacity-60'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isOnline ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-bold text-slate-100">{node.name}</span>
          </div>
          <span
            id={badgeId}
            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border badge-status ${
              isOnline
                ? 'badge-online bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'badge-offline bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        <div className="text-[11px] text-slate-400 font-medium mb-2 truncate">
          {node.role}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[10px]">
          <div className="flex flex-col">
            <span className="text-slate-500 uppercase tracking-wider font-semibold text-[9px]">Barramento</span>
            <span className="font-mono text-slate-200 font-semibold">{node.busPort}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-500 uppercase tracking-wider font-semibold text-[9px]">Pacotes</span>
            <span className="font-mono text-cyan-400 font-semibold">{node.packetCount || 0}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <aside
      id="desktop-scada-sidebar"
      className="w-full lg:w-[330px] flex-shrink-0 bg-[#020617] border-r border-slate-800/80 flex flex-col p-4 lg:p-6 gap-4 overflow-y-auto"
    >
      {/* Serial Hardware Connection Block (Admin Only vs Standard User Informative) */}
      {isAdmin ? (
        <div className="glass-panel rounded-3xl p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl border ${
                  isConnected
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : isReconnecting || isWaiting
                    ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse'
                    : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'
                }`}
              >
                <Usb className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Barramento USB</span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                      isConnected
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : isReconnecting
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse'
                        : isWaiting
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : isBusy
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                        : isError
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {isConnected
                      ? 'CONECTADO'
                      : isReconnecting
                      ? `RECONECTANDO (${nextReconnectInSec ?? 0}s)`
                      : isWaiting
                      ? 'AGUARDANDO CABO'
                      : isBusy
                      ? 'OCUPADO'
                      : isError
                      ? 'FALHA USB'
                      : 'OFFLINE'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">115.200 bps (Web Serial API)</div>
              </div>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                  : isReconnecting
                  ? 'bg-cyan-400 animate-ping'
                  : isWaiting
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-700'
              }`}
            />
          </div>

          {!isConnected ? (
            <div className="flex flex-col gap-2">
              <button
                id="btnConnect"
                onClick={onConnectSerial}
                className="w-full py-2.5 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Usb className="w-4 h-4" />
                <span>Selecionar Barramento USB</span>
              </button>

              {onReconnectLastSerial && (
                <button
                  id="btnReconnectLast"
                  onClick={onReconnectLastSerial}
                  className="w-full py-2 px-3 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                  title="Tentar reconectar automaticamente ao último dispositivo USB memorizado"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
                  <span>Reconectar Último Barramento</span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 mt-0.5">
                {onOpenSerialDeviceModal && (
                  <button
                    onClick={onOpenSerialDeviceModal}
                    className="py-1.5 px-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-[10px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                    title="Configurações e parâmetros avançados de porta serial"
                  >
                    <Settings2 className="w-3 h-3 text-cyan-400" />
                    <span>Dispositivo</span>
                  </button>
                )}
                <button
                  onClick={onOpenArduinoBridge}
                  className="py-1.5 px-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-cyan-400 text-[10px] font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Wifi className="w-3 h-3" />
                  <span>Ingestão</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                id="btnDisconnect"
                onClick={onDisconnectSerial}
                className="w-full py-2.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Power className="w-4 h-4" />
                <span>Desconectar Porta USB</span>
              </button>

              {onOpenSerialDeviceModal && (
                <button
                  onClick={onOpenSerialDeviceModal}
                  className="w-full py-1.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 text-[10px] font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Settings2 className="w-3 h-3 text-cyan-400" />
                  <span>Configurações & Diagnóstico USB</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Standard User Real-Time Telemetry & Authorization Banner */
        <div className="glass-panel rounded-3xl p-4 shadow-sm flex flex-col gap-2.5 border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                  <span>Recepção Centralizada</span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 rounded">
                    OPERADOR
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium">Sincronização em tempo real</div>
              </div>
            </div>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                system.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-700'
              }`}
            />
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            O barramento serial de hardware é gerenciado pelo Administrador. Você visualiza automaticamente as leituras e volumes dos seus reservatórios autorizados.
          </p>

          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1.5">
              Seus Reservatórios Autorizados:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {permittedIds.length > 0 ? (
                permittedIds.map((tid) => (
                  <span
                    key={tid}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-2.5 h-2.5 text-cyan-400" />
                    <span>Tanque #{tid}</span>
                  </span>
                ))
              ) : (
                <span className="text-[10px] text-amber-400 font-mono">Aguardando liberação pelo Administrador</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Nodes Status Section (3 Microcontrollers) */}
      <div className="glass-panel rounded-3xl p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Topologia dos 3 Nós (MCUs)</span>
          </span>
          <span className="text-[10px] text-cyan-400 font-mono font-semibold">RS485 Bus</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {renderNodeCard(system.nodes.node1)}
          {renderNodeCard(system.nodes.node2)}
          {renderNodeCard(system.nodes.node3)}
        </div>
      </div>

      {/* Telemetry Metrics Card (Bento Tile) */}
      <div className="glass-panel rounded-3xl p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span>Telemetria em Tempo Real</span>
          </span>
          {isAdmin && (
            <button
              onClick={onResetStats}
              title="Zerar contadores de pacotes"
              className="text-[10px] text-slate-500 hover:text-cyan-400 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        <div className="space-y-2.5 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Pacotes Recebidos:</span>
            <span id="totalRx" className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-lg border border-cyan-500/20">
              {system.totalPackets.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Uptime do Servidor:</span>
            <span id="uptimeLabel" className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
              {formatUptime(system.uptime)}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Sensores Danificados:</span>
            <span
              id="totalFaultySensors"
              className={`font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                system.globalFaultCount > 0
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700'
              }`}
            >
              {system.globalFaultCount}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-400">Watchdog de Conexão:</span>
            <span className="text-slate-400 font-mono text-[11px]">8.0s Watchdog</span>
          </div>
        </div>
      </div>

      {/* Emergency Lockout Safeguard Control (Bento Tile) */}
      <div className="glass-panel border-rose-500/20 rounded-3xl p-4 shadow-sm flex flex-col gap-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-rose-400 uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          <span>Intertravamento de Segurança</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          {system.emergencyLockout
            ? '🚨 PARADA DE EMERGÊNCIA ATIVA: Todas as bombas foram desarmadas na central.'
            : 'Proteção ativa. Em caso de sensor rompido, a bomba respectiva desliga imediatamente.'}
        </p>

        {isAdmin ? (
          <button
            id="emergency-lockout-btn"
            onClick={onToggleEmergencyStop}
            className={`w-full py-2.5 px-3 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
              system.emergencyLockout
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{system.emergencyLockout ? 'Reativar Bombas do Condomínio' : 'Desarme Preventivo de Todas as Bombas'}</span>
          </button>
        ) : (
          <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
            <span>Desarme geral exclusivo do Administrador</span>
          </div>
        )}
      </div>

      {/* Footer Info & Telemetry Log Shortcut */}
      <div className="mt-auto pt-2 flex flex-col gap-2.5">
        <button
          id="sidebar-diag-btn"
          onClick={onOpenDiagnostics}
          className="w-full py-2.5 px-3 rounded-2xl bg-slate-900/40 hover:bg-slate-800/60 border border-slate-800 text-cyan-300 hover:text-cyan-200 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Abrir Log Serial / JSON</span>
        </button>

        <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-1.5">
          <HardDrive className="w-3 h-3" />
          <span>Condomínio Kizomba • Central SCADA Real</span>
        </div>
      </div>
    </aside>
  );
};
