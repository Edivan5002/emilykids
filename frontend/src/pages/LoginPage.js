import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain } from 'lucide-react';

const LoginPage = () => {
  const [loginData, setLoginData] = useState({ email: '', senha: '' });
  const [registerData, setRegisterData] = useState({ nome: '', email: '', senha: '', papel: 'vendedor' });
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginData.email, loginData.senha);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(registerData.nome, registerData.email, registerData.senha, registerData.papel);
      toast.success('Cadastro realizado! Faça login para continuar.');
      setRegisterData({ nome: '', email: '', senha: '', papel: 'vendedor' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl mb-4"
               style={{backgroundColor: '#267698'}}>
            <Brain size={32} className="text-white" />
          </div>
          <div className="mb-2">
            <div className="flex items-center justify-center gap-1">
              <span className="text-5xl font-bold" style={{color: '#F26C4F'}}>E</span>
              <span className="text-5xl font-bold" style={{color: '#F4A261'}}>M</span>
              <span className="text-5xl font-bold" style={{color: '#267698'}}>I</span>
              <span className="text-5xl font-bold" style={{color: '#2C9AA1'}}>L</span>
              <span className="text-5xl font-bold" style={{color: '#E76F51'}}>Y</span>
            </div>
            <div className="text-2xl font-bold" style={{color: '#3A3A3A'}}>KIDS</div>
          </div>
          <p className="text-gray-600">Sistema Inteligente de Vendas e Estoque</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Bem-vindo</CardTitle>
            <CardDescription>Acesse sua conta ou crie uma nova</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="register-tab">Cadastro</TabsTrigger>
              </TabsList>

              <TabsContent value="login" data-testid="login-form">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      data-testid="login-email-input"
                      type="email"
                      placeholder="seu@email.com"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="login-senha">Senha</Label>
                    <Input
                      id="login-senha"
                      data-testid="login-senha-input"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.senha}
                      onChange={(e) => setLoginData({ ...loginData, senha: e.target.value })}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    data-testid="login-submit-btn"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Entrando...' : 'Entrar'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" data-testid="register-form">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <Label htmlFor="register-nome">Nome Completo</Label>
                    <Input
                      id="register-nome"
                      data-testid="register-nome-input"
                      type="text"
                      placeholder="Seu nome"
                      value={registerData.nome}
                      onChange={(e) => setRegisterData({ ...registerData, nome: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      data-testid="register-email-input"
                      type="email"
                      placeholder="seu@email.com"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="register-senha">Senha</Label>
                    <Input
                      id="register-senha"
                      data-testid="register-senha-input"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.senha}
                      onChange={(e) => setRegisterData({ ...registerData, senha: e.target.value })}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    data-testid="register-submit-btn"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? 'Cadastrando...' : 'Cadastrar'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;