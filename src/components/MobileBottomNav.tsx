import React from 'react';
import { Droplets, LineChart, Terminal, FileText, Cpu, Smartphone } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenAnalytics: () => void;
  onOpenDiagnostics: () => void;
  onOpenReport: () => void;
  onOpenNodesDrawer: () => void;
  onOpenMobileExperience?: () => void;
  faultCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenAnalytics,
  onOpenDiagnostics,
  onOpenReport,
  onOpenNodesDrawer,
  onOpenMobileExperience,
  faultCount,
}) => {
  return (
    <nav
      id="mobile-bottom-nav"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070d19]/95 backdrop-blur-md border-t border-[#1f3660] px-2 py-2 flex items-center justify-around"
    >
      <button
        onClick={() => setActiveTab('overview')}
        className={`flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all ${
          activeTab === 'overview' ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        <Droplets className="w-5 h-5" />
        <span className="text-[10px]">SCADA</span>
      </button>

      <button
        onClick={onOpenNodesDrawer}
        className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all relative"
      >
        <Cpu className="w-5 h-5" />
        <span className="text-[10px]">Nós (3)</span>
        {faultCount > 0 && (
          <span className="absolute top-0 right-2 w-2 h-2 rounded-full bg-red-500 animate-ping" />
        )}
      </button>

      {onOpenMobileExperience && (
        <button
          onClick={onOpenMobileExperience}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-cyan-400 hover:text-cyan-300 transition-all"
        >
          <Smartphone className="w-5 h-5" />
          <span className="text-[10px] font-bold">Mobile</span>
        </button>
      )}

      <button
        onClick={onOpenAnalytics}
        className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
      >
        <LineChart className="w-5 h-5" />
        <span className="text-[10px]">Consumo</span>
      </button>

      <button
        onClick={onOpenDiagnostics}
        className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
      >
        <Terminal className="w-5 h-5" />
        <span className="text-[10px]">Logs</span>
      </button>

      <button
        onClick={onOpenReport}
        className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl text-slate-400 hover:text-slate-200 transition-all"
      >
        <FileText className="w-5 h-5" />
        <span className="text-[10px]">Relatório</span>
      </button>
    </nav>
  );
};

