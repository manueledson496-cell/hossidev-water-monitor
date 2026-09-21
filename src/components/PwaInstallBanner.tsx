import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Sparkles, Plus } from 'lucide-react';

interface PwaInstallBannerProps {
  onOpenMobileModal: () => void;
  deferredPrompt: any;
  onInstall: () => void;
}

export const PwaInstallBanner: React.FC<PwaInstallBannerProps> = ({
  onOpenMobileModal,
  deferredPrompt,
  onInstall,
}) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    return localStorage.getItem('hossidev_pwa_banner_dismissed') === 'true';
  });

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('hossidev_pwa_banner_dismissed', 'true');
  };

  return (
    <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-40 max-w-sm w-[calc(100%-2rem)] animate-in slide-in-from-bottom-5 duration-300">
      <div className="p-4 rounded-3xl bg-slate-950/90 backdrop-blur-xl border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 flex items-center justify-between gap-3 group">
        <div className="flex items-center gap-3 cursor-pointer" onClick={onOpenMobileModal}>
          <div className="w-11 h-11 rounded-2xl bg-[#081b36] border border-cyan-500/50 p-1 flex-shrink-0 shadow-md">
            <img src="/icon.svg" alt="Hossidev Água" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-white tracking-tight">Fixar Hossidev no Ecrã</h4>
              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Acesso rápido no telemóvel</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={deferredPrompt ? onInstall : onOpenMobileModal}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-cyan-950/50 transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Instalar</span>
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors cursor-pointer"
            title="Fechar aviso"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
