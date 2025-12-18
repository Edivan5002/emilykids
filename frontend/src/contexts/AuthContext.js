import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

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

  // Interceptor global para tratar erros 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.warn('Sessão expirada - redirecionando para login');
          handleLogout();
          window.location.href = '/login';
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

  const login = async (email, senha) => {
    const response = await axios.post(`${API}/auth/login`, { email, senha });
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