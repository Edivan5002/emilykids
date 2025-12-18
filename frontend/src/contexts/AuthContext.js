import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';
import { parseError, ERROR_CODES } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Configurar baseURL do axios para garantir consistência
axios.defaults.baseURL = process.env.REACT_APP_BACKEND_URL;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [permissions, setPermissions] = useState(null);

  // Função de logout memorizada para uso no interceptor
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setPermissions(null);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // Interceptor global para tratar erros 401/403/429
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        const parsed = parseError(error);
        
        // 401: Não fazer logout se for 2FA required ou login inicial
        if (status === 401) {
          // Ignorar 401 em rotas de login (onde 2FA pode ser requerido)
          const isLoginRoute = error.config?.url?.includes('/auth/login');
          if (!isLoginRoute && parsed.code !== ERROR_CODES.TWO_FACTOR_REQUIRED) {
            console.warn('Sessão expirada - redirecionando para login');
            handleLogout();
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [handleLogout]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
      // Buscar permissões do usuário (Correção 4 - RBAC)
      await fetchPermissions();
    } catch (error) {
      console.error('Erro ao buscar usuário:', error);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await axios.get(`${API}/me/permissoes`);
      setPermissions(response.data);
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
      // Não fazer logout se apenas permissões falharem
    }
  };

  // Helper para verificar se usuário tem permissão
  const hasPermission = (modulo, acao) => {
    if (!permissions?.permissoes_por_modulo) return false;
    const acoes = permissions.permissoes_por_modulo[modulo];
    return acoes?.includes(acao) || false;
  };

  /**
   * Login com suporte a 2FA
   * @param {string} email 
   * @param {string} senha 
   * @param {string} [totpCode] - Código TOTP (se 2FA habilitado)
   * @param {string} [backupCode] - Código de backup (alternativa ao TOTP)
   * @returns {Promise<Object>} user data
   * @throws {Object} { code, message, requires2FA }
   */
  const login = async (email, senha, totpCode = null, backupCode = null) => {
    const payload = { email, senha };
    
    // Adicionar código 2FA se fornecido
    if (totpCode) {
      payload.totp_code = totpCode;
    }
    if (backupCode) {
      payload.backup_code = backupCode;
    }
    
    const response = await axios.post(`${API}/auth/login`, payload);
    const { access_token, user } = response.data;
    localStorage.setItem('token', access_token);
    setToken(access_token);
    setUser(user);
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
    return user;
  };

  const register = async (nome, email, senha, papel = 'vendedor') => {
    await axios.post(`${API}/auth/register`, { nome, email, senha, papel });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setPermissions(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      loading, 
      permissions,
      hasPermission,
      fetchPermissions 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;