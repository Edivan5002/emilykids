import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Shield, Lock, AlertCircle } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Logo Emily Kids colorido
const EmilyKidsLogo = () => (
  <div className="flex flex-col items-center mb-6">
    <img 
      src="/boneca.png" 
      alt="Emily Kids" 
      className="w-48 h-48 object-contain mb-2"
    />
    <div className="text-5xl font-bold tracking-wider flex" style={{ fontFamily: 'Arial, sans-serif' }}>
      <span style={{ color: '#F89A50' }}>E</span>
      <span style={{ color: '#FDC948' }}>M</span>
      <span style={{ color: '#39B5A7' }}>I</span>
      <span style={{ color: '#5B8FB9' }}>L</span>
      <span style={{ color: '#E8509B' }}>Y</span>
    </div>
    <div className="text-2xl font-semibold tracking-widest" style={{ color: '#8C7C6F' }}>
      KIDS
    </div>
  </div>
);

const LoginPage = () => {
  const [loginData, setLoginData] = useState({ email: '', senha: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    // Validação frontend
    if (!loginData.email || !loginData.senha) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (loginData.senha.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    setLoading(true);
    try {
      await login(loginData.email, loginData.senha);
      toast.success('Login realizado com sucesso!');
      setLoginAttempts(0);
      navigate('/dashboard');
    } catch (error) {
      const detail = error.response?.data?.detail || 'Erro ao fazer login';
      
      setLoginAttempts(prev => prev + 1);
      
      // Mensagens específicas de erro
      if (detail.includes('bloqueada')) {
        toast.error(detail, { duration: 5000 });
      } else if (detail.includes('inativo')) {
        toast.error('Sua conta está inativa. Entre em contato com o administrador.');
      } else if (detail.includes('expirada')) {
        toast.error('Sua senha expirou. Entre em contato com o administrador.');
      } else if (detail.includes('Credenciais inválidas')) {
        const tentativasRestantes = 5 - loginAttempts;
        if (tentativasRestantes > 0) {
          toast.error(`Credenciais inválidas. ${tentativasRestantes} tentativa(s) restante(s).`);
        } else {
          toast.error('Muitas tentativas falhadas. Sua conta será bloqueada.');
        }
      } else {
        toast.error(detail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F2E9' }}>
      <div className="w-full max-w-md">
        {/* Logo Emily Kids */}
        <EmilyKidsLogo />

        {/* Card de Login */}
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className="bg-purple-100 p-3 rounded-full">
                <Shield className="text-purple-600" size={28} />
              </div>
            </div>
            <CardTitle className="text-2xl">Área Segura</CardTitle>
            <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Alertas de segurança */}
            {loginAttempts >= 3 && loginAttempts < 5 && (
              <Alert className="mb-4 border-orange-500 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Atenção: {5 - loginAttempts} tentativa(s) restante(s) antes do bloqueio
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-sm font-semibold">
                  Email
                </Label>
                <Input
                  id="login-email"
                  data-testid="login-email-input"
                  type="email"
                  placeholder="seu@email.com"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  disabled={loading}
                  className="h-11"
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-senha" className="text-sm font-semibold">
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="login-senha"
                    data-testid="login-senha-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginData.senha}
                    onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                    required
                    disabled={loading}
                    className="h-11 pr-10"
                    autoComplete="current-password"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                data-testid="login-submit-btn"
                className="w-full h-11 text-base font-semibold"
                disabled={loading}
                style={{backgroundColor: '#267698'}}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Entrando...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Lock size={18} />
                    Entrar com Segurança
                  </div>
                )}
              </Button>
            </form>

            {/* Informações de segurança */}
            <div className="mt-6 pt-6 border-t">
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <Shield size={14} className="mt-0.5 text-purple-600 flex-shrink-0" />
                  <span>Conexão segura com criptografia de ponta a ponta</span>
                </div>
                <div className="flex items-start gap-2">
                  <Lock size={14} className="mt-0.5 text-purple-600 flex-shrink-0" />
                  <span>Proteção contra tentativas de acesso não autorizado</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="mt-0.5 text-purple-600 flex-shrink-0" />
                  <span>Bloqueio automático após 5 tentativas incorretas (30 min)</span>
                </div>
              </div>
            </div>

            {/* Rodapé */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Apenas usuários autorizados podem acessar o sistema.
                <br />
                Para solicitar acesso, entre em contato com o administrador.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Informação adicional */}
        <div className="mt-6 text-center text-xs text-gray-500">
          © 2025 Emily Kids. Todos os direitos reservados.
        </div>
      </div>

    </div>
  );
};

export default LoginPage;
