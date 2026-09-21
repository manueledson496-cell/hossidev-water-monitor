import React from 'react';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Maximize2,
  Radio,
  Clock,
} from 'lucide-react';
import { TankData } from '../types';

interface TankCardProps {
  tank: TankData;
  onOpenDetails: (tank: TankData) => void;
  onTogglePumpOverride: (tankId: number) => void;
}

export const TankCard: React.FC<TankCardProps> = ({
  tank,
  onOpenDetails,
  onTogglePumpOverride,
}) => {
  const hasRealData = tank.hasRealData && tank.level !== null;
  const levelValue = hasRealData ? tank.level! : 0;
  
  // Optional Volumetric Capacity calculations
  const hasCapacityDefined = typeof tank.capacityLiters === 'number' && tank.capacityLiters > 0;
  const currentLiters = hasRealData && hasCapacityDefined
    ? Math.round((levelValue / 100) * tank.capacityLiters!)
    : null;
  const currentM3 = currentLiters !== null ? (currentLiters / 1000).toFixed(1) : null;
  const totalCapacityM3 = hasCapacityDefined ? (tank.capacityLiters! / 1000).toFixed(1) : null;

  const faultySensorsIndices = tank.fault_mask
    ? tank.fault_mask.reduce((acc: number[], val, idx) => (val === 1 ? [...acc, idx + 1] : acc), [])
    : [];

  const hasFault = faultySensorsIndices.length > 0 || tank.fault === 1;
  const isPumpActive = tank.pump === 1;

  const getWaterGradientClass = () => {
    switch (tank.sector) {
      case 'filtrada':
        return 'water-gradient-filtrada';
      case 'nao-filtrada':
        return 'water-gradient-nao-filtrada';
      case 'bruta':
      default:
        return 'water-gradient-bruta';
    }
  };

  const getSectorBadgeColor = () => {
    switch (tank.sector) {
      case 'filtrada':
        return 'border-cyan-500/30 text-cyan-300 bg-cyan-500/10';
      case 'nao-filtrada':
        return 'border-sky-500/30 text-sky-300 bg-sky-500/10';
      case 'bruta':
      default:
        return 'border-amber-500/30 text-amber-300 bg-amber-500/10';
    }
  };

  return (
    <div
      id={`tankCard_${tank.id}`}
      className={`relative glass-panel-interactive rounded-[2rem] p-5 sm:p-6 flex flex-col gap-4 transition-all duration-300 ${
        hasFault
          ? 'card-fault-glow bg-slate-950/80'
          : 'hover:shadow-2xl hover:shadow-cyan-950/20 card-normal-glow'
      }`}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-3.5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              {tank.name}
            </h3>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${getSectorBadgeColor()}`}>
              ID #{tank.id}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 font-medium">
            <span>Capacidade:</span>
            {hasCapacityDefined ? (
              <span className="text-slate-200 font-mono font-semibold">
                {currentLiters !== null && hasRealData ? (
                  <>
                    <strong className="text-cyan-300">{currentLiters.toLocaleString('pt-BR')} L</strong> de {tank.capacityLiters!.toLocaleString('pt-BR')} L ({totalCapacityM3} m³)
                  </>
                ) : (
                  <>
                    <strong>{tank.capacityLiters!.toLocaleString('pt-BR')} L</strong> ({totalCapacityM3} m³)
                  </>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 text-[10px] font-mono font-bold">
                Modo Percentual (%)
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!hasRealData ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 font-mono">
              <Radio className="w-3 h-3 text-slate-500 animate-pulse" />
              <span>AGUARDANDO CONEXÃO</span>
            </span>
          ) : hasFault ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 animate-pulse font-mono">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>AVARIA ({faultySensorsIndices.length} PROVAS)</span>
            </span>
          ) : isPumpActive ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>A ENCHER</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono">
              <CheckCircle2 className="w-3 h-3 text-cyan-400" />
              <span>OPERACIONAL</span>
            </span>
          )}

          <button
            onClick={() => onOpenDetails(tank)}
            className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-800 transition-colors cursor-pointer"
            title="Inspecionar parâmetros e histórico do tanque"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hydraulic Body Visualization: Visual Cylinder & Real Sensor Ladder */}
      <div className="flex items-center justify-between sm:justify-around gap-3 sm:gap-6 py-2 px-1">
        {/* Visual Tank Cylinder */}
        <div className="relative flex flex-col items-center">
          {/* Tank Top Rim Indicator */}
          <div className="w-[92px] sm:w-[110px] h-3.5 rounded-t-full bg-slate-800/90 border-t border-x border-slate-700 flex items-center justify-center">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
          </div>

          {/* Main Hydraulic Vessel */}
          <div className="relative w-[92px] sm:w-[110px] h-[190px] bg-slate-950/90 border-x border-b border-slate-800 rounded-b-3xl overflow-hidden flex flex-col-reverse shadow-inner">
            {/* Level Guide Grid Ticks */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20 px-1.5 py-2 z-10">
              <div className="w-full border-b border-dashed border-white text-[8px] text-right font-mono text-white">100%</div>
              <div className="w-full border-b border-dashed border-white text-[8px] text-right font-mono text-white">75%</div>
              <div className="w-full border-b border-dashed border-white text-[8px] text-right font-mono text-white">50%</div>
              <div className="w-full border-b border-dashed border-white text-[8px] text-right font-mono text-white">25%</div>
              <div className="w-full border-b border-dashed border-white text-[8px] text-right font-mono text-white">0%</div>
            </div>

            {/* Rising Water Column - Always 0% when no board is connected */}
            <div
              id={`t${tank.id}Water`}
              className={`w-full ${getWaterGradientClass()} transition-all duration-700 ease-out relative`}
              style={{ height: `${hasRealData ? Math.min(100, Math.max(0, levelValue)) : 0}%` }}
            >
              {/* Wave surface shimmer */}
              {hasRealData && levelValue > 0 && (
                <div className="absolute -top-1 left-0 right-0 h-2 bg-white/40 blur-[1px] rounded-full animate-wave" />
              )}

              {/* Sparkle bubbles when pump is running */}
              {hasRealData && isPumpActive && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                  <div className="w-1.5 h-1.5 rounded-full bg-white animate-bounce absolute bottom-2 left-3" />
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse absolute bottom-8 right-4" />
                  <div className="w-1 h-1 rounded-full bg-white animate-ping absolute bottom-14 left-6" />
                </div>
              )}
            </div>

            {/* Center Percentage Display over Water */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
              <span
                id={`t${tank.id}LevelText`}
                className={`text-xl font-extrabold font-mono transition-colors ${
                  hasRealData
                    ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]'
                    : 'text-slate-500'
                }`}
              >
                {hasRealData ? `${levelValue}%` : '0%'}
              </span>
              <span
                className={`text-[10px] font-semibold font-mono ${
                  hasRealData
                    ? 'text-cyan-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]'
                    : 'text-slate-600'
                }`}
              >
                {!hasRealData
                  ? '(Offline)'
                  : hasCapacityDefined
                  ? `${currentM3} m³`
                  : 'Modo %'}
              </span>
            </div>
          </div>

          <div className="text-[10px] text-slate-400 font-mono mt-1.5">
            {!hasRealData
              ? '0 L'
              : hasCapacityDefined && currentLiters !== null
              ? `${currentLiters.toLocaleString('pt-BR')} L`
              : `Nível: ${levelValue}%`}
          </div>
        </div>

        {/* 10-Level Optical Sensors Ladder (10% to 100%) */}
        <div className="flex flex-col gap-1">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 flex items-center justify-between">
            <span>Sensores Reais (10 Provas)</span>
          </div>

          <div
            id={`t${tank.id}SensorScale`}
            className="flex flex-col-reverse justify-between h-[190px] py-1 border-l border-slate-800 pl-3.5"
          >
            {Array.from({ length: 10 }, (_, i) => {
              const sensorNum = i + 1;
              const sensorIdx = i;
              const hasSensorsArray = Array.isArray(tank.sensors) && tank.sensors.length === 10;
              const isSubmerged = hasRealData
                ? (hasSensorsArray ? tank.sensors[sensorIdx] === 1 : (levelValue !== null && sensorNum * 10 <= levelValue))
                : false;
              const isFaulty = hasRealData && Array.isArray(tank.fault_mask) && tank.fault_mask[sensorIdx] === 1;

              return (
                <div
                  key={sensorNum}
                  id={`tank${tank.id}_sensor_${sensorNum}`}
                  className={`sensor-node flex items-center gap-2 ${
                    isFaulty ? 'fault' : isSubmerged ? 'active' : ''
                  }`}
                  title={`Sensor Físico S${sensorNum} (${sensorNum * 10}%): ${
                    !hasRealData
                      ? 'Sensor inativo (Aguardando placa ligada)'
                      : isFaulty
                      ? 'AVARIA FÍSICA DETECTADA'
                      : isSubmerged
                      ? 'Submerso (Água em contato)'
                      : 'Seco'
                  }`}
                >
                  {/* Sensor Indicator Light */}
                  <div
                    className={`sensor-light w-3 h-3 rounded-full transition-all duration-300 ${
                      !hasRealData
                        ? 'bg-slate-900 border border-slate-800'
                        : isFaulty
                        ? 'bg-rose-500 border border-white shadow-lg shadow-rose-500 animate-fault-pulse'
                        : isSubmerged
                        ? 'bg-cyan-400 border border-white/80 shadow-[0_0_8px_rgba(34,211,238,0.8)]'
                        : 'bg-slate-900 border border-slate-800'
                    }`}
                  />

                  {/* Sensor Text Label */}
                  <span
                    id={`tank${tank.id}_text_${sensorNum}`}
                    className={`text-[11px] font-mono transition-colors ${
                      !hasRealData
                        ? 'text-slate-600'
                        : isFaulty
                        ? 'text-rose-400 font-bold'
                        : isSubmerged
                        ? 'text-slate-200 font-medium'
                        : 'text-slate-600'
                    }`}
                  >
                    {isFaulty ? (
                      <span className="flex items-center gap-1 font-bold">
                        S{sensorNum} (AVARIA)
                      </span>
                    ) : (
                      <span>{sensorNum * 10}%</span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tank Metrics Footer Bento Strip */}
      <div className="grid grid-cols-2 gap-2.5 bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            {hasCapacityDefined ? 'Volume Estimado' : 'Leitura de Nível'}
          </span>
          <div className="flex items-baseline gap-1 mt-0.5 font-mono">
            {hasCapacityDefined ? (
              <>
                <span className="text-sm font-bold text-slate-100">
                  {hasRealData && currentLiters !== null ? currentLiters.toLocaleString('pt-BR') : '0'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Litros</span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-cyan-400">
                  {hasRealData ? `${levelValue}%` : '---'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">(Sensor %)</span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Bomba de Carga</span>
          <div className="flex items-center justify-between mt-0.5">
            <div className="flex items-center gap-1.5">
              <RotateCcw
                className={`w-3.5 h-3.5 ${
                  isPumpActive ? 'text-emerald-400 animate-spin' : 'text-slate-600'
                }`}
              />
              <span
                id={`t${tank.id}PumpText`}
                className={`text-xs font-bold font-mono ${
                  !hasRealData ? 'text-slate-600' : isPumpActive ? 'text-emerald-400' : 'text-slate-400'
                }`}
              >
                {!hasRealData ? 'OFF' : isPumpActive ? 'A ENCHER...' : 'OFF'}
              </span>
            </div>

            {/* Hardware relay pump command */}
            <button
              onClick={() => onTogglePumpOverride(tank.id)}
              className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-lg transition-all cursor-pointer ${
                isPumpActive
                  ? 'bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30'
                  : 'bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/30'
              }`}
              title="Comando do relé da bomba"
            >
              {isPumpActive ? 'Desligar' : 'Acionar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
