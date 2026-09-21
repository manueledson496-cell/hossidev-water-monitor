import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Terminal,
  Trash2,
  Download,
  Pause,
  Play,
  Send,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Search,
  Cpu,
  Usb,
  Activity,
  Zap,
} from 'lucide-react';
import { LogItem, SystemData, SerialDiagnosticsMetrics, UsbSerialConnectionState } from '../types';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: LogItem[];
  onClearLogs: () => void;
  system: SystemData;
  metrics?: SerialDiagnosticsMetrics;
  serialState?: UsbSerialConnectionState;
  onSendCommand: (commandStr: string) => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  system,
  metrics,
  serialState,
  onSendCommand,
}) => {
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'rx' | 'tx' | 'fault' | 'system'>('all');
  const [customCommand, setCustomCommand] = useState('{"device":"kizomba","cmd":"get_status"}');
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && isOpen && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll, isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (selectedFilter !== 'all' && log.type !== selectedFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.text.toLowerCase().includes(q) ||
        (log.rawJson && log.rawJson.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customCommand.trim()) return;
    onSendCommand(customCommand);
  };

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `telemetria_kizomba_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div
      id="diagModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Telemetria do Barramento Serial & Diagnóstico
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Monitoramento UART 115200 (USB Mestre & Nós Escravos)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportLogs}
              className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              title="Exportar registros em formato JSON"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Exportar</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* System Topology Node Cards Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-950/40 border-b border-slate-800/80">
          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${system.nodes.node1.status === 'online' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`} />
              <div>
                <div className="text-xs font-bold text-slate-200">Placa 1 (Principal USB)</div>
                <div className="text-[10px] text-cyan-400 font-mono">Tratada (FW1, FW2)</div>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${system.nodes.node1.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              {system.nodes.node1.status.toUpperCase()}
            </span>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${system.nodes.node2.status === 'online' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`} />
              <div>
                <div className="text-xs font-bold text-slate-200">Placa 2 (Serial1)</div>
                <div className="text-[10px] text-sky-400 font-mono">Não Tratada (RW1, RW2)</div>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${system.nodes.node2.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              {system.nodes.node2.status.toUpperCase()}
            </span>
          </div>

          <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className={`w-2.5 h-2.5 rounded-full ${system.nodes.node3.status === 'online' ? 'bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-rose-500'}`} />
              <div>
                <div className="text-xs font-bold text-slate-200">Placa 3 (Serial2)</div>
                <div className="text-[10px] text-amber-400 font-mono">Água Bruta (WW1, WW2)</div>
              </div>
            </div>
            <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${system.nodes.node3.status === 'online' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
              {system.nodes.node3.status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* USB Serial Diagnostics Health Strip */}
        {metrics && (
          <div className="px-6 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Usb className="w-3.5 h-3.5 text-cyan-400" />
                <span>Status:</span>
                <span className={`font-bold uppercase ${
                  serialState === 'connected' || serialState === 'reading'
                    ? 'text-emerald-400'
                    : serialState === 'reconnecting'
                    ? 'text-cyan-400'
                    : 'text-amber-400'
                }`}>
                  {serialState ?? 'offline'}
                </span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-slate-400">
                <span>RX Válidos:</span>
                <span className="text-emerald-400 font-bold">{metrics.totalPacketsReceived}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-slate-400">
                <span>Inválidos:</span>
                <span className="text-amber-400 font-bold">{metrics.totalPacketsInvalid}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1 text-slate-400">
                <span>Reconexões:</span>
                <span className="text-cyan-400 font-bold">{metrics.reconnectCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {metrics.lastLatencyMs !== null && (
                <div className="flex items-center gap-1 text-slate-400">
                  <Zap className="w-3 h-3 text-indigo-400" />
                  <span>Ping:</span>
                  <span className="text-indigo-300 font-bold">{metrics.lastLatencyMs}ms</span>
                </div>
              )}
              {metrics.lastMessageTime && (
                <div className="text-slate-500 text-[10px]">
                  Última leitura: {Math.max(0, Math.floor((Date.now() - metrics.lastMessageTime) / 1000))}s atrás
                </div>
              )}
            </div>
          </div>
        )}

        {/* Toolbar: Filters, Search & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-950/60 border-b border-slate-800/80 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por texto / chave..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-200 placeholder:text-slate-500 text-xs focus:outline-none focus:border-cyan-500/50 w-48 sm:w-60 transition-colors"
              />
            </div>

            <div className="flex items-center bg-slate-900/80 p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedFilter === 'all' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({logs.length})
              </button>
              <button
                onClick={() => setSelectedFilter('rx')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedFilter === 'rx' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                RX Telemetria
              </button>
              <button
                onClick={() => setSelectedFilter('tx')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedFilter === 'tx' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                TX Comandos
              </button>
              <button
                onClick={() => setSelectedFilter('fault')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedFilter === 'fault' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Avarias
              </button>
              <button
                onClick={() => setSelectedFilter('system')}
                className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  selectedFilter === 'system' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sistema
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer ${
                autoScroll
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400'
              }`}
              title={autoScroll ? 'Pausar rolagem automática' : 'Ativar rolagem automática'}
            >
              {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span>{autoScroll ? 'Rolagem Ativa' : 'Pausado'}</span>
            </button>

            <button
              onClick={onClearLogs}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
              title="Limpar buffer de logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Terminal Log Screen */}
        <div
          id="serialLogs"
          className="flex-1 p-5 bg-slate-950/80 overflow-y-auto font-mono text-xs text-emerald-400 space-y-1.5 min-h-[280px] max-h-[400px] select-text border-y border-slate-900"
        >
          {filteredLogs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
              <Terminal className="w-8 h-8 mb-2 opacity-40" />
              <span>Nenhum pacote serial registrado no momento.</span>
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isFault = log.type === 'fault';
              const isTx = log.type === 'tx';
              return (
                <div
                  key={log.id}
                  className={`flex items-start gap-2 p-1.5 rounded-xl hover:bg-slate-900/60 transition-colors ${
                    isFault ? 'text-rose-400 bg-rose-950/30 border border-rose-900/40' : isTx ? 'text-cyan-300' : 'text-emerald-400'
                  }`}
                >
                  <span className="text-slate-500 text-[10px] select-none">[{log.time}]</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md uppercase select-none ${
                    isFault
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : isTx
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {log.type}
                  </span>
                  <span className="break-all">{log.text}</span>
                </div>
              );
            })
          )}
          <div ref={logsEndRef} />
        </div>

        {/* Command Injection Footer Bar */}
        <form onSubmit={handleSend} className="p-4 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-2.5">
          <span className="text-slate-400 text-xs font-mono select-none hidden sm:inline font-bold">TX &gt;</span>
          <input
            type="text"
            value={customCommand}
            onChange={(e) => setCustomCommand(e.target.value)}
            placeholder='Ex: {"device":"kizomba","cmd":"pump_toggle","tank":1}'
            className="flex-1 bg-slate-900/80 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-xs font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            className="px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Enviar ao Barramento</span>
          </button>
        </form>
      </div>
    </div>
  );
};
