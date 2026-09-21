import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Server,
  Usb,
  Database,
  Download,
  Upload,
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  X,
  FileJson,
  Layers,
  Activity,
  Radio,
} from 'lucide-react';
import { SyncOverview, PendingOperation } from '../types';
import { syncService } from '../services/syncService';
import { dbService } from '../db/localDb';

interface OfflineSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncOverview: SyncOverview;
}

export const OfflineSyncModal: React.FC<OfflineSyncModalProps> = ({
  isOpen,
  onClose,
  syncOverview,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingOps, setPendingOps] = useState<PendingOperation[]>([]);
  const [dbStats, setDbStats] = useState<{
    usersCount: number;
    tanksCount: number;
    readingsCount: number;
    eventsCount: number;
    pendingCount: number;
    failedCount: number;
    totalOperations: number;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'queue' | 'backup'>('status');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const loadDetails = async () => {
    try {
      const ops = await dbService.getAllOperations();
      setPendingOps(ops);
      const stats = await dbService.getDatabaseStats();
      setDbStats(stats);
    } catch (err) {
      console.warn('Erro ao carregar detalhes de sincronização:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDetails();
      const unsubscribe = syncService.subscribe(() => {
        loadDetails();
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncService.syncNow();
      await loadDetails();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryFailed = async () => {
    setIsSyncing(true);
    try {
      await syncService.retryFailed();
      await loadDetails();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCompleted = async () => {
    await syncService.clearCompleted();
    await loadDetails();
  };

  const handleExportBackup = async () => {
    try {
      const json = await dbService.exportDatabaseBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hossidev-local-db-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Erro ao exportar backup local: ${err.message}`);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const result = await dbService.importDatabaseBackup(text);
        if (result.success) {
          setImportStatus('Backup importado com sucesso na base local!');
          await loadDetails();
        } else {
          setImportError(result.message);
        }
      } catch (err: any) {
        setImportError(`Arquivo inválido: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const formatTimeAgo = (timestamp: number | null) => {
    if (!timestamp) return 'Nunca sincronizado nesta sessão';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return `há ${diff}s atrás`;
    if (diff < 3600) return `há ${Math.floor(diff / 60)} min atrás`;
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div
      id="offlineSyncModalOverlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal rounded-[2.5rem] w-full max-w-2xl overflow-hidden flex flex-col shadow-2xl border border-slate-800 max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900/90 to-slate-950/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Central de Sincronização & Modo Offline
              </h2>
              <p className="text-xs text-slate-400">
                Arquitetura Offline-First com persistência local IndexedDB
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-6 pt-4 border-b border-slate-800/80 gap-2 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('status')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'status'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Diagnóstico de Conexão</span>
          </button>

          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'queue'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Fila de Operações ({syncOverview.pendingCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('backup')}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === 'backup'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-500/5'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup Local (IndexedDB)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: STATUS & DIAGNOSTICS */}
          {activeTab === 'status' && (
            <div className="space-y-5">
              {/* 4 Pillars Status Bento Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Internet Connectivity */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl ${
                      syncOverview.isOnline
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {syncOverview.isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      1. Rede / Internet
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                      <span className={syncOverview.isOnline ? 'text-emerald-400' : 'text-amber-400'}>
                        {syncOverview.isOnline ? 'Online (Conectado)' : 'Offline (Sem Rede)'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {syncOverview.isOnline
                        ? `Latência: ${syncOverview.pingMs || 15}ms`
                        : 'O sistema opera com dados locais em cache'}
                    </p>
                  </div>
                </div>

                {/* 2. Central Server Status */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl ${
                      syncOverview.isServerReachable
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      2. Servidor Hossidev
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      <span className={syncOverview.isServerReachable ? 'text-emerald-400' : 'text-rose-400'}>
                        {syncOverview.isServerReachable ? 'Disponível (200 OK)' : 'Indisponível / Timeout'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {syncOverview.isServerReachable ? 'APIs e banco na nuvem sincronizados' : 'Operações enfileiradas localmente'}
                    </p>
                  </div>
                </div>

                {/* 3. Hardware USB / Serial Connection */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl ${
                      syncOverview.isSerialConnected
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    <Usb className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      3. Comunicação Serial USB
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      <span className={syncOverview.isSerialConnected ? 'text-emerald-400' : 'text-slate-400'}>
                        {syncOverview.isSerialConnected ? 'Conectado (115.200 bps)' : 'Repouso / Desconectado'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {syncOverview.isSerialConnected
                        ? 'Leituras recebidas diretamente no navegador'
                        : 'Aguardando conexão física via Web Serial'}
                    </p>
                  </div>
                </div>

                {/* 4. Local DB & Sync Queue */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3.5">
                  <div
                    className={`p-2.5 rounded-xl ${
                      syncOverview.pendingCount === 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                      4. Fila de Sincronização
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      <span className={syncOverview.pendingCount === 0 ? 'text-emerald-400' : 'text-amber-400'}>
                        {syncOverview.pendingCount === 0
                          ? '100% Sincronizado'
                          : `${syncOverview.pendingCount} pendente(s)`}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Última sincronização: {formatTimeAgo(syncOverview.lastSyncTime)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sync Actions Strip */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-xs text-slate-300">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  <span>
                    Status atual: <strong className="text-white uppercase font-mono">{syncOverview.state}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    id="modal-sync-now-btn"
                    onClick={handleManualSync}
                    disabled={isSyncing}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-950/40"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
                  </button>

                  {syncOverview.failedCount > 0 && (
                    <button
                      onClick={handleRetryFailed}
                      disabled={isSyncing}
                      className="px-3 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Tentar Novamente ({syncOverview.failedCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Offline Model Explanation Notice */}
              <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-xs text-slate-300 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Como o modo Offline-First protege a operação:</span>
                </div>
                <ul className="list-disc pl-5 space-y-1 text-slate-400 text-[11px]">
                  <li>
                    <strong>Login Offline:</strong> Usuários previamente autenticados podem entrar normalmente sem internet, com senhas protegidas por criptografia SHA-256 e salt local.
                  </li>
                  <li>
                    <strong>Leituras e Sensores:</strong> Leituras de tanques recebidas via cabo USB/Serial são gravadas imediatamente no IndexedDB e refletidas na interface.
                  </li>
                  <li>
                    <strong>Fila Segura:</strong> Comandos de bombas e registros de telemetria são enfileirados e sincronizados de forma idempotente assim que a conexão retornar.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: OPERATIONS QUEUE */}
          {activeTab === 'queue' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Total de operações registradas: <strong>{pendingOps.length}</strong>
                </span>
                <button
                  onClick={handleClearCompleted}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>Limpar Concluídas</span>
                </button>
              </div>

              {pendingOps.length === 0 ? (
                <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <p className="font-semibold text-white">Fila vazia!</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Todas as operações locais já foram sincronizadas com o servidor.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {pendingOps.map((op) => (
                    <div
                      key={op.id}
                      className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between text-xs gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            op.estado === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : op.estado === 'failed'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {op.estado}
                        </span>
                        <div>
                          <div className="font-semibold text-white font-mono text-[11px]">
                            {op.tipoOperacao} • {op.entidade} #{String(op.entidadeId)}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Criado: {new Date(op.criadoEm).toLocaleTimeString()} • Tentativas: {op.tentativas}
                            {op.últimoErro && <span className="text-rose-400 ml-1">({op.últimoErro})</span>}
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono">
                        {op.id.slice(0, 8)}...
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOCAL DB BACKUP */}
          {activeTab === 'backup' && (
            <div className="space-y-5">
              {/* Stats Grid */}
              {dbStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                    <div className="text-lg font-bold font-mono text-cyan-400">{dbStats.usersCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Usuários Locais</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                    <div className="text-lg font-bold font-mono text-cyan-400">{dbStats.tanksCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Tanques em Cache</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                    <div className="text-lg font-bold font-mono text-cyan-400">{dbStats.readingsCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Leituras Locais</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 text-center">
                    <div className="text-lg font-bold font-mono text-cyan-400">{dbStats.eventsCount}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold mt-0.5">Eventos Gravados</div>
                  </div>
                </div>
              )}

              {/* Backup Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Export */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Download className="w-4 h-4 text-cyan-400" />
                      <span>Exportar Base Local</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Gera um arquivo JSON completo contendo todos os dados offline (usuários, histórico de leituras e configurações).
                    </p>
                  </div>
                  <button
                    onClick={handleExportBackup}
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Baixar Arquivo .json</span>
                  </button>
                </div>

                {/* Import */}
                <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Restaurar Base Local</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Carregue um arquivo de backup local previamente salvo nesta ou em outra máquina de controle.
                    </p>
                  </div>

                  <label className="w-full py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Selecionar Arquivo .json</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportFile}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {importStatus && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{importStatus}</span>
                </div>
              )}

              {importError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{importError}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>Hossidev Water Monitor • IndexedDB Engine</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
