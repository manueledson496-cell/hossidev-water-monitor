import React from 'react';
import { AlertOctagon, AlertTriangle, ShieldAlert, ArrowRight, BellOff, RefreshCw } from 'lucide-react';
import { TankData } from '../types';

interface SecurityBannerProps {
  tanks: TankData[];
  onOpenDiagnostics: () => void;
  onClearAllFaults: () => void;
}

export const SecurityBanner: React.FC<SecurityBannerProps> = ({
  tanks,
  onOpenDiagnostics,
  onClearAllFaults,
}) => {
  const faultyTanks = tanks.filter((t) => {
    const hasMaskFault = t.fault_mask && t.fault_mask.some((f) => f === 1);
    return hasMaskFault || t.fault === 1;
  });

  if (faultyTanks.length === 0) return null;

  const faultySummary = faultyTanks.map((t) => {
    const sensorList = t.fault_mask
      ? t.fault_mask
          .map((f, idx) => (f === 1 ? `S${idx + 1} (${(idx + 1) * 10}%)` : null))
          .filter(Boolean)
      : [];
    return `T${t.id} [${t.name}]: ${sensorList.join(', ')}`;
  });

  const totalFaults = faultyTanks.reduce(
    (acc, t) => acc + (t.fault_mask ? t.fault_mask.filter((f) => f === 1).length : 1),
    0
  );

  return (
    <div
      id="alertBanner"
      className="bg-slate-900/60 border border-rose-500/40 rounded-3xl p-4 sm:p-5 shadow-lg shadow-rose-950/20 text-white flex flex-col md:flex-row md:items-center justify-between gap-3.5 backdrop-blur-md animate-fault-pulse"
    >
      <div className="flex items-start gap-3.5">
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex-shrink-0">
          <AlertOctagon className="w-6 h-6 text-rose-400 animate-bounce" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xs sm:text-sm tracking-wider text-rose-300 uppercase flex items-center gap-1.5 font-mono">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              ALERTA DE SEGURANÇA HIDRÁULICA DO CONDOMÍNIO
            </span>
            <span className="bg-rose-500 text-black font-mono text-[11px] font-extrabold px-2.5 py-0.5 rounded-full">
              {totalFaults} Falha(s)
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
            Falha de leitura detectada em sensor(es) de nível. O sistema acionou o <strong className="text-white">bloqueio preventivo da bomba</strong> para evitar cavitação ou transbordamento.
          </p>
          <div id="alertDetailsText" className="text-[11px] font-mono text-rose-300 bg-slate-950/80 px-3 py-1.5 rounded-xl mt-2 border border-rose-500/20">
            <strong>Ocorrências:</strong> {faultySummary.join(' | ')}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center flex-shrink-0">
        <button
          onClick={onClearAllFaults}
          className="px-3.5 py-2 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
          title="Limpar avarias simuladas e restabelecer operação"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Restabelecer Sensores</span>
        </button>

        <button
          onClick={onOpenDiagnostics}
          className="px-4 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-900/30 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <span>Ver Telemetria</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
