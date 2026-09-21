import React from 'react';
import {
  Droplets,
  Activity,
  Volume2,
  VolumeX,
  FileText,
  LineChart,
  Terminal,
  ShieldCheck,
  ShieldAlert,
  Radio,
  Clock,
  LogOut,
  User,
  Settings,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { SystemData, CondominiumMetrics, AuthUser, SyncOverview } from '../types';

interface HeaderProps {
  system: SystemData;
  metrics: CondominiumMetrics;
  currentUser: AuthUser;
  syncOverview?: SyncOverview;
  onOpenSyncModal?: () => void;
  onToggleAudio: () => void;
  onOpenDiagnostics: () => void;
  onOpenAnalytics: () => void;
  onOpenReport: () => void;
  onOpenUsers?: () => void;
  onOpenArduinoBridge?: () => void;
  onOpenMobileExperience?: () => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  system,
  metrics,
  currentUser,
  syncOverview,
  onOpenSyncModal,
  onToggleAudio,
  onOpenDiagnostics,
  onOpenAnalytics,
  onOpenReport,
  onOpenUsers,
  onOpenArduinoBridge,
  onOpenMobileExperience,
  onLogout,
  activeTab,
  setActiveTab,
}) => {
  const isHardwareConnected =
    system.isSerialConnected ||
    system.nodes.node1.status === 'online' ||
    system.nodes.node2.status === 'online' ||
    system.nodes.node3.status === 'online';

  return (
    <header id="main-app-header" className="sticky top-0 z-30 bg-[#020617]/90 backdrop-blur-2xl border-b border-slate-800/80 px-4 lg:px-8 py-3.5 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3.5 max-w-[1920px] mx-auto">
        {/* Left branding & title */}
        <div className="flex items-center justify-between lg:justify-start gap-3.5">
          <div className="flex items-center gap-3.5">
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-[#081b36] shadow-lg shadow-cyan-950/40 text-white font-bold border border-cyan-400/30 p-1">
              <img src="/icon.svg" alt="Hossidev Logo" className="w-full h-full object-contain" />
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#020617] ${
                  isHardwareConnected
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                  <span className="text-cyan-400 font-extrabold tracking-tight">Hossidev</span> Water Monitor
                </h1>
                <span
                  className={`text-[10px] uppercase tracking-widest font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                    isHardwareConnected
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                  title={isHardwareConnected ? 'Placas de telemetria conectadas e transmitindo dados' : 'Aguardando sinal das placas de aquisição ou cabo Serial USB'}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isHardwareConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
                  {isHardwareConnected ? 'PLACAS ONLINE' : 'PLACAS AGUARDANDO'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block">
                Condomínio Kizomba • Central SCADA 100% Real
              </p>
            </div>
          </div>

          {/* Mobile Quick Status Badge */}
          <div className="lg:hidden flex items-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border ${
                isHardwareConnected
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isHardwareConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
              {isHardwareConnected ? 'Placas OK' : 'Aguardando Placas'}
            </span>
          </div>
        </div>

        {/* Center Quick Metrics Strip (Real Data Summary) */}
        <div className="hidden xl:flex items-center gap-4 bg-slate-900/50 border border-slate-800/90 rounded-2xl px-5 py-2 backdrop-blur-md shadow-sm">
          <div className="flex items-center gap-2.5 pr-4 border-r border-slate-800">
            <Radio className="w-4 h-4 text-cyan-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Reserva Real</div>
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5 font-mono">
                {metrics.currentTotalLiters > 0 || metrics.totalPercentage > 0 ? (
                  <>
                    <span className="text-cyan-400 font-extrabold">{metrics.totalPercentage.toFixed(0)}%</span>
                    {metrics.totalCapacityLiters > 0 ? (
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({(metrics.currentTotalLiters / 1000).toFixed(1)}k / {(metrics.totalCapacityLiters / 1000).toFixed(0)}k L)
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-normal">
                        (Modo %)
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-amber-400 text-[11px] font-semibold">AGUARDANDO CONEXÃO</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pr-4 border-r border-slate-800">
            <Clock className="w-4 h-4 text-emerald-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Autonomia Real</div>
              <div className="text-xs font-bold text-emerald-400 font-mono">
                {metrics.currentTotalLiters > 0 ? `~${metrics.estimatedAutonomyHours.toFixed(1)} Horas` : 'Sem leitura'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pr-4 border-r border-slate-800">
            <Activity className="w-4 h-4 text-sky-400" />
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Bombas Reais</div>
              <div className="text-xs font-bold font-mono">
                <span className={metrics.activePumps > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                  {metrics.activePumps} / 6 ativas
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {metrics.totalFaultySensors > 0 ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            )}
            <div className="text-left">
              <div className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Sensores Físicos</div>
              <div className="text-xs font-bold">
                {metrics.totalFaultySensors > 0 ? (
                  <span className="text-rose-400 font-mono">{metrics.totalFaultySensors} Prova(s) c/ falha</span>
                ) : (
                  <span className="text-emerald-400 font-mono">100% OK</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Actions & User Profile */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
          {/* Navigation tabs */}
          <div className="flex items-center bg-slate-900/60 p-1 rounded-2xl border border-slate-800">
            <button
              id="tab-overview-btn"
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Droplets className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">SCADA</span>
            </button>
            <button
              id="tab-analytics-btn"
              onClick={onOpenAnalytics}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-400 hover:text-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <LineChart className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Histórico</span>
            </button>
          </div>

          {/* Offline-First Sync Center Button */}
          {syncOverview && onOpenSyncModal && (
            <button
              id="header-sync-status-btn"
              onClick={onOpenSyncModal}
              className={`px-3 py-1.5 rounded-2xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
                syncOverview.state === 'sincronizando'
                  ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-cyan-950/40 animate-pulse'
                  : syncOverview.state === 'erro'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-rose-950/40'
                  : syncOverview.state === 'servidorIndisponivel'
                  ? 'bg-amber-600/15 border-amber-600/40 text-amber-300'
                  : syncOverview.state === 'offline' || !syncOverview.isOnline
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-amber-950/40'
                  : syncOverview.pendingCount > 0
                  ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              }`}
              title="Central de Sincronização & Persistência Offline (IndexedDB)"
            >
              {syncOverview.state === 'sincronizando' ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : syncOverview.state === 'erro' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              ) : syncOverview.state === 'offline' || !syncOverview.isOnline || syncOverview.state === 'servidorIndisponivel' ? (
                <WifiOff className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Database className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="hidden sm:inline">
                {syncOverview.state === 'sincronizando'
                  ? 'Sincronizando'
                  : syncOverview.state === 'erro'
                  ? 'Erro Sinc.'
                  : syncOverview.state === 'servidorIndisponivel'
                  ? 'Servidor Indisp.'
                  : syncOverview.state === 'offline' || !syncOverview.isOnline
                  ? 'Modo Offline'
                  : syncOverview.pendingCount > 0
                  ? `${syncOverview.pendingCount} pendente(s)`
                  : 'Sincronizado'}
              </span>
              {syncOverview.pendingCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-400 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                  {syncOverview.pendingCount}
                </span>
              )}
            </button>
          )}

          {/* Admin Settings & User Management */}
          {currentUser.role === 'admin' && onOpenUsers && (
            <button
              id="open-settings-btn"
              onClick={onOpenUsers}
              className="px-3.5 py-2 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-950/40"
              title="Definições do Sistema, Gestão de Usuários e Backup Completo"
            >
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">Definições</span>
            </button>
          )}

          {/* Audio Alarm Toggle */}
          <button
            id="audio-alarm-toggle-btn"
            onClick={onToggleAudio}
            className={`p-2.5 rounded-2xl border text-xs transition-all cursor-pointer ${
              system.audioAlarmEnabled
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20'
                : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/60'
            }`}
            title={system.audioAlarmEnabled ? 'Silenciar alertas sonoros' : 'Ativar alertas sonoros'}
          >
            {system.audioAlarmEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Diagnostics Terminal */}
          <button
            id="open-terminal-btn"
            onClick={onOpenDiagnostics}
            className="p-2.5 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-cyan-400 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Abrir terminal de telemetria serial"
          >
            <Terminal className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Logs</span>
          </button>

          {/* Condominium Report */}
          <button
            id="open-report-btn"
            onClick={onOpenReport}
            className="px-3 py-2 rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-300 hover:bg-slate-800/60 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            title="Gerar Relatório Técnico"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden md:inline">Relatório</span>
          </button>

          {/* User Profile Pill & Logout */}
          <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/80 border border-slate-800"
              title={`Logado como: ${currentUser.name} (${currentUser.role === 'admin' ? 'Administrador' : 'Usuário'})`}
            >
              <div
                className={`p-1.5 rounded-xl ${
                  currentUser.role === 'admin'
                    ? 'bg-cyan-500/20 text-cyan-300'
                    : 'bg-indigo-500/20 text-indigo-300'
                }`}
              >
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col text-left hidden sm:flex">
                <span className="text-xs font-bold text-white max-w-[100px] truncate">
                  {currentUser.username}
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {currentUser.role === 'admin' ? 'Admin' : 'Operador'}
                </span>
              </div>
            </div>

            <button
              id="logout-btn"
              onClick={onLogout}
              className="p-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 transition-colors cursor-pointer"
              title="Sair da Conta (Logout)"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
