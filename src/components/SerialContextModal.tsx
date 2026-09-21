import React from 'react';
import { Usb, ExternalLink, X, ShieldAlert, Wifi, ArrowRight } from 'lucide-react';

interface SerialContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenArduinoBridge: () => void;
}

export const SerialContextModal: React.FC<SerialContextModalProps> = ({
  isOpen,
  onClose,
  onOpenArduinoBridge,
}) => {
  if (!isOpen) return null;

  const handleOpenNewTab = () => {
    try {
      window.open(window.location.href, '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      id="serialContextModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal rounded-[2.5rem] w-full max-w-lg overflow-hidden flex flex-col shadow-2xl border border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Usb className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Conexão com Central Física
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Web Serial API & Ingestão Direta de Hardware
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

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 leading-relaxed">
              <span className="font-bold text-amber-300">Acesso a Portas USB em Navegadores:</span>
              <p className="mt-1">
                A Web Serial API requer permissão explícita de janela de nível superior. Para selecionar a porta COM da sua central via USB direto, abra em nova aba ou use a Ingestão HTTP direta via rede.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Option 1: Open in New Tab for Real Hardware */}
            <div className="p-4 rounded-3xl bg-slate-900/70 border border-cyan-500/30 hover:border-cyan-500/60 transition-all flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                  <ExternalLink className="w-4 h-4" />
                  <span>1. Abrir em Nova Aba (Web Serial USB)</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  Porta COM
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Abre o Hossidev SCADA em aba independente, habilitando o seletor de portas serial (COM / ttyUSB) a 115.200 bps.
              </p>
              <button
                onClick={handleOpenNewTab}
                className="mt-1 w-full py-2.5 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <span>Abrir em Nova Aba</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Option 2: API & Network Ingestion */}
            <div className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 transition-all flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                  <Wifi className="w-4 h-4" />
                  <span>2. Instruções de Ingestão & API</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                  100% Produção
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Consulte as instruções de integração com cálculo de 10 provas e envio JSON contínuo para <code>/api/telemetry/ingest</code>.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onOpenArduinoBridge();
                }}
                className="mt-1 w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Ver Instruções de Integração</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
