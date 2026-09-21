import React, { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Database,
  Sliders,
  UserPlus,
  Shield,
  Trash2,
  Edit3,
  Check,
  X,
  Lock,
  CheckSquare,
  Square,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  HardDrive,
  Clock,
  Volume2,
  VolumeX,
  Search,
  KeyRound,
  FileCheck,
  AlertTriangle,
  Info,
  Droplets,
  Gauge,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { UserManagementItem, AuthUser } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser;
  onUserUpdated?: (updatedUser: AuthUser) => void;
  onSystemConfigChanged?: () => void;
}

const AVAILABLE_TANKS = [
  { id: 1, name: 'Tanque FW1 (Tratada)', sector: 'Tratada', sectorLabel: 'Água Tratada', capacity: '20.000 L', defaultCap: 20000 },
  { id: 2, name: 'Tanque FW2 (Tratada)', sector: 'Tratada', sectorLabel: 'Água Tratada', capacity: '20.000 L', defaultCap: 20000 },
  { id: 3, name: 'Tanque RW1 (Não Tratada)', sector: 'Não Tratada', sectorLabel: 'Água Não Tratada', capacity: '25.000 L', defaultCap: 25000 },
  { id: 4, name: 'Tanque RW2 (Não Tratada)', sector: 'Não Tratada', sectorLabel: 'Água Não Tratada', capacity: '25.000 L', defaultCap: 25000 },
  { id: 5, name: 'Tanque WW1 (Bruta)', sector: 'Bruta', sectorLabel: 'Água Bruta', capacity: '30.000 L', defaultCap: 30000 },
  { id: 6, name: 'Tanque WW2 (Bruta)', sector: 'Bruta', sectorLabel: 'Água Bruta', capacity: '30.000 L', defaultCap: 30000 },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserUpdated,
  onSystemConfigChanged,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'tanks' | 'backup' | 'system'>('users');

  // Users State
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // New User Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [newPermittedTanks, setNewPermittedTanks] = useState<number[]>([1, 2, 3, 4, 5, 6]);

  // Edit User State (Full user data editing)
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editPermittedTanks, setEditPermittedTanks] = useState<number[]>([]);
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Reset Password Quick Form
  const [resetPwdUserId, setResetPwdUserId] = useState<string | null>(null);
  const [quickNewPassword, setQuickNewPassword] = useState('');

  // Tank Capacities State (Optional customization per tank)
  const [tankCapacities, setTankCapacities] = useState<{ [id: number]: number }>({
    1: 20000,
    2: 20000,
    3: 25000,
    4: 25000,
    5: 30000,
    6: 30000,
  });
  const [loadingTanks, setLoadingTanks] = useState(false);
  const [savingTanks, setSavingTanks] = useState(false);
  const [tanksSuccess, setTanksSuccess] = useState<string | null>(null);
  const [tanksError, setTanksError] = useState<string | null>(null);

  const totalCondoCapacity = (Object.values(tankCapacities) as number[]).reduce(
    (acc: number, val: number) => acc + (Number(val) || 0),
    0
  );

  // Backup & Restore State
  const [dbStats, setDbStats] = useState<{
    fileSizeBytes: number;
    usersCount: number;
    historyCount: number;
    logsCount: number;
    lastBackupAt?: string;
    uptimeSeconds: number;
  } | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePreview, setRestorePreview] = useState<any | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  // System Configuration State
  const [systemConfig, setSystemConfig] = useState({
    audioAlarmEnabled: true,
    emergencyLockout: false,
    watchdogTimeoutMs: 8000,
    dailyConsumptionEstimateLiters: 28000,
    lowLevelAlertPercentage: 20,
    criticalLevelAlertPercentage: 10,
    condominiumName: 'Condomínio Residencial Kizomba',
    lastBackupAt: '',
  });
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  // Load Users List
  const loadUsers = async () => {
    setLoadingUsers(true);
    setUserError(null);
    try {
      const res = await api.admin.getUsers();
      setUsers(res.users);
    } catch (err: any) {
      setUserError(err.message || 'Erro ao carregar usuários.');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load DB Stats
  const loadStats = async () => {
    try {
      const res = await api.admin.getStats();
      if (res.success) {
        setDbStats(res.stats);
      }
    } catch (err) {
      console.warn('Erro ao carregar estatísticas do banco:', err);
    }
  };

  // Load Tanks Configuration
  const loadTanks = async () => {
    setLoadingTanks(true);
    try {
      const res = await api.admin.getTanks();
      if (res.success && Array.isArray(res.tanks)) {
        const caps: Record<number, number> = {};
        for (const t of res.tanks) {
          caps[t.id] = t.capacityLiters || (t.id <= 2 ? 20000 : t.id <= 4 ? 25000 : 30000);
        }
        setTankCapacities(caps);
      }
    } catch (err) {
      console.warn('Erro ao carregar capacidades dos reservatórios:', err);
    } finally {
      setLoadingTanks(false);
    }
  };

  // Load System Config
  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const res = await api.admin.getConfig();
      if (res.success && res.config) {
        setSystemConfig((prev) => ({
          ...prev,
          ...res.config,
        }));
      }
    } catch (err: any) {
      setConfigError(err.message || 'Erro ao carregar definições do sistema.');
    } finally {
      setConfigLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadStats();
      loadConfig();
      loadTanks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Save Tank Capacities
  const handleSaveTankCapacities = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingTanks(true);
    setTanksError(null);
    setTanksSuccess(null);
    try {
      const res = await api.admin.updateTankCapacities(tankCapacities);
      if (res.success) {
        setTanksSuccess('Capacidades volumétricas dos 6 reservatórios salvas e sincronizadas com sucesso no SCADA!');
        onSystemConfigChanged?.();
      }
    } catch (err: any) {
      setTanksError(err.message || 'Erro ao salvar capacidades dos reservatórios.');
    } finally {
      setSavingTanks(false);
    }
  };

  // Handle Reset Tank Capacities to Engineering Defaults
  const handleResetTankCapacities = async () => {
    setSavingTanks(true);
    setTanksError(null);
    setTanksSuccess(null);
    try {
      const res = await api.admin.resetTankCapacities();
      if (res.success) {
        setTankCapacities({
          1: 20000,
          2: 20000,
          3: 25000,
          4: 25000,
          5: 30000,
          6: 30000,
        });
        setTanksSuccess('Capacidades redefinidas para o padrão de projeto de engenharia (150.000 L total)!');
        onSystemConfigChanged?.();
      }
    } catch (err: any) {
      setTanksError(err.message || 'Erro ao redefinir capacidades.');
    } finally {
      setSavingTanks(false);
    }
  };

  // Handle Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    setUserSuccess(null);

    if (newUsername.trim().length < 3) {
      setUserError('O nome de usuário deve ter no mínimo 3 caracteres.');
      return;
    }

    if (newPassword.length < 6) {
      setUserError('A senha inicial deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      const res = await api.admin.createUser({
        username: newUsername.trim(),
        name: newName.trim() || newUsername.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        permittedTankIds: newRole === 'admin' ? [1, 2, 3, 4, 5, 6] : newPermittedTanks,
      });

      setUserSuccess(`Usuário @${newUsername.trim()} cadastrado com sucesso!`);
      setShowCreateForm(false);
      setNewUsername('');
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setNewPermittedTanks([1, 2, 3, 4, 5, 6]);
      loadUsers();
      loadStats();
    } catch (err: any) {
      setUserError(err.message || 'Erro ao criar usuário.');
    }
  };

  // Start Editing User
  const handleStartEdit = (user: UserManagementItem) => {
    setEditingUserId(user.id);
    setEditUsername(user.username);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPermittedTanks(user.permittedTankIds || [1, 2]);
    setEditPassword('');
    setUserError(null);
    setUserSuccess(null);
  };

  // Save Edited User Data
  const handleSaveEdit = async (userId: string) => {
    setUserError(null);
    setUserSuccess(null);
    setSavingEdit(true);

    try {
      const res = await api.admin.updateUser(userId, {
        username: editUsername.trim(),
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        permittedTankIds: editRole === 'admin' ? [1, 2, 3, 4, 5, 6] : editPermittedTanks,
        password: editPassword.trim().length >= 6 ? editPassword.trim() : undefined,
      });

      setUserSuccess(`Dados de @${res.user.username} atualizados com sucesso!`);
      setEditingUserId(null);

      // If current logged-in user was updated, notify parent
      if (userId === currentUser.id && onUserUpdated) {
        onUserUpdated({
          ...currentUser,
          username: res.user.username,
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          permittedTankIds: res.user.permittedTankIds,
        });
      }

      loadUsers();
    } catch (err: any) {
      setUserError(err.message || 'Erro ao salvar alterações do usuário.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Quick Password Reset
  const handleQuickResetPassword = async (userId: string, username: string) => {
    if (!quickNewPassword || quickNewPassword.length < 6) {
      setUserError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setUserError(null);
    setUserSuccess(null);

    try {
      await api.admin.resetPassword(userId, quickNewPassword);
      setUserSuccess(`Senha do usuário @${username} redefinida com sucesso!`);
      setResetPwdUserId(null);
      setQuickNewPassword('');
    } catch (err: any) {
      setUserError(err.message || 'Erro ao redefinir senha.');
    }
  };

  // Delete User
  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "@${username}"? Esta ação é irreversível.`)) return;

    setUserError(null);
    setUserSuccess(null);

    try {
      await api.admin.deleteUser(userId);
      setUserSuccess(`Usuário "@${username}" removido do sistema.`);
      loadUsers();
      loadStats();
    } catch (err: any) {
      setUserError(err.message || 'Erro ao remover usuário.');
    }
  };

  // Toggle Tank Permission in List
  const toggleTankSelection = (tankId: number, currentList: number[], setter: (v: number[]) => void) => {
    if (currentList.includes(tankId)) {
      if (currentList.length === 1) {
        setUserError('O usuário deve ter permissão para pelo menos um reservatório.');
        return;
      }
      setter(currentList.filter((id) => id !== tankId));
    } else {
      setter([...currentList, tankId]);
    }
  };

  // Select all tanks
  const handleSelectAllTanks = (setter: (v: number[]) => void) => {
    setter([1, 2, 3, 4, 5, 6]);
  };

  // Download Backup JSON
  const handleDownloadBackup = async () => {
    setBackupLoading(true);
    try {
      const backupData = await api.admin.getBackup();
      const now = new Date();
      const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `hossidev-scada-backup-${dateStr}.json`;

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setUserSuccess(`Backup completo exportado com sucesso: ${filename}`);
      loadStats();
    } catch (err: any) {
      setRestoreError(err.message || 'Erro ao gerar arquivo de backup.');
    } finally {
      setBackupLoading(false);
    }
  };

  // Handle Restore File Selection
  const handleRestoreFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRestoreError(null);
    setRestoreSuccess(null);
    setRestorePreview(null);

    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setRestoreError('Por favor selecione um arquivo válido no formato .json');
      return;
    }

    setRestoreFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed || typeof parsed !== 'object') {
          throw new Error('Formato de backup inválido.');
        }

        if (!Array.isArray(parsed.users) || !parsed.currentTanks) {
          throw new Error('O arquivo de backup não contém a estrutura compatível do Hossidev SCADA.');
        }

        setRestorePreview({
          version: parsed.metadata?.version || '2.x',
          exportedAt: parsed.metadata?.exportedAt || 'Desconhecida',
          usersCount: parsed.users?.length || 0,
          historyCount: parsed.telemetryHistory?.length || 0,
          logsCount: parsed.logs?.length || 0,
          data: parsed,
        });
      } catch (err: any) {
        setRestoreError(`Arquivo corrompido ou incompatível: ${err.message}`);
        setRestoreFile(null);
        setRestorePreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Execute Restore
  const handleExecuteRestore = async () => {
    if (!restorePreview || !restorePreview.data) return;

    const confirmMsg =
      'ATENÇÃO: Restaurar o backup substituirá todos os usuários, histórico de telemetria e configurações atuais do servidor pelos dados contidos no arquivo.\n\nDeseja continuar?';
    if (!window.confirm(confirmMsg)) return;

    setRestoring(true);
    setRestoreError(null);
    setRestoreSuccess(null);

    try {
      const res = await api.admin.restoreBackup(restorePreview.data);
      setRestoreSuccess(
        `Banco de dados restaurado com sucesso! (${res.stats?.usersCount || 0} usuários e ${res.stats?.historyCount || 0} registros históricos recuperados)`
      );
      setRestorePreview(null);
      setRestoreFile(null);
      loadUsers();
      loadStats();
      loadConfig();
      if (onSystemConfigChanged) onSystemConfigChanged();
    } catch (err: any) {
      setRestoreError(err.message || 'Falha ao restaurar banco de dados.');
    } finally {
      setRestoring(false);
    }
  };

  // Save System Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigSuccess(null);
    setConfigError(null);

    try {
      const res = await api.admin.updateConfig(systemConfig);
      setConfigSuccess('Definições do sistema atualizadas e salvas com sucesso!');
      if (onSystemConfigChanged) onSystemConfigChanged();
    } catch (err: any) {
      setConfigError(err.message || 'Erro ao salvar definições do sistema.');
    } finally {
      setConfigSaving(false);
    }
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    if (!searchUser.trim()) return true;
    const q = searchUser.toLowerCase();
    return (
      u.username.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  return (
    <div
      id="settingsManagementModal"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="glass-modal rounded-[2.5rem] w-full max-w-4xl overflow-hidden flex flex-col shadow-2xl border border-slate-800 max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Definições do Sistema & Gestão de Usuários</span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                  ADMINISTRADOR
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-medium">
                Controle de perfis de operadores, parâmetros SCADA e backup completo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-2xl bg-slate-900/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-800/60 bg-slate-950/40 overflow-x-auto">
          <button
            onClick={() => {
              setActiveTab('users');
              setUserError(null);
              setUserSuccess(null);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'users'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Gestão de Usuários ({users.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('tanks');
              loadTanks();
              setTanksError(null);
              setTanksSuccess(null);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'tanks'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Droplets className="w-4 h-4" />
            <span>Capacidades dos Reservatórios</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('system');
              loadConfig();
              setUserError(null);
              setUserSuccess(null);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'system'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Definições do SCADA</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('backup');
              loadStats();
              setUserError(null);
              setUserSuccess(null);
            }}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'backup'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40'
                : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Backup & Restauração</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* TAB 1: USERS MANAGEMENT (CREATE AND EDIT USERS) */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {/* Alert Messages */}
              {userError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{userError}</span>
                </div>
              )}

              {userSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{userSuccess}</span>
                </div>
              )}

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchUser}
                    onChange={(e) => setSearchUser(e.target.value)}
                    placeholder="Buscar por nome, login, e-mail..."
                    className="w-full pl-9 pr-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-800 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={loadUsers}
                    className="px-3 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? 'animate-spin' : ''}`} />
                    <span>Atualizar</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowCreateForm(!showCreateForm);
                      setEditingUserId(null);
                    }}
                    className="px-4 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-950/40 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{showCreateForm ? 'Fechar Cadastro' : 'Cadastrar Novo Usuário'}</span>
                  </button>
                </div>
              </div>

              {/* CREATE USER DRAWER FORM */}
              {showCreateForm && (
                <form
                  onSubmit={handleCreateUser}
                  className="p-5 rounded-3xl bg-slate-900/90 border border-cyan-500/30 space-y-4 shadow-xl animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <UserPlus className="w-4 h-4 text-cyan-400" />
                      <span>Cadastrar Novo Usuário / Operador no Sistema</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nome Completo *</label>
                      <input
                        type="text"
                        required
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Nome de Usuário (Login) *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                        placeholder="Ex: joao_operador"
                        className="w-full px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">E-mail *</label>
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="joao@kizomba.com"
                        className="w-full px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Senha Inicial *</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">Função / Nível de Acesso</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNewRole('user')}
                          className={`p-2 rounded-2xl border text-xs font-bold transition-all ${
                            newRole === 'user'
                              ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          Usuário / Operador
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewRole('admin');
                            setNewPermittedTanks([1, 2, 3, 4, 5, 6]);
                          }}
                          className={`p-2 rounded-2xl border text-xs font-bold transition-all ${
                            newRole === 'admin'
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400'
                          }`}
                        >
                          Administrador Total
                        </button>
                      </div>
                    </div>
                  </div>

                  {newRole === 'user' && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                        <label className="block text-[11px] font-semibold text-slate-300">
                          Reservatórios Permitidos para este Operador:
                        </label>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setNewPermittedTanks([1, 2, 3, 4, 5, 6])}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 cursor-pointer"
                          >
                            Todos (FW1-WW2)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewPermittedTanks([1, 2])}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 cursor-pointer"
                          >
                            Tratada (FW1-FW2)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewPermittedTanks([3, 4])}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20 hover:bg-sky-500/20 cursor-pointer"
                          >
                            Não Tratada (RW1-RW2)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewPermittedTanks([5, 6])}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer"
                          >
                            Bruta (WW1-WW2)
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewPermittedTanks([])}
                            className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                          >
                            Limpar
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {AVAILABLE_TANKS.map((tank) => {
                          const isSelected = newPermittedTanks.includes(tank.id);
                          return (
                            <button
                              key={tank.id}
                              type="button"
                              onClick={() => toggleTankSelection(tank.id, newPermittedTanks, setNewPermittedTanks)}
                              className={`p-2.5 rounded-2xl border text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <div className="flex flex-col">
                                <span className="font-bold">{tank.name}</span>
                                <span className="text-[10px] text-slate-400">{tank.sectorLabel}</span>
                              </div>
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="px-4 py-2 rounded-2xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Cadastrar Usuário</span>
                    </button>
                  </div>
                </form>
              )}

              {/* USERS LIST CARDS */}
              <div className="space-y-3">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 text-center text-slate-400 text-xs">
                    Nenhum usuário encontrado com os filtros atuais.
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isEditing = editingUserId === user.id;
                    const isResettingPwd = resetPwdUserId === user.id;
                    const isSelf = user.id === currentUser.id;

                    return (
                      <div
                        key={user.id}
                        className={`p-4 rounded-3xl border transition-all ${
                          isEditing
                            ? 'bg-slate-950/90 border-cyan-500/50 shadow-xl shadow-cyan-950/20'
                            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        {/* Normal User Card View */}
                        {!isEditing ? (
                          <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-3 rounded-2xl ${
                                    user.role === 'admin'
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  }`}
                                >
                                  <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-bold text-white">{user.name}</span>
                                    <span className="text-xs text-cyan-400 font-mono">@{user.username}</span>
                                    {isSelf && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                        Sua Conta Atual
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 font-mono mt-0.5">{user.email}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                <span
                                  className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                                    user.role === 'admin'
                                      ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                                      : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
                                  }`}
                                >
                                  {user.role === 'admin' ? 'Administrador' : 'Operador'}
                                </span>

                                <button
                                  onClick={() => handleStartEdit(user)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="Editar Todos os Dados do Usuário"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>Editar Dados</span>
                                </button>

                                <button
                                  onClick={() => setResetPwdUserId(isResettingPwd ? null : user.id)}
                                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-300 transition-colors cursor-pointer"
                                  title="Redefinir Senha Rapidamente"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>

                                {!isSelf && (
                                  <button
                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                                    title="Excluir Usuário"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Permitted Tanks List */}
                            <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-800/60 text-xs">
                              <span className="text-[11px] text-slate-400 font-medium mr-1">Permissões de Acesso:</span>
                              {user.role === 'admin' ? (
                                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20">
                                  Acesso Total a Todos os 6 Reservatórios (SCADA & Definições)
                                </span>
                              ) : user.permittedTankIds && user.permittedTankIds.length > 0 ? (
                                user.permittedTankIds.map((tid) => (
                                  <span
                                    key={tid}
                                    className="text-[11px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-lg border border-cyan-500/20"
                                  >
                                    T{tid} (
                                    {AVAILABLE_TANKS.find((t) => t.id === tid)?.sector || `Tanque ${tid}`})
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] text-amber-400 font-mono">Sem reservatórios liberados</span>
                              )}
                            </div>

                            {/* Inline Quick Password Reset Form */}
                            {isResettingPwd && (
                              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/40 flex flex-col sm:flex-row items-center gap-2 animate-in fade-in">
                                <KeyRound className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                <span className="text-xs text-slate-300 whitespace-nowrap">
                                  Nova senha para <b>@{user.username}</b>:
                                </span>
                                <input
                                  type="password"
                                  value={quickNewPassword}
                                  onChange={(e) => setQuickNewPassword(e.target.value)}
                                  placeholder="Mínimo 6 caracteres"
                                  className="w-full sm:w-48 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-amber-400"
                                />
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                  <button
                                    onClick={() => handleQuickResetPassword(user.id, user.username)}
                                    className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold cursor-pointer"
                                  >
                                    Salvar Senha
                                  </button>
                                  <button
                                    onClick={() => setResetPwdUserId(null)}
                                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          /* COMPLETE USER DATA EDITING FORM */
                          <div className="space-y-4 animate-in fade-in">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <h4 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                                <Edit3 className="w-4 h-4" />
                                <span>Editando Dados Completos do Usuário @{user.username}</span>
                              </h4>
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="text-slate-400 hover:text-white"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nome Completo</label>
                                <input
                                  type="text"
                                  value={editName}
                                  onChange={(e) => setEditName(e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                  Nome de Usuário (Login)
                                </label>
                                <input
                                  type="text"
                                  value={editUsername}
                                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-300 mb-1">E-mail</label>
                                <input
                                  type="email"
                                  value={editEmail}
                                  onChange={(e) => setEditEmail(e.target.value)}
                                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Função</label>
                                <select
                                  value={editRole}
                                  onChange={(e) => setEditRole(e.target.value as 'admin' | 'user')}
                                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500"
                                >
                                  <option value="user">Usuário / Operador (Acesso Restrito)</option>
                                  <option value="admin">Administrador (Controle Total do SCADA)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                  Nova Senha (deixe em branco para não alterar)
                                </label>
                                <input
                                  type="password"
                                  value={editPassword}
                                  onChange={(e) => setEditPassword(e.target.value)}
                                  placeholder="Mínimo 6 caracteres para alterar"
                                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                                />
                              </div>
                            </div>

                            {editRole === 'user' && (
                              <div>
                                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                                  <label className="block text-[11px] font-semibold text-slate-300">
                                    Reservatórios Autorizados para Visualização:
                                  </label>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={() => setEditPermittedTanks([1, 2, 3, 4, 5, 6])}
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 cursor-pointer"
                                    >
                                      Todos (FW1-WW2)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditPermittedTanks([1, 2])}
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 hover:bg-cyan-500/20 cursor-pointer"
                                    >
                                      Tratada (FW1-FW2)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditPermittedTanks([3, 4])}
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-300 border border-sky-500/20 hover:bg-sky-500/20 cursor-pointer"
                                    >
                                      Não Tratada (RW1-RW2)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditPermittedTanks([5, 6])}
                                      className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/20 hover:bg-amber-500/20 cursor-pointer"
                                    >
                                      Bruta (WW1-WW2)
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditPermittedTanks([])}
                                      className="text-[10px] text-slate-400 hover:text-slate-200 cursor-pointer"
                                    >
                                      Limpar
                                    </button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                  {AVAILABLE_TANKS.map((tank) => {
                                    const isSelected = editPermittedTanks.includes(tank.id);
                                    return (
                                      <button
                                        key={tank.id}
                                        type="button"
                                        onClick={() =>
                                          toggleTankSelection(tank.id, editPermittedTanks, setEditPermittedTanks)
                                        }
                                        className={`p-2.5 rounded-2xl border text-left text-xs flex items-center justify-between transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-bold">{tank.name}</span>
                                          <span className="text-[10px] text-slate-400">{tank.sectorLabel}</span>
                                        </div>
                                        {isSelected ? (
                                          <CheckSquare className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                                        ) : (
                                          <Square className="w-4 h-4 text-slate-600 flex-shrink-0" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                              <button
                                onClick={() => setEditingUserId(null)}
                                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={() => handleSaveEdit(user.id)}
                                disabled={savingEdit}
                                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/40"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>{savingEdit ? 'Salvando...' : 'Salvar Dados do Usuário'}</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: TANK CAPACITIES (OPTIONAL VOLUMETRIC CUSTOMIZATION) */}
          {activeTab === 'tanks' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Alert Messages */}
              {tanksError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{tanksError}</span>
                </div>
              )}

              {tanksSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{tanksSuccess}</span>
                </div>
              )}

              {/* Informative Header Banner */}
              <div className="p-4 rounded-3xl bg-cyan-950/30 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-2xl bg-cyan-500/20 text-cyan-300 mt-0.5 sm:mt-0">
                    <Droplets className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>Capacidades Volumétricas dos Reservatórios</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                        Opcional / Personalizável
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                      Como administrador, você pode opcionalmente definir a capacidade volumétrica (em Litros) de cada reservatório conforme o volume físico real instalado. Os operadores autorizados visualizarão o volume e porcentagens recalculados em tempo real.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={handleResetTankCapacities}
                    disabled={savingTanks}
                    className="px-3.5 py-2 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    title="Restaurar valores nominais padrão de projeto (150.000 L)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
                    <span>Padrão de Fábrica</span>
                  </button>
                </div>
              </div>

              {/* Real-time Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-3xl bg-slate-900/70 border border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
                    <Gauge className="w-4 h-4 text-cyan-400" />
                    <span>Total Condomínio</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-cyan-300">
                    {totalCondoCapacity.toLocaleString('pt-BR')}{' '}
                    <span className="text-xs font-normal text-slate-400">L</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {(totalCondoCapacity / 1000).toFixed(1)} m³ no total
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-slate-900/70 border border-cyan-900/40">
                  <div className="flex items-center gap-1.5 text-cyan-400 text-xs mb-1">
                    <Droplets className="w-4 h-4 text-cyan-400" />
                    <span>Água Tratada (FW1+FW2)</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-cyan-300">
                    {(Number(tankCapacities[1] || 0) + Number(tankCapacities[2] || 0)).toLocaleString('pt-BR')}{' '}
                    <span className="text-xs font-normal text-slate-400">L</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {((Number(tankCapacities[1] || 0) + Number(tankCapacities[2] || 0)) / 1000).toFixed(1)} m³ (Consumo Potável)
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-slate-900/70 border border-sky-900/40">
                  <div className="flex items-center gap-1.5 text-sky-400 text-xs mb-1">
                    <Droplets className="w-4 h-4 text-sky-400" />
                    <span>Não Tratada (RW1+RW2)</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-sky-300">
                    {(Number(tankCapacities[3] || 0) + Number(tankCapacities[4] || 0)).toLocaleString('pt-BR')}{' '}
                    <span className="text-xs font-normal text-slate-400">L</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {((Number(tankCapacities[3] || 0) + Number(tankCapacities[4] || 0)) / 1000).toFixed(1)} m³ (Uso Geral)
                  </div>
                </div>

                <div className="p-4 rounded-3xl bg-slate-900/70 border border-amber-900/40">
                  <div className="flex items-center gap-1.5 text-amber-400 text-xs mb-1">
                    <Droplets className="w-4 h-4 text-amber-400" />
                    <span>Água Bruta (WW1+WW2)</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-amber-300">
                    {(Number(tankCapacities[5] || 0) + Number(tankCapacities[6] || 0)).toLocaleString('pt-BR')}{' '}
                    <span className="text-xs font-normal text-slate-400">L</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {((Number(tankCapacities[5] || 0) + Number(tankCapacities[6] || 0)) / 1000).toFixed(1)} m³ (Captação Poço)
                  </div>
                </div>
              </div>

              {/* Tank Cards Grid */}
              <form onSubmit={handleSaveTankCapacities} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {AVAILABLE_TANKS.map((tank) => {
                    const currentCap = Number(tankCapacities[tank.id] ?? tank.defaultCap);
                    const isDefault = currentCap === tank.defaultCap;
                    const sectorColor =
                      tank.id <= 2
                        ? 'border-cyan-500/40 bg-cyan-950/20 text-cyan-300'
                        : tank.id <= 4
                        ? 'border-sky-500/40 bg-sky-950/20 text-sky-300'
                        : 'border-amber-500/40 bg-amber-950/20 text-amber-300';
                    const nodeLabel =
                      tank.id <= 2
                        ? 'Placa Nó 1 (Principal Tratada)'
                        : tank.id <= 4
                        ? 'Placa Nó 2 (Não Tratada)'
                        : 'Placa Nó 3 (Água Bruta Poço)';

                    return (
                      <div
                        key={tank.id}
                        className="p-4 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
                      >
                        {/* Tank Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-white font-mono text-xs font-bold flex items-center justify-center">
                                T{tank.id}
                              </span>
                              <h4 className="text-sm font-bold text-white">{tank.name}</h4>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">{nodeLabel}</span>
                          </div>

                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${sectorColor}`}>
                            {tank.sector}
                          </span>
                        </div>

                        {/* Capacity Input Field */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-slate-300">
                              Capacidade Máxima (Litros)
                            </label>
                            <span className="text-[11px] font-mono font-bold text-cyan-400">
                              {(currentCap / 1000).toLocaleString('pt-BR', {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}{' '}
                              m³
                            </span>
                          </div>

                          <div className="relative">
                            <input
                              type="number"
                              min={1000}
                              max={2000000}
                              step={500}
                              required
                              value={tankCapacities[tank.id] ?? tank.defaultCap}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setTankCapacities((prev) => ({
                                  ...prev,
                                  [tank.id]: val,
                                }));
                              }}
                              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950/90 border border-slate-700 text-white text-sm font-mono focus:border-cyan-500 focus:outline-none pr-12"
                            />
                            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-500 pointer-events-none">
                              L
                            </span>
                          </div>
                        </div>

                        {/* Presets and Defaults info */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-[11px]">
                          <span className="text-slate-500">
                            Padrão: <span className="font-mono text-slate-400">{tank.defaultCap.toLocaleString('pt-BR')} L</span>
                          </span>

                          {!isDefault ? (
                            <button
                              type="button"
                              onClick={() =>
                                setTankCapacities((prev) => ({
                                  ...prev,
                                  [tank.id]: tank.defaultCap,
                                }))
                              }
                              className="text-[10px] font-semibold text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                            >
                              Restaurar ({tank.defaultCap / 1000} m³)
                            </button>
                          ) : (
                            <span className="text-[10px] font-mono text-emerald-400/80">✓ Valor Nominal</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Save Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-3xl bg-slate-900/60 border border-slate-800">
                  <div className="text-xs text-slate-400">
                    <span className="text-white font-medium">Nota de Operação:</span> As alterações entram em vigor imediatamente para todos os operadores conectados ao SCADA.
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      type="submit"
                      disabled={savingTanks}
                      className="px-6 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 transition-all flex items-center gap-2 cursor-pointer w-full sm:w-auto justify-center"
                    >
                      <Check className="w-4 h-4" />
                      <span>{savingTanks ? 'Salvando...' : 'Salvar Capacidades dos Reservatórios'}</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: BACKUP & RESTAURAÇÃO COMPLETA */}
          {activeTab === 'backup' && (
            <div className="space-y-6">
              {restoreError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{restoreError}</span>
                </div>
              )}

              {restoreSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{restoreSuccess}</span>
                </div>
              )}

              {/* Database Overview Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Users className="w-4 h-4 text-cyan-400" />
                    <span>Usuários</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-white">{dbStats?.usersCount ?? users.length}</div>
                  <div className="text-[10px] text-slate-500">Contas cadastradas</div>
                </div>

                <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Database className="w-4 h-4 text-sky-400" />
                    <span>Telemetria Real</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-cyan-400">{dbStats?.historyCount ?? 0}</div>
                  <div className="text-[10px] text-slate-500">Leituras registradas</div>
                </div>

                <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <HardDrive className="w-4 h-4 text-emerald-400" />
                    <span>Tamanho do DB</span>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-400">
                    {dbStats?.fileSizeBytes ? `${(dbStats.fileSizeBytes / 1024).toFixed(1)} KB` : 'Ativo'}
                  </div>
                  <div className="text-[10px] text-slate-500">Formato JSON Persistente</div>
                </div>

                <div className="p-4 rounded-3xl bg-slate-900/60 border border-slate-800">
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>Último Backup</span>
                  </div>
                  <div className="text-xs font-bold font-mono text-slate-200 mt-1">
                    {dbStats?.lastBackupAt ? new Date(dbStats.lastBackupAt).toLocaleDateString() : 'Não exportado'}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {dbStats?.lastBackupAt ? new Date(dbStats.lastBackupAt).toLocaleTimeString() : 'Gere seu primeiro backup'}
                  </div>
                </div>
              </div>

              {/* BACKUP EXPORT SECTION */}
              <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Exportar Backup Completo do Sistema</h3>
                      <p className="text-xs text-slate-400 max-w-xl">
                        Gera um arquivo <code className="text-cyan-300 font-mono">.json</code> contendo todos os usuários e senhas criptografadas, leituras históricas dos 6 reservatórios, definições SCADA e logs de comunicação.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadBackup}
                    disabled={backupLoading}
                    className="px-5 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-950/40 transition-all flex items-center gap-2 cursor-pointer flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>{backupLoading ? 'Gerando...' : 'Baixar Backup Completo (.JSON)'}</span>
                  </button>
                </div>
              </div>

              {/* RESTORE SECTION */}
              <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Restaurar Banco de Dados a Partir de Backup</h3>
                    <p className="text-xs text-slate-400">
                      Carregue um arquivo de backup previamente exportado para recuperar dados de usuários e histórico.
                    </p>
                  </div>
                </div>

                {/* File Upload Drop Area */}
                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-700 hover:border-cyan-500/50 bg-slate-950/60 flex flex-col items-center justify-center gap-3 transition-colors text-center">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      Clique para selecionar o arquivo de backup ou arraste para cá
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Suporte a arquivos .json gerados pelo Hossidev SCADA</p>
                  </div>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleRestoreFileSelected}
                    className="hidden"
                    id="backup-file-upload-input"
                  />
                  <label
                    htmlFor="backup-file-upload-input"
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
                  >
                    Procurar Arquivo no Computador
                  </label>
                </div>

                {/* Restore Preview Summary */}
                {restorePreview && (
                  <div className="p-4 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-3 animate-in fade-in">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                      <FileCheck className="w-4 h-4" />
                      <span>Arquivo de Backup Validado com Sucesso!</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 text-[10px] block">Versão do Sistema:</span>
                        <span className="font-bold text-white font-mono">{restorePreview.version}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 text-[10px] block">Usuários a Restaurar:</span>
                        <span className="font-bold text-cyan-400 font-mono">{restorePreview.usersCount} contas</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 text-[10px] block">Registros Históricos:</span>
                        <span className="font-bold text-emerald-400 font-mono">{restorePreview.historyCount} leituras</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                        <span className="text-slate-400 text-[10px] block">Data do Backup:</span>
                        <span className="font-bold text-slate-200 font-mono text-[11px]">
                          {new Date(restorePreview.exportedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                      <span className="text-xs text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        Esta operação substituirá os dados atuais em memória e no disco.
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setRestorePreview(null);
                            setRestoreFile(null);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleExecuteRestore}
                          disabled={restoring}
                          className="px-5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/40"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{restoring ? 'Restaurando...' : 'Confirmar e Restaurar Banco'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SYSTEM SCADA DEFINITIONS & PARAMETERS */}
          {activeTab === 'system' && (
            <form onSubmit={handleSaveConfig} className="space-y-4">
              {configError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{configError}</span>
                </div>
              )}

              {configSuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{configSuccess}</span>
                </div>
              )}

              <div className="p-5 rounded-3xl bg-slate-900/70 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>Parâmetros de Operação & Telemetria do Condomínio</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Nome do Empreendimento</label>
                    <input
                      type="text"
                      value={systemConfig.condominiumName || ''}
                      onChange={(e) => setSystemConfig({ ...systemConfig, condominiumName: e.target.value })}
                      placeholder="Ex: Condomínio Residencial Kizomba"
                      className="w-full px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 text-white text-xs focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Timeout do Watchdog Serial (ms)
                    </label>
                    <input
                      type="number"
                      min={2000}
                      max={60000}
                      step={500}
                      value={systemConfig.watchdogTimeoutMs}
                      onChange={(e) =>
                        setSystemConfig({ ...systemConfig, watchdogTimeoutMs: Number(e.target.value) })
                      }
                      className="w-full px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">
                      Tempo limite sem pacotes antes de marcar o nó da central como Offline (padrão: 8000ms).
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Estimativa de Consumo Diário do Condomínio (Litros/dia)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      max={200000}
                      step={500}
                      value={systemConfig.dailyConsumptionEstimateLiters || 28000}
                      onChange={(e) =>
                        setSystemConfig({
                          ...systemConfig,
                          dailyConsumptionEstimateLiters: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">
                      Usado para estimar com precisão as horas de autonomia em tempo real.
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Limiar de Nível Baixo de Alerta (%)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={50}
                      value={systemConfig.lowLevelAlertPercentage || 20}
                      onChange={(e) =>
                        setSystemConfig({
                          ...systemConfig,
                          lowLevelAlertPercentage: Number(e.target.value),
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-2xl bg-slate-950/90 border border-slate-700 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">
                      Nível de reserva percentual para disparar alarme visual amarelo (padrão: 20%).
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                      {systemConfig.audioAlarmEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Sintetizador de Áudio & Sirene de Falhas</span>
                      <span className="text-[11px] text-slate-400">
                        Reproduz bips de aviso no navegador quando uma prova de nível for rompida ou o reservatório estiver crítico.
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSystemConfig({
                        ...systemConfig,
                        audioAlarmEnabled: !systemConfig.audioAlarmEnabled,
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                      systemConfig.audioAlarmEnabled
                        ? 'bg-cyan-600 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {systemConfig.audioAlarmEnabled ? 'Habilitado' : 'Desabilitado'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Capacidade dos 6 Reservatórios (Opcional)</span>
                      <span className="text-[11px] text-slate-400">
                        Total atual configurado:{' '}
                        <span className="text-cyan-300 font-mono font-bold">
                          {totalCondoCapacity.toLocaleString('pt-BR')} Litros
                        </span>{' '}
                        ({(totalCondoCapacity / 1000).toFixed(1)} m³)
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('tanks');
                      setTanksError(null);
                      setTanksSuccess(null);
                    }}
                    className="px-3.5 py-1.5 rounded-xl font-bold text-xs bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 transition-colors cursor-pointer"
                  >
                    Ajustar Litragem
                  </button>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="submit"
                    disabled={configSaving}
                    className="px-6 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>{configSaving ? 'Salvando...' : 'Salvar Definições no Servidor'}</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
