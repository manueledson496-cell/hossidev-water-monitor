import React from 'react';
import {
  X,
  Printer,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Download,
  Building2,
  Calendar,
  ShieldCheck,
  Droplets,
} from 'lucide-react';
import { TankData, SystemData, CondominiumMetrics } from '../types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tanks: TankData[];
  system: SystemData;
  metrics: CondominiumMetrics;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  tanks,
  system,
  metrics,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      id="reportModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal rounded-[2.5rem] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden print:max-w-none print:m-0 print:border-none print:shadow-none print:bg-white print:text-black">
        {/* Modal Topbar (hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Relatório Técnico de Telemetria Hidráulica
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Condomínio Kizomba • Documento emitido pelo sistema Hossidev SCADA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-2xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-950/40 print:bg-white print:text-slate-900 space-y-6">
          {/* Official Document Header */}
          <div className="border-b border-slate-800 print:border-slate-300 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Droplets className="w-6 h-6 text-cyan-400 print:text-blue-600" />
                <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-white print:text-slate-900">
                  Condomínio Kizomba — Central Hidráulica
                </h1>
              </div>
              <p className="text-xs text-slate-400 print:text-slate-600 mt-1">
                Sistema Automatizado de Monitoramento por Barramento Serial Multi-Nó (Hossidev v2.6)
              </p>
            </div>

            <div className="text-right text-xs">
              <div className="text-slate-400 print:text-slate-500 font-medium">Data de Emissão:</div>
              <div className="font-bold text-white print:text-slate-900">{currentDate}</div>
              <div className="text-[11px] text-cyan-400 print:text-blue-600 font-mono">
                Status: {metrics.totalFaultySensors === 0 ? 'CONFORMIDADE TOTAL' : 'ATENÇÃO REQUERIDA'}
              </div>
            </div>
          </div>

          {/* Executive Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
            <div className="p-3.5 bg-slate-900/50 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-bold tracking-wider">Reserva Total</span>
              <div className="text-base font-bold text-cyan-400 print:text-blue-700 mt-0.5 font-mono">
                {(metrics.currentTotalLiters / 1000).toFixed(1)} / {(metrics.totalCapacityLiters / 1000).toFixed(0)} m³
              </div>
              <span className="text-[11px] text-slate-300 print:text-slate-700 font-semibold">{metrics.totalPercentage.toFixed(0)}% Ocupação</span>
            </div>

            <div className="p-3.5 bg-slate-900/50 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-bold tracking-wider">Autonomia Estimada</span>
              <div className="text-base font-bold text-emerald-400 print:text-emerald-700 mt-0.5 font-mono">
                ~{metrics.estimatedAutonomyHours.toFixed(1)} Horas
              </div>
              <span className="text-[11px] text-slate-300 print:text-slate-700 font-semibold">Sem interrupção</span>
            </div>

            <div className="p-3.5 bg-slate-900/50 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-bold tracking-wider">Bombas em Operação</span>
              <div className="text-base font-bold text-sky-400 print:text-blue-700 mt-0.5 font-mono">
                {metrics.activePumps} de 6
              </div>
              <span className="text-[11px] text-slate-300 print:text-slate-700 font-semibold">Em regime de recarga</span>
            </div>

            <div className="p-3.5 bg-slate-900/50 print:bg-slate-100 rounded-2xl border border-slate-800 print:border-slate-300">
              <span className="text-[10px] text-slate-400 print:text-slate-600 uppercase font-bold tracking-wider">Avarias Detectadas</span>
              <div className={`text-base font-bold mt-0.5 font-mono ${metrics.totalFaultySensors > 0 ? 'text-rose-400 print:text-red-600' : 'text-emerald-400 print:text-emerald-600'}`}>
                {metrics.totalFaultySensors} Sensores
              </div>
              <span className="text-[11px] text-slate-300 print:text-slate-700 font-semibold">
                {metrics.totalFaultySensors === 0 ? 'Sem falhas' : 'Requer reparo'}
              </span>
            </div>
          </div>

          {/* Detailed Sector and Tank Table */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 print:text-slate-900 uppercase tracking-wider">
              1. Detalhamento por Reservatório e Setor Hidráulico
            </h3>
            <div className="border border-slate-800 print:border-slate-300 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 print:bg-slate-200 text-slate-300 print:text-slate-800 font-bold border-b border-slate-800 print:border-slate-300">
                  <tr>
                    <th className="p-2.5">ID</th>
                    <th className="p-2.5">Identificação</th>
                    <th className="p-2.5">Setor</th>
                    <th className="p-2.5">Nó Placa</th>
                    <th className="p-2.5">Capacidade</th>
                    <th className="p-2.5">Nível (%)</th>
                    <th className="p-2.5">Volume Atual</th>
                    <th className="p-2.5">Bomba</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 print:divide-slate-200 font-mono">
                  {tanks.map((t) => {
                    const currentLit = t.currentLiters ?? Math.round((t.level / 100) * t.capacityLiters);
                    const hasFault = t.fault_mask && t.fault_mask.some((f) => f === 1);
                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30 print:hover:bg-slate-50">
                        <td className="p-2.5 font-bold">#{t.id}</td>
                        <td className="p-2.5 font-sans font-semibold text-white print:text-slate-900">{t.name}</td>
                        <td className="p-2.5 font-sans capitalize text-slate-300 print:text-slate-700">{t.sector}</td>
                        <td className="p-2.5 text-cyan-400 print:text-blue-700">Placa {t.nodeId}</td>
                        <td className="p-2.5">{t.capacityLiters.toLocaleString()} L</td>
                        <td className="p-2.5 font-bold">{t.level}%</td>
                        <td className="p-2.5">{currentLit.toLocaleString()} L</td>
                        <td className="p-2.5 font-sans">
                          {t.pump === 1 ? (
                            <span className="text-emerald-400 print:text-emerald-700 font-semibold">ENCHENDO</span>
                          ) : (
                            <span className="text-slate-500">OFF</span>
                          )}
                        </td>
                        <td className="p-2.5 font-sans font-bold">
                          {hasFault ? (
                            <span className="text-rose-400 print:text-red-600">AVARIA SENSOR</span>
                          ) : (
                            <span className="text-emerald-400 print:text-emerald-600">OPERACIONAL</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Microcontroller Hardware Status Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300 print:text-slate-900 uppercase tracking-wider">
              2. Topologia do Barramento Serial e Nós de Aquisição
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 bg-slate-900/50 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-300 text-xs">
                <div className="font-bold text-white print:text-slate-900">Placa 1 (Principal USB)</div>
                <div className="text-slate-400 print:text-slate-600 text-[11px] mt-0.5">Setor 1 (Tratada - FW1, FW2)</div>
                <div className="mt-2 text-[11px] font-mono text-emerald-400 print:text-emerald-700 font-bold">
                  Status: {system.nodes.node1.status.toUpperCase()}
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/50 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-300 text-xs">
                <div className="font-bold text-white print:text-slate-900">Placa 2 (Serial1)</div>
                <div className="text-slate-400 print:text-slate-600 text-[11px] mt-0.5">Setor 2 (Não Tratada - RW1, RW2)</div>
                <div className="mt-2 text-[11px] font-mono text-emerald-400 print:text-emerald-700 font-bold">
                  Status: {system.nodes.node2.status.toUpperCase()}
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/50 print:bg-slate-50 rounded-2xl border border-slate-800 print:border-slate-300 text-xs">
                <div className="font-bold text-white print:text-slate-900">Placa 3 (Serial2)</div>
                <div className="text-slate-400 print:text-slate-600 text-[11px] mt-0.5">Setor 3 (Água Bruta - WW1, WW2)</div>
                <div className="mt-2 text-[11px] font-mono text-emerald-400 print:text-emerald-700 font-bold">
                  Status: {system.nodes.node3.status.toUpperCase()}
                </div>
              </div>
            </div>
          </div>

          {/* Technical Sign-Off Block */}
          <div className="pt-6 border-t border-slate-800 print:border-slate-300 grid grid-cols-2 gap-8 text-xs text-center">
            <div className="flex flex-col items-center">
              <div className="w-48 border-b border-slate-700 print:border-slate-400 mb-1" />
              <span className="font-bold text-white print:text-slate-900">Responsável Técnico / Engenharia</span>
              <span className="text-[11px] text-slate-400 print:text-slate-600">Sistema Hossidev Water Monitor</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-48 border-b border-slate-700 print:border-slate-400 mb-1" />
              <span className="font-bold text-white print:text-slate-900">Administração do Condomínio Kizomba</span>
              <span className="text-[11px] text-slate-400 print:text-slate-600">Comissão de Obras e Manutenção</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
