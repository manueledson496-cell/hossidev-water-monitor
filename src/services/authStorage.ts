import { AuthUser, StoredSession } from '../types';

/**
 * Service de Persistência Local e Gerenciamento de Sessão de Usuário
 * Responsável pelo armazenamento seguro, verificação de expiração,
 * diferenciação entre localStorage (Lembrar-me) e sessionStorage,
 * e fornecimento de helpers para RBAC e controle de acesso aos reservatórios.
 */

const STORAGE_KEYS = {
  SESSION: 'hossidev_scada_session',
  TOKEN: 'hossidev_scada_token',
  USER: 'hossidev_scada_user',
  REMEMBER: 'hossidev_scada_remember',
} as const;

// Padrão de expiração: 7 dias se "Lembrar-me" estiver ativado, 12 horas se for sessão temporária
const DEFAULT_REMEMBER_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_SESSION_EXPIRE_MS = 12 * 60 * 60 * 1000;

class AuthStorageService {
  /**
   * Helper seguro para ler do localStorage ou sessionStorage
   */
  private getStorageItem(key: string): { value: string | null; fromLocal: boolean } {
    try {
      const localVal = localStorage.getItem(key);
      if (localVal !== null) {
        return { value: localVal, fromLocal: true };
      }
    } catch (e) {
      console.warn('localStorage inacessível:', e);
    }

    try {
      const sessionVal = sessionStorage.getItem(key);
      if (sessionVal !== null) {
        return { value: sessionVal, fromLocal: false };
      }
    } catch (e) {
      console.warn('sessionStorage inacessível:', e);
    }

    return { value: null, fromLocal: false };
  }

  /**
   * Salva a sessão do usuário no storage apropriado (localStorage ou sessionStorage)
   * @param userData Dados do perfil e permissões do usuário
   * @param token Token JWT / Identificador de sessão
   * @param rememberMe Se verdadeiro, persiste em localStorage; caso contrário, sessionStorage
   * @param customExpireMs Tempo de expiração customizado em milissegundos
   */
  public saveSession(
    userData: AuthUser,
    token: string,
    rememberMe: boolean = true,
    customExpireMs?: number
  ): StoredSession {
    const now = Date.now();
    const duration = customExpireMs ?? (rememberMe ? DEFAULT_REMEMBER_EXPIRE_MS : DEFAULT_SESSION_EXPIRE_MS);
    const expiresAt = now + duration;

    const assignedTankIds = Array.isArray(userData.permittedTankIds) && userData.permittedTankIds.length > 0
      ? userData.permittedTankIds
      : [1, 2, 3, 4, 5, 6];

    const normalizedUser: AuthUser = {
      id: userData.id,
      username: userData.username,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      permittedTankIds: assignedTankIds,
      assignedTankIds,
    };

    const sessionData: StoredSession = {
      token,
      user: normalizedUser,
      userId: userData.id,
      username: userData.username,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      assignedTankIds,
      permittedTankIds: assignedTankIds,
      rememberMe,
      loginTimestamp: now,
      expiresAt,
    };

    const serializedSession = JSON.stringify(sessionData);
    const serializedUser = JSON.stringify(normalizedUser);

    // Limpar o storage oposto para evitar dados residuais conflitantes
    this.clearSession();

    const targetStorage = rememberMe ? localStorage : sessionStorage;

    try {
      targetStorage.setItem(STORAGE_KEYS.SESSION, serializedSession);
      targetStorage.setItem(STORAGE_KEYS.TOKEN, token);
      targetStorage.setItem(STORAGE_KEYS.USER, serializedUser);
      targetStorage.setItem(STORAGE_KEYS.REMEMBER, String(rememberMe));
    } catch (e) {
      console.error('Falha ao salvar sessão no Web Storage:', e);
      // Fallback para sessionStorage se localStorage falhar por quota
      try {
        sessionStorage.setItem(STORAGE_KEYS.SESSION, serializedSession);
        sessionStorage.setItem(STORAGE_KEYS.TOKEN, token);
        sessionStorage.setItem(STORAGE_KEYS.USER, serializedUser);
      } catch (err) {
        console.error('Erro crítico: nenhum storage disponível:', err);
      }
    }

    return sessionData;
  }

  /**
   * Recupera a sessão atual gravada.
   * Valida a expiração e limpa automaticamente se estiver expirada.
   */
  public getSession(): StoredSession | null {
    const { value: rawSession } = this.getStorageItem(STORAGE_KEYS.SESSION);

    if (!rawSession) {
      // Fallback para estruturas legadas de token + user se existirem
      const { value: legacyToken } = this.getStorageItem(STORAGE_KEYS.TOKEN);
      const { value: legacyUserRaw } = this.getStorageItem(STORAGE_KEYS.USER);

      if (legacyToken && legacyUserRaw) {
        try {
          const legacyUser = JSON.parse(legacyUserRaw) as AuthUser;
          return this.saveSession(legacyUser, legacyToken, true);
        } catch {
          this.clearSession();
          return null;
        }
      }
      return null;
    }

    try {
      const session: StoredSession = JSON.parse(rawSession);

      // Verificação de expiração temporal da sessão
      if (session.expiresAt && Date.now() > session.expiresAt) {
        console.warn('Sessão expirada localmente. Limpando credenciais...');
        this.clearSession();
        return null;
      }

      // Normalizar campos de permissão de reservatórios
      if (!Array.isArray(session.assignedTankIds) || session.assignedTankIds.length === 0) {
        session.assignedTankIds = Array.isArray(session.permittedTankIds) && session.permittedTankIds.length > 0
          ? session.permittedTankIds
          : [1, 2, 3, 4, 5, 6];
      }
      session.permittedTankIds = session.assignedTankIds;
      if (session.user) {
        session.user.permittedTankIds = session.assignedTankIds;
        session.user.assignedTankIds = session.assignedTankIds;
      }

      return session;
    } catch (e) {
      console.error('Erro ao deserializar sessão:', e);
      this.clearSession();
      return null;
    }
  }

  /**
   * Verifica se o usuário está autenticado e com sessão válida
   */
  public isUserLoggedIn(): boolean {
    const session = this.getSession();
    return !!session && !!session.token;
  }

  /**
   * Retorna o token de autenticação atual
   */
  public getToken(): string | null {
    const session = this.getSession();
    if (session) return session.token;
    const { value } = this.getStorageItem(STORAGE_KEYS.TOKEN);
    return value;
  }

  /**
   * Retorna o perfil completo do usuário logado
   */
  public getUser(): AuthUser | null {
    const session = this.getSession();
    return session ? session.user : null;
  }

  /**
   * Retorna a função / perfil do usuário ('admin' ou 'user')
   */
  public getUserRole(): 'admin' | 'user' | null {
    const session = this.getSession();
    return session ? session.role : null;
  }

  /**
   * Retorna os IDs dos tanques atribuídos ao usuário logado
   */
  public getPermittedTankIds(): number[] {
    const session = this.getSession();
    if (!session) return [];
    if (session.role === 'admin') return [1, 2, 3, 4, 5, 6];
    return Array.isArray(session.assignedTankIds) && session.assignedTankIds.length > 0
      ? session.assignedTankIds
      : [1, 2, 3, 4, 5, 6];
  }

  /**
   * Atualiza os dados do perfil de usuário na sessão salva
   */
  public updateSessionUser(updatedUser: Partial<AuthUser>): StoredSession | null {
    const session = this.getSession();
    if (!session) return null;

    const mergedUser: AuthUser = {
      ...session.user,
      ...updatedUser,
    };

    return this.saveSession(
      mergedUser,
      session.token,
      session.rememberMe,
      session.expiresAt - Date.now()
    );
  }

  /**
   * Encerra a sessão e limpa completamente localStorage e sessionStorage
   */
  public clearSession(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.SESSION);
      localStorage.removeItem(STORAGE_KEYS.TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.REMEMBER);
    } catch (e) {
      console.warn('Erro ao limpar localStorage:', e);
    }

    try {
      sessionStorage.removeItem(STORAGE_KEYS.SESSION);
      sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
      sessionStorage.removeItem(STORAGE_KEYS.USER);
      sessionStorage.removeItem(STORAGE_KEYS.REMEMBER);
    } catch (e) {
      console.warn('Erro ao limpar sessionStorage:', e);
    }
  }
}

export const authStorage = new AuthStorageService();
export { AuthStorageService };
export default authStorage;
