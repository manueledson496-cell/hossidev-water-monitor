import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  Activity,
  AlertCircle,
  KeyRound,
  CheckSquare,
  Square,
  WifiOff,
  Wifi,
} from 'lucide-react';
import { api } from '../services/api';
import { AuthUser } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onSuccess: (user: AuthUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onSuccess }) => {
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('admin123@Hossidev');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!identifier.trim() || !password.trim()) {
        throw new Error('Informe o usuário/e-mail e a senha.');
      }
      const res = await api.auth.login(identifier.trim(), password, rememberMe);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setIdentifier('admin');
    setPassword('admin123@Hossidev');
    setError(null);
  };

  return (
    <div
      id="authScreenOverlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300"
    >
      <div className="glass-modal rounded-[2.5rem] w-full max-w-md overflow-hidden flex flex-col shadow-2xl border border-slate-800">
        {/* Brand Header */}
        <div className="p-6 bg-gradient-to-b from-slate-900/90 to-slate-950/80 border-b border-slate-800 flex flex-col items-center text-center">
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mb-3 shadow-lg shadow-cyan-950/50">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Hossidev Water Monitor
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Condomínio Kizomba • Telemetria e SCADA 100% Real
          </p>

          {/* Connection Status pill */}
          <div className="mt-3">
            {isOnline ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
                <Wifi className="w-3 h-3" />
                <span>Modo Online • Conectado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
                <WifiOff className="w-3 h-3" />
                <span>Modo Offline • Autenticação Local Habilitada</span>
              </span>
            )}
          </div>
        </div>

        {/* Access Notice */}
        <div className="px-6 pt-4 pb-2 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-semibold">
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>Autenticação de Acesso ao Sistema</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
            {isOnline
              ? 'Área restrita. O acesso é exclusivo para contas autorizadas e previamente cadastradas pelo Administrador.'
              : 'Você está offline. O login será validado usando a credencial criptografada segura salva na base local deste dispositivo.'}
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 pt-3 space-y-4">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Usuário ou E-mail
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-identifier-input"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="admin ou seu e-mail"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Senha
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/80 border border-slate-700 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              />
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="flex items-center justify-between pt-0.5 pb-1">
            <button
              id="remember-me-toggle-btn"
              type="button"
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-2 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer select-none"
            >
              {rememberMe ? (
                <CheckSquare className="w-4 h-4 text-cyan-400" />
              ) : (
                <Square className="w-4 h-4 text-slate-500" />
              )}
              <span className="text-[11px] font-medium">Lembrar-me neste dispositivo (7 dias)</span>
            </button>
          </div>

          <button
            id="btn-login-submit"
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-2xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 mt-2"
          >
            {loading ? (
              <span>Autenticando...</span>
            ) : (
              <>
                <span>{isOnline ? 'Entrar no Painel SCADA' : 'Entrar no Modo Offline'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-1">
            <button
              type="button"
              onClick={handleFillDemoAdmin}
              className="w-full py-2 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Preencher Acesso Administrador (admin / admin123@Hossidev)</span>
            </button>
          </div>
        </form>

        {/* Footer info */}
        <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Sessão segura persistida localmente (IndexedDB) com RBAC e SHA-256.</span>
        </div>
      </div>
    </div>
  );
};
