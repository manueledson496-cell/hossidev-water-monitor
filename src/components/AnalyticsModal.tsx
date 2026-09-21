import React, { useState, useEffect } from 'react';
import {
  X,
  LineChart,
  Filter,
  Calendar,
  AlertCircle,
  RefreshCw,
  Droplets,
  Layers,
  Waves,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TankData, CondominiumMetrics } from '../types';
import { api } from '../services/api';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tanks: TankData[];
  metrics: CondominiumMetrics;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  tanks,
  metrics,
}) => {
  const [period, setPeriod] = useState<string>('24h');
  const [selectedTankId, setSelectedTankId] = useState<number | ''>('');
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.telemetry.getHistory({
        tankId: selectedTankId ? Number(selectedTankId) : undefined,
        period,
      });

      // Format records for Recharts
      const chartPoints = res.records.map((r) => {
        const d = new Date(r.timestamp);
        return {
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          timestamp: r.timestamp,
          level: r.level,
          tankId: r.tankId,
          pump: r.pump,
        };
      });

      setHistoryRecords(chartPoints);
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, period, selectedTankId]);

  if (!isOpen) return null;

  const tanksWithRealData = tanks.filter((t) => t.hasRealData && t.level !== null);

  return (
    <div
      id="analyticsModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal rounded-[2.5rem] w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <LineChart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Histórico & Análise de Telemetria Real
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Dados reais persistidos • Consulta por período e reservatório
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Key Metric Highlights Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="glass-panel rounded-3xl p-4 flex flex-col shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volume em Reserva</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-cyan-400 font-mono">
                  {(metrics.currentTotalLiters / 1000).toFixed(1)} m³
                </span>
                <span className="text-xs text-slate-400">
                  / {(metrics.totalCapacityLiters / 1000).toFixed(0)} m³
                </span>
              </div>
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-3 overflow-hidden">
                <div
                  className="bg-cyan-400 h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
                  style={{ width: `${metrics.totalPercentage}%` }}
                />
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-4 flex flex-col shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Autonomia Real</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {metrics.currentTotalLiters > 0 ? `~${metrics.estimatedAutonomyHours.toFixed(1)}h` : '---'}
                </span>
                <span className="text-xs text-emerald-400/80 font-medium">Segurança</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-2">
                Consumo: ~{metrics.dailyConsumptionEstimateLiters.toLocaleString()} L/dia
              </span>
            </div>

            <div className="glass-panel rounded-3xl p-4 flex flex-col shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bombas Ativas</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-sky-400 font-mono">
                  {metrics.activePumps} / 6
                </span>
                <span className="text-xs text-slate-400">em carga</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-2">
                Monitoramento por relé da central
              </span>
            </div>

            <div className="glass-panel rounded-3xl p-4 flex flex-col shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Integridade de Sensores</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black font-mono ${metrics.totalFaultySensors > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {60 - metrics.totalFaultySensors} / 60
                </span>
                <span className="text-xs text-slate-400">provas OK</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-2">
                {metrics.totalFaultySensors === 0
                  ? 'Nenhuma avaria física'
                  : `${metrics.totalFaultySensors} prova(s) em falha`}
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="glass-panel p-4 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <label className="text-xs font-bold text-slate-300">Reservatório:</label>
              <select
                value={selectedTankId}
                onChange={(e) => setSelectedTankId(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs"
              >
                <option value="">Todos os Reservatórios Permitidos</option>
                {tanks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.sectorName})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Calendar className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                {['1h', '6h', '24h', '7d'].map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriod(p)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      period === p
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <button
                onClick={fetchHistory}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
                title="Atualizar leituras do banco de dados"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Real Telemetry Volume Chart */}
          <div className="glass-panel p-4 sm:p-5 flex flex-col gap-3 shadow-sm rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  Curva Histórica Real dos Sensores
                </h3>
                <p className="text-xs text-slate-400">
                  {historyRecords.length} leitura(s) persistida(s) no banco de dados para o intervalo {period}
                </p>
              </div>
            </div>

            {historyRecords.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-950/60 rounded-2xl border border-slate-800">
                <AlertCircle className="w-8 h-8 text-slate-500 mb-2" />
                <span className="text-sm font-bold text-slate-300">
                  Sem dados históricos disponíveis
                </span>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Aguardando recebimento de pacotes reais no barramento ou via API /api/telemetry/ingest.
                </p>
              </div>
            ) : (
              <div className="w-full h-72 pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyRecords} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorLevel" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.6} />
                        <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} unit="%" domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        borderColor: '#334155',
                        borderRadius: '16px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="level"
                      name="Nível Real (%)"
                      stroke="#22d3ee"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorLevel)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Real Optical Probes Matrix */}
          <div className="glass-panel p-4 sm:p-5 flex flex-col gap-3 shadow-sm rounded-3xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  Matriz de Sensores Físicos (10 Provas por Tanque)
                </h3>
                <p className="text-xs text-slate-400">
                  Estado real discreto recebido das entradas digitais dos microcontroladores
                </p>
              </div>
              <span className="text-xs text-cyan-400 font-mono bg-cyan-500/10 px-3 py-1 rounded-xl border border-cyan-500/20">
                10% por prova
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold">
                    <th className="pb-2">Reservatório</th>
                    <th className="pb-2">Setor</th>
                    <th className="pb-2">Nó da Central</th>
                    <th className="pb-2">10%</th>
                    <th className="pb-2">20%</th>
                    <th className="pb-2">30%</th>
                    <th className="pb-2">40%</th>
                    <th className="pb-2">50%</th>
                    <th className="pb-2">60%</th>
                    <th className="pb-2">70%</th>
                    <th className="pb-2">80%</th>
                    <th className="pb-2">90%</th>
                    <th className="pb-2">100%</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {tanks.map((t) => {
                    const hasReal = t.hasRealData && t.level !== null;
                    const hasFault = t.fault_mask && t.fault_mask.some((f) => f === 1);
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 font-bold text-white">{t.name}</td>
                        <td className="py-2.5 text-slate-300 capitalize">{t.sector}</td>
                        <td className="py-2.5 text-cyan-300">Placa {t.nodeId}</td>
                        {Array.from({ length: 10 }, (_, i) => {
                          const isSubmerged = hasReal && t.sensors && t.sensors[i] === 1;
                          const isFaulty = hasReal && t.fault_mask && t.fault_mask[i] === 1;

                          return (
                            <td key={i} className="py-2.5">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  !hasReal
                                    ? 'bg-slate-800'
                                    : isFaulty
                                    ? 'bg-rose-500 shadow-md shadow-rose-500 animate-pulse'
                                    : isSubmerged
                                    ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]'
                                    : 'bg-slate-900 border border-slate-800'
                                }`}
                                title={`Sensor ${i + 1} (${(i + 1) * 10}%): ${
                                  !hasReal ? 'Sem dados' : isFaulty ? 'AVARIA' : isSubmerged ? 'ATIVO' : 'SECO'
                                }`}
                              />
                            </td>
                          );
                        })}
                        <td className="py-2.5 text-right font-sans font-bold">
                          {!hasReal ? (
                            <span className="text-slate-500 text-[11px]">Aguardando</span>
                          ) : hasFault ? (
                            <span className="text-rose-400 text-[11px] bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                              Falha
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-[11px] bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                              Normal
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
