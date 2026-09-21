import React from 'react';
import { Droplets, Waves, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { TankData, SectorType } from '../types';
import { TankCard } from './TankCard';
import { SECTOR_INFO } from '../data/tanksConfig';

interface SectorSectionProps {
  sectorKey: SectorType;
  tanks: TankData[];
  onOpenDetails: (tank: TankData) => void;
  onTogglePumpOverride: (tankId: number) => void;
}

export const SectorSection: React.FC<SectorSectionProps> = ({
  sectorKey,
  tanks,
  onOpenDetails,
  onTogglePumpOverride,
}) => {
  const info = SECTOR_INFO[sectorKey] || {
    title: `Setor ${sectorKey}`,
    description: 'Setor Hidráulico',
  };

  const totalSectorCapacity = tanks.reduce((acc, t) => acc + (typeof t.capacityLiters === 'number' ? t.capacityLiters : 0), 0);
  const tanksWithRealData = tanks.filter((t) => t.hasRealData && t.level !== null);
  const currentSectorLiters = tanksWithRealData.reduce(
    (acc, t) => acc + (typeof t.capacityLiters === 'number' ? Math.round(((t.level ?? 0) / 100) * t.capacityLiters) : 0),
    0
  );
  const sectorPercentage =
    totalSectorCapacity > 0 && tanksWithRealData.length > 0
      ? (currentSectorLiters / totalSectorCapacity) * 100
      : tanksWithRealData.length > 0
      ? tanksWithRealData.reduce((acc, t) => acc + (t.level ?? 0), 0) / tanksWithRealData.length
      : 0;
  const sectorFaultySensors = tanksWithRealData.reduce(
    (acc, t) => acc + (t.fault_mask ? t.fault_mask.filter((f) => f === 1).length : 0),
    0
  );

  const getIcon = () => {
    switch (sectorKey) {
      case 'filtrada':
        return <Droplets className="w-5 h-5 text-cyan-400" />;
      case 'nao-filtrada':
        return <Waves className="w-5 h-5 text-sky-400" />;
      case 'bruta':
      default:
        return <Layers className="w-5 h-5 text-amber-400" />;
    }
  };

  if (tanks.length === 0) return null;

  return (
    <section id={`category-section-${sectorKey}`} className="flex flex-col gap-3.5">
      {/* Sector Header Bento Capsule */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl glass-panel shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold text-white tracking-wider uppercase">
                {info.title}
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {info.description}
            </p>
          </div>
        </div>

        {/* Sector Quick Metrics Strip */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="flex items-center gap-2 bg-slate-950/70 px-3.5 py-1.5 rounded-2xl border border-slate-800 text-xs">
            <span className="text-slate-400 font-medium">Reserva:</span>
            {tanksWithRealData.length > 0 ? (
              <>
                <strong className="text-white font-mono font-bold">{sectorPercentage.toFixed(0)}%</strong>
                {totalSectorCapacity > 0 ? (
                  <span className="text-[11px] text-slate-400 font-mono">
                    ({(currentSectorLiters / 1000).toFixed(1)}k / {(totalSectorCapacity / 1000).toFixed(0)}k L)
                  </span>
                ) : (
                  <span className="text-[10px] text-cyan-300/80 font-mono font-medium">
                    (Modo %)
                  </span>
                )}
              </>
            ) : (
              <span className="text-amber-400 font-mono text-[11px] font-semibold">AGUARDANDO CONEXÃO</span>
            )}
          </div>

          {sectorFaultySensors > 0 ? (
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-1.5 animate-pulse font-mono">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{sectorFaultySensors} Avaria(s)</span>
            </span>
          ) : tanksWithRealData.length > 0 ? (
            <span className="text-[11px] font-bold px-3 py-1.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1.5 hidden sm:flex font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Normal</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Grid of Tanks in this Sector */}
      <div id={`grid${sectorKey.charAt(0).toUpperCase() + sectorKey.slice(1)}`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tanks.map((tank) => (
          <TankCard
            key={tank.id}
            tank={tank}
            onOpenDetails={onOpenDetails}
            onTogglePumpOverride={onTogglePumpOverride}
          />
        ))}
      </div>
    </section>
  );
};
