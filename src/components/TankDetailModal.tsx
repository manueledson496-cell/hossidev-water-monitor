import React from 'react';
import {
  X,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Droplets,
  Radio,
} from 'lucide-react';
import { TankData } from '../types';
import { SECTOR_INFO } from '../data/tanksConfig';

interface TankDetailModalProps {
  tank: TankData | null;
  isOpen: boolean;
  onClose: () => void;
  onTogglePumpOverride: (tankId: number) => void;
}

export const TankDetailModal: React.FC<TankDetailModalProps> = ({
  tank,
  isOpen,
  onClose,
  onTogglePumpOverride,
}) => {
  if (!isOpen || !tank) return null;

  const info = SECTOR_INFO[tank.sector] || {
    title: `Setor ${tank.sector}`,
  };

  const hasRealData = tank.hasRealData && tank.level !== null;
  const levelValue = hasRealData ? tank.level! : 0;
  const hasCapacityDefined = typeof tank.capacityLiters === 'number' && tank.capacityLiters > 0;
  const currentLiters = hasRealData && hasCapacityDefined
    ? Math.round((levelValue / 100) * tank.capacityLiters!)
    : null;
  const faultyCount = tank.fault_mask ? tank.fault_mask.filter((f) => f === 1).length : 0;
  const hasFault = faultyCount > 0 || tank.fault === 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-modal rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">{tank.name}</h2>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  ID #{tank.id}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs text-slate-400">{info.title}</p>
                <span className="text-slate-600">•</span>
                <span className="text-xs font-mono text-slate-300">
                  {hasCapacityDefined
                    ? `Capacidade: ${tank.capacityLiters!.toLocaleString('pt-BR')} L`
                    : 'Modo Percentual (%)'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-panel p-3.5 rounded-2xl flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nível Real</span>
              <span className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                {hasRealData ? `${levelValue}%` : '---'}
              </span>
              <span className="text-[11px] text-slate-400">
                {!hasRealData
                  ? 'Aguardando Conexão'
                  : hasCapacityDefined && currentLiters !== null
                  ? `${currentLiters.toLocaleString('pt-BR')} L`
                  : 'Modo Sensor %'}
              </span>
            </div>

            <div className="glass-panel p-3.5 rounded-2xl flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Bomba de Carga</span>
              <span
                className={`text-sm font-bold font-mono mt-0.5 ${
                  !hasRealData ? 'text-slate-500' : tank.pump === 1 ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {!hasRealData ? 'OFFLINE' : tank.pump === 1 ? 'A ENCHER...' : 'DESLIGADA'}
              </span>
              <span className="text-[11px] text-slate-400">
                Relé Nó #{tank.nodeId}
              </span>
            </div>

            <div className="glass-panel p-3.5 rounded-2xl flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Nó de Aquisição</span>
              <span className="text-sm font-bold text-white mt-0.5">Placa {tank.nodeId}</span>
              <span className="text-[11px] text-cyan-400 font-mono">UART 115200</span>
            </div>

            <div className="glass-panel p-3.5 rounded-2xl flex flex-col">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Integridade</span>
              <span
                className={`text-sm font-bold mt-0.5 ${
                  !hasRealData ? 'text-slate-500' : hasFault ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {!hasRealData ? 'Sem sinal' : hasFault ? `${faultyCount} Avaria(s)` : '100% Normal'}
              </span>
              <span className="text-[11px] text-slate-400">10 Provas Físicas</span>
            </div>
          </div>

          {/* 10 Sensors Diagnostic Table */}
          <div className="glass-panel rounded-3xl p-5 flex flex-col gap-3.5 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Leituras das 10 Provas Ópticas/Condutivas Reais
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">Entradas digitais dos sensores</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {Array.from({ length: 10 }, (_, i) => {
                const sensorNum = i + 1;
                const isSubmerged = hasRealData && tank.sensors && tank.sensors[i] === 1;
                const isFaulty = hasRealData && tank.fault_mask && tank.fault_mask[i] === 1;

                return (
                  <div
                    key={sensorNum}
                    className={`p-3 rounded-2xl border text-left flex flex-col gap-1 transition-all ${
                      !hasRealData
                        ? 'bg-slate-900/40 border-slate-800 text-slate-500'
                        : isFaulty
                        ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 shadow-md shadow-rose-950/40'
                        : isSubmerged
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-200'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold font-mono">S{sensorNum} ({sensorNum * 10}%)</span>
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          !hasRealData
                            ? 'bg-slate-700'
                            : isFaulty
                            ? 'bg-rose-500 animate-pulse'
                            : isSubmerged
                            ? 'bg-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.8)]'
                            : 'bg-slate-700'
                        }`}
                      />
                    </div>
                    <span className="text-[10px] font-semibold">
                      {!hasRealData
                        ? '⚪ Sem sinal'
                        : isFaulty
                        ? '⚡ AVARIA FÍSICA'
                        : isSubmerged
                        ? '💧 Submerso'
                        : '⚪ Seco'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Manual Controls */}
          <div className="glass-panel rounded-3xl p-5 flex flex-col justify-between gap-3 shadow-sm">
            <div>
              <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                Comando do Relé da Bomba
              </span>
              <p className="text-[11px] text-slate-400 mt-1">
                Dispara instrução de comutação do relé físico na Placa {tank.nodeId}.
              </p>
            </div>

            <button
              onClick={() => onTogglePumpOverride(tank.id)}
              className={`w-full py-3 px-4 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 ${
                tank.pump === 1
                  ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/40'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40'
              }`}
            >
              <Zap className="w-4 h-4" />
              <span>{tank.pump === 1 ? 'Desligar Relé da Bomba' : 'Acionar Relé da Bomba'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
