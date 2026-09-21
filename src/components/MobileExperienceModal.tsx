import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  LayoutGrid,
  Bell,
  Download,
  Check,
  X,
  Share2,
  PlusSquare,
  Radio,
  Sliders,
  ExternalLink,
  Copy,
  Layers,
  Sparkles,
  Info,
  ShieldCheck,
  ChevronRight,
  Activity,
  Droplets,
  Volume2,
} from 'lucide-react';
import { SystemData, TankData, CondominiumMetrics } from '../types';
import { notificationService } from '../services/notificationService';

interface MobileExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  system: SystemData;
  tanks: TankData[];
  metrics: CondominiumMetrics;
  deferredPrompt?: any;
  onInstallPwa?: () => void;
}

export const MobileExperienceModal: React.FC<MobileExperienceModalProps> = ({
  isOpen,
  onClose,
  system,
  tanks,
  metrics,
  deferredPrompt,
  onInstallPwa,
}) => {
  const [activeTab, setActiveTab] = useState<'widgets' | 'notifications' | 'install' | 'code'>('widgets');
  const [selectedWidgetSize, setSelectedWidgetSize] = useState<'2x2' | '4x2'>('2x2');
  const [selectedTankId, setSelectedTankId] = useState<number>(1);
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [testNotifSending, setTestNotifSending] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [osPreview, setOsPreview] = useState<'android' | 'ios'>('android');

  const currentTank = tanks.find((t) => t.id === selectedTankId) || tanks[0] || {
    id: 1,
    name: 'Tanque FW1 (Tratada)',
    level: 78,
    currentLiters: 15600,
    capacityLiters: 20000,
    pump: 1,
  };
  const currentTankLevel = currentTank.level ?? 78;
  const overallPercentage = Math.round(metrics.totalPercentage || 78);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeKey(key);
    setTimeout(() => setCopiedCodeKey(null), 2500);
  };

  const handleSendTestNotification = async (type: 'status' | 'critical' | 'pump') => {
    setTestNotifSending(true);
    setNotifFeedback(null);

    let title = 'Hossidev - Nível Normal';
    let body = `${currentTank.name} está estável em ${currentTankLevel}% (${currentTank.currentLiters.toLocaleString()} L).`;
    let isCrit = false;

    if (type === 'critical') {
      title = '⚠️ ALERTA CRÍTICO: Nível Baixo de Água';
      body = `Reservatório ${currentTank.name} atingiu nível crítico (${currentTankLevel}%). Risco de desabastecimento!`;
      isCrit = true;
    } else if (type === 'pump') {
      title = '⚡ Bomba de Recalque Acionada';
      body = `Bomba de enchimento ligada para equilibrar o nível do ${currentTank.name}.`;
    }

    try {
      await notificationService.showSystemNotification({
        title,
        body,
        level: currentTankLevel,
        tankName: currentTank.name,
        isCritical: isCrit,
      });

      setNotifFeedback({
        type: 'success',
        message: 'Notificação rica disparada com sucesso com o Ícone Oficial da Hossidev!',
      });
    } catch (err: any) {
      setNotifFeedback({
        type: 'error',
        message: err.message || 'Não foi possível disparar a notificação no dispositivo.',
      });
    } finally {
      setTestNotifSending(false);
    }
  };

  return (
    <div
      id="mobileExperienceModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal rounded-[2.5rem] w-full max-w-4xl overflow-hidden flex flex-col shadow-2xl border border-slate-800 max-h-[92vh]">
        {/* Header with Official Hossidev Icon */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#081b36] border border-cyan-500/30 p-1.5 flex items-center justify-center shadow-lg shadow-cyan-950/40">
              <img src="/icon.svg" alt="Ícone Oficial Hossidev" className="w-full h-full object-contain" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Experiência Mobile & Identidade Visual</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  HOSSIDEV
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Destaque no ecrã inicial, visualização compacta (2x2 / 4x2) e alertas no ecrã de bloqueio
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-800/60 bg-slate-950/40 overflow-x-auto">
          <button
            onClick={() => setActiveTab('widgets')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'widgets'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Painel de Ecrã Inicial (2x2 & 4x2)</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'notifications'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notificações & Ecrã de Bloqueio</span>
          </button>

          <button
            onClick={() => setActiveTab('install')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'install'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Adicionar ao Ecrã Principal (PWA)</span>
          </button>

          <button
            onClick={() => setActiveTab('code')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'code'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Código & Manifestos Nativos</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* TAB 1: WIDGETS DE ECRÃ INICIAL */}
          {activeTab === 'widgets' && (
            <div className="space-y-6">
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900/60 border border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
                    <button
                      onClick={() => setSelectedWidgetSize('2x2')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedWidgetSize === '2x2'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Formato 2x2 (Compacto)
                    </button>
                    <button
                      onClick={() => setSelectedWidgetSize('4x2')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        selectedWidgetSize === '4x2'
                          ? 'bg-cyan-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Formato 4x2 (Panorâmico)
                    </button>
                  </div>

                  <div className="flex rounded-2xl bg-slate-950 p-1 border border-slate-800">
                    <button
                      onClick={() => setOsPreview('android')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        osPreview === 'android' ? 'bg-slate-800 text-cyan-300' : 'text-slate-500'
                      }`}
                    >
                      Android 14+
                    </button>
                    <button
                      onClick={() => setOsPreview('ios')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        osPreview === 'ios' ? 'bg-slate-800 text-cyan-300' : 'text-slate-500'
                      }`}
                    >
                      iOS 17+
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Reservatório Alvo:</span>
                  <select
                    value={selectedTankId}
                    onChange={(e) => setSelectedTankId(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-300 text-xs font-bold focus:outline-none focus:border-cyan-500"
                  >
                    {tanks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.level ?? 0}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LIVE HOMESCREEN MOCKUP */}
              <div className="relative rounded-[2.5rem] bg-gradient-to-b from-[#0b1b36] via-[#050f20] to-[#020712] p-6 sm:p-8 border border-slate-800 shadow-2xl overflow-hidden">
                {/* Background Wallpapers simulation with modern dark ambient glow */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                {/* Smartphone Status Bar Mock */}
                <div className="flex items-center justify-between text-slate-400 text-xs font-mono mb-6 px-2">
                  <span className="font-bold text-white">09:41</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-800/40">
                      5G • 100%
                    </span>
                  </div>
                </div>

                {/* Widget Visual Representation */}
                <div className="flex justify-center items-center py-4">
                  {selectedWidgetSize === '2x2' ? (
                    /* WIDGET 2x2 */
                    <div className="w-64 h-64 rounded-[2rem] bg-[#071326]/90 backdrop-blur-xl border border-cyan-500/30 p-5 flex flex-col justify-between shadow-2xl shadow-cyan-950/60 relative overflow-hidden group transition-all hover:scale-[1.02]">
                      {/* Top Water Glow Wave */}
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

                      {/* Header with Hossidev Icon Badge */}
                      <div className="flex items-center justify-between z-10">
                        <div className="flex items-center gap-2">
                          <img
                            src="/icon.svg"
                            alt="Hossidev Brand"
                            className="w-6 h-6 object-contain rounded-lg drop-shadow"
                          />
                          <span className="text-[11px] font-extrabold tracking-wider text-cyan-300 font-mono">
                            HOSSIDEV
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-[9px] font-bold text-emerald-300">LIVE</span>
                        </div>
                      </div>

                      {/* Center Gauge & Percentage */}
                      <div className="my-auto z-10 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                            {currentTankLevel}%
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {currentTank.currentLiters.toLocaleString()} L
                          </span>
                        </div>

                        {/* Liquid Wave Bar */}
                        <div className="w-full h-3.5 rounded-full bg-slate-900 border border-slate-700/80 p-0.5 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-sky-400 transition-all duration-1000 relative shadow-sm shadow-cyan-400/50"
                            style={{ width: `${currentTankLevel}%` }}
                          >
                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                          </div>
                        </div>

                        <p className="text-[11px] font-bold text-slate-300 truncate">{currentTank.name}</p>
                      </div>

                      {/* Bottom Footer Status */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 z-10 text-[10px]">
                        <span className="text-slate-400">Capacidade: {currentTank.capacityLiters.toLocaleString()} L</span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md ${
                            currentTank.pump === 1
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {currentTank.pump === 1 ? 'Bomba Ligada' : 'Standby'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* WIDGET 4x2 */
                    <div className="w-full max-w-xl rounded-[2.2rem] bg-[#071326]/90 backdrop-blur-xl border border-cyan-500/30 p-5 sm:p-6 shadow-2xl shadow-cyan-950/60 relative overflow-hidden group transition-all hover:scale-[1.01] space-y-4">
                      {/* Header with Hossidev Logo */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src="/icon.svg"
                            alt="Hossidev Brand Icon"
                            className="w-8 h-8 object-contain rounded-xl drop-shadow"
                          />
                          <div>
                            <h4 className="text-xs font-black tracking-wider text-cyan-300 font-mono">
                              HOSSIDEV WATER SCADA
                            </h4>
                            <p className="text-[10px] text-slate-400">Condomínio Residencial Kizomba</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold font-mono text-white">{overallPercentage}%</span>
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            MÉDIA TOTAL
                          </span>
                        </div>
                      </div>

                      {/* 6 Tanks Graphic Bars */}
                      <div className="grid grid-cols-6 gap-2 pt-1">
                        {tanks.map((tank) => {
                          const lvl = tank.level ?? 0;
                          return (
                            <div
                              key={tank.id}
                              className={`p-2 rounded-2xl border flex flex-col items-center gap-1.5 transition-all ${
                                selectedTankId === tank.id
                                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                                  : 'bg-slate-900/60 border-slate-800 text-slate-400'
                              }`}
                            >
                              <span className="text-[10px] font-bold">T{tank.id}</span>
                              <div className="w-3.5 h-14 bg-slate-950 rounded-full border border-slate-700/80 p-0.5 flex flex-col justify-end overflow-hidden">
                                <div
                                  className="w-full rounded-full bg-gradient-to-t from-blue-600 via-cyan-500 to-sky-300 transition-all duration-700"
                                  style={{ height: `${lvl}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-mono font-bold text-white">
                                {lvl}%
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-800 text-slate-400">
                        <span>Autonomia Total: ~{metrics.estimatedAutonomyHours.toFixed(1)} Horas</span>
                        <span className="text-cyan-400 font-semibold flex items-center gap-1">
                          <span>Toque para abrir o SCADA</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Mock Homescreen App Icon Bar */}
                <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-around max-w-sm mx-auto">
                  <div className="flex flex-col items-center gap-1.5 group cursor-pointer">
                    <div className="w-13 h-13 rounded-2xl bg-[#081b36] border border-cyan-500/40 p-1.5 shadow-lg shadow-cyan-950/50 group-hover:scale-105 transition-transform">
                      <img src="/icon.svg" alt="Hossidev Água" className="w-full h-full object-contain" />
                    </div>
                    <span className="text-[11px] font-bold text-white tracking-tight">Hossidev Água</span>
                  </div>
                </div>
              </div>

              {/* Informative Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-cyan-400">
                    <Sparkles className="w-4 h-4" />
                    <span>Marca em Destaque</span>
                  </div>
                  <p className="text-slate-400">
                    O logotipo oficial da Hossidev permanece fixado no ecrã inicial promovendo a marca mesmo com o app
                    fechado.
                  </p>
                </div>

                <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <Activity className="w-4 h-4" />
                    <span>Sincronização Periódica</span>
                  </div>
                  <p className="text-slate-400">
                    Atualização em segundo plano a cada 15 min via `AppWidgetProvider` e `WidgetKit TimelineProvider`.
                  </p>
                </div>

                <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-indigo-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Deep Linking Direto</span>
                  </div>
                  <p className="text-slate-400">
                    Ao tocar em qualquer reservatório, o sistema abre instantaneamente no painel correspondente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICAÇÕES & ECRÃ DE BLOQUEIO */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              {/* Notification Sender Tester */}
              <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Bell className="w-4 h-4 text-cyan-400" />
                      <span>Testar Alertas Nativos no Ecrã de Bloqueio & Barra de Estado</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Dispare notificações reais para validar a exibição do ícone Hossidev na barra de status e tela de
                      bloqueio
                    </p>
                  </div>

                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                    STATUS: {notificationService.getPermissionStatus().toUpperCase()}
                  </span>
                </div>

                {notifFeedback && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs flex items-center gap-2 ${
                      notifFeedback.type === 'success'
                        ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                    }`}
                  >
                    {notifFeedback.type === 'success' ? (
                      <Check className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span>{notifFeedback.message}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => handleSendTestNotification('status')}
                    disabled={testNotifSending}
                    className="p-3 rounded-2xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    <span>Alerta de Nível Normal</span>
                  </button>

                  <button
                    onClick={() => handleSendTestNotification('critical')}
                    disabled={testNotifSending}
                    className="p-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-4 h-4 text-rose-400" />
                    <span>⚠️ Alerta Crítico (Nível Baixo)</span>
                  </button>

                  <button
                    onClick={() => handleSendTestNotification('pump')}
                    disabled={testNotifSending}
                    className="p-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span>Status de Bomba Ativa</span>
                  </button>
                </div>
              </div>

              {/* Lockscreen Notification Visual Preview */}
              <div className="p-6 rounded-3xl bg-gradient-to-b from-[#071326] to-[#020712] border border-slate-800 space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Pré-visualização do Alerta no Ecrã de Bloqueio (Lock Screen)
                </h4>

                <div className="max-w-md mx-auto p-4 rounded-3xl bg-slate-950/80 backdrop-blur-xl border border-cyan-500/30 shadow-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img src="/icon.svg" alt="Hossidev" className="w-5 h-5 rounded-md object-contain" />
                      <span className="text-xs font-extrabold text-cyan-300 font-mono tracking-tight">
                        HOSSIDEV ÁGUA
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">Agora</span>
                  </div>

                  <div className="pt-1">
                    <p className="text-xs font-bold text-white">⚠️ Alerta de Telemetria: Tanque FW1 (Tratada)</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Nível de água em 78% (15.600 L). Autonomia do condomínio calculada em 4.8 dias restantes.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[10px]">
                    <span className="px-2.5 py-1 rounded-xl bg-cyan-600 text-white font-bold">Abrir SCADA</span>
                    <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-slate-400 font-semibold">Silenciar</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ADICIONAR AO ECRÃ INICIAL (PWA) */}
          {activeTab === 'install' && (
            <div className="space-y-6">
              {/* Quick Install Action Banner */}
              <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-[#081b36] border-2 border-cyan-500/50 p-2 shadow-xl shadow-cyan-950/60 flex-shrink-0">
                    <img src="/icon.svg" alt="Hossidev Água" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      Instalar Hossidev no Ecrã Principal
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 max-w-md">
                      Fixe o aplicativo diretamente na gaveta de aplicativos e no ecrã inicial do seu smartphone para
                      acesso com 1 toque, suporte offline e notificações de alarme.
                    </p>
                  </div>
                </div>

                <button
                  onClick={onInstallPwa}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-extrabold shadow-lg shadow-cyan-950/60 transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Download className="w-4 h-4" />
                  <span>Adicionar ao Ecrã Inicial</span>
                </button>
              </div>

              {/* Step-by-Step OS Guides */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Android Chrome */}
                <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-cyan-300 text-sm">
                    <Smartphone className="w-4 h-4" />
                    <span>Android (Google Chrome / Edge / Samsung)</span>
                  </div>
                  <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                    <li>
                      Toque no botão <b>"Adicionar ao Ecrã Inicial"</b> acima ou nos 3 pontinhos do navegador (⋮).
                    </li>
                    <li>
                      Selecione <b>"Instalar aplicativo"</b> ou <b>"Adicionar à tela inicial"</b>.
                    </li>
                    <li>O ícone com cantos adaptativos ficará disponível na sua gaveta de aplicativos.</li>
                  </ol>
                </div>

                {/* iOS Safari */}
                <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center gap-2 font-bold text-indigo-300 text-sm">
                    <Share2 className="w-4 h-4" />
                    <span>Apple iOS (Safari no iPhone / iPad)</span>
                  </div>
                  <ol className="space-y-2 text-xs text-slate-300 list-decimal list-inside leading-relaxed">
                    <li>
                      Toque no botão de <b>Partilhar (Ícone de quadrado com seta para cima 📤)</b> na barra inferior do
                      Safari.
                    </li>
                    <li>
                      Role para baixo e selecione <b>"Ecrã Principal" (Add to Home Screen ➕)</b>.
                    </li>
                    <li>
                      Confirme com o nome <b>"Hossidev Água"</b> para fixar o ícone em alta definição.
                    </li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CÓDIGO DOS MANIFESTOS & CÓDIGO NATIVO */}
          {activeTab === 'code' && (
            <div className="space-y-5">
              <p className="text-xs text-slate-400">
                Arquivos de configuração prontos para compilação nativa no <b>Android Studio</b> (Kotlin),{' '}
                <b>Xcode</b> (Swift/WidgetKit) e <b>Web PWA</b>:
              </p>

              {/* File 1: manifest.json */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
                  <span className="font-mono text-cyan-300 font-bold">public/manifest.json (Web & PWA)</span>
                  <button
                    onClick={() =>
                      handleCopy(
                        'manifest',
                        JSON.stringify(
                          {
                            name: 'Hossidev - Controle de Nível de Água',
                            short_name: 'Hossidev Água',
                            start_url: '/',
                            display: 'standalone',
                            theme_color: '#070d19',
                            icons: [{ src: '/icon.svg', sizes: '512x512', purpose: 'any maskable' }],
                          },
                          null,
                          2
                        )
                      )
                    }
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {copiedCodeKey === 'manifest' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCodeKey === 'manifest' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {`{
  "name": "Hossidev - Controle de Nível de Água",
  "short_name": "Hossidev Água",
  "display": "standalone",
  "theme_color": "#070d19",
  "background_color": "#070d19",
  "icons": [
    { "src": "/icon.svg", "sizes": "192x192 512x512", "purpose": "any maskable" }
  ]
}`}
                </pre>
              </div>

              {/* File 2: Android WaterTankWidgetProvider.kt */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
                  <span className="font-mono text-cyan-300 font-bold">
                    android/.../WaterTankWidgetProvider.kt (Android Widget)
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        'android_widget',
                        `class WaterTankWidgetProvider : AppWidgetProvider() { ... }`
                      )
                    }
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {copiedCodeKey === 'android_widget' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCodeKey === 'android_widget' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {`class WaterTankWidgetProvider : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        // Atualiza nível percentual e exibe ícone oficial da Hossidev no Widget
        val views = RemoteViews(context.packageName, R.layout.widget_water_tank_2x2)
        views.setTextViewText(R.id.tv_level_percentage, "\${level}%")
        appWidgetManager.updateAppWidget(widgetId, views)
    }
}`}
                </pre>
              </div>

              {/* File 3: iOS WidgetKit Swift */}
              <div className="rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
                  <span className="font-mono text-cyan-300 font-bold">
                    ios/WaterLevelWidget.swift (iOS 17+ WidgetKit)
                  </span>
                  <button
                    onClick={() =>
                      handleCopy(
                        'ios_widget',
                        `struct HossidevWaterWidget: Widget { ... }`
                      )
                    }
                    className="flex items-center gap-1 text-slate-400 hover:text-white"
                  >
                    {copiedCodeKey === 'ios_widget' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedCodeKey === 'ios_widget' ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
                <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto">
                  {`struct SmallWidgetView: View {
    let entry: TankTelemetryEntry
    var body: some View {
        ZStack {
            Color(red: 7/255, green: 13/255, blue: 25/255)
            VStack {
                HStack {
                    Image("HossidevAppIcon").resizable().frame(width: 18, height: 18)
                    Text("HOSSIDEV").font(.system(size: 9, weight: .bold))
                }
                Text("\${entry.levelPercentage}%").font(.system(size: 24, weight: .bold))
            }
        }
    }
}`}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
