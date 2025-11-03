import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Lock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';

// Logo Emily Kids
const EmilyKidsLogo = () => (
  <div className="flex flex-col items-center mb-6">
    <img 
      src="https://customer-assets.emergentagent.com/job_retail-kids-mgmt/artifacts/gnn10sag_WhatsApp%20Image%202025-11-01%20at%2021.07.08.jpeg" 
      alt="Emily Kids" 
      className="w-32 h-32 object-contain mb-2"
    />
  </div>
);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenData, setTokenData] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '' });

  useEffect(() => {
    validateToken();
  }, [token]);

  useEffect(() => {
    checkPasswordStrength(newPassword);
  }, [newPassword]);

  const validateToken = async () => {
    if (!token) {
      toast.error('Token não fornecido');
      setValidating(false);
      return;
    }

    try {
      const response = await axios.get(`${API}/auth/validate-reset-token/${token}`);
      if (response.data.valid) {
        setTokenValid(true);
        setTokenData(response.data);
      } else {
        toast.error(response.data.message);
        setTokenValid(false);
      }
    } catch (error) {
      toast.error('Token inválido ou expirado');
      setTokenValid(false);
    } finally {
      setValidating(false);
    }
  };

  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength({ score: 0, message: '' });
      return;
    }

    let score = 0;
    let message = '';

    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^a-zA-Z0-9]/.test(password)) score += 1;

    if (score <= 2) message = 'Fraca';
    else if (score <= 4) message = 'Média';
    else message = 'Forte';

    setPasswordStrength({ score, message });
  };

  const getStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'bg-red-500';
    if (passwordStrength.score <= 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (passwordStrength.score < 3) {
      toast.error('Escolha uma senha mais forte');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-password?token=${token}&new_password=${encodeURIComponent(newPassword)}`);
      toast.success('Senha redefinida com sucesso!', { duration: 5000 });
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      const detail = error.response?.data?.detail || 'Erro ao redefinir senha';
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Validando token...</p>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-3">
              <div className="bg-red-100 p-3 rounded-full">
                <XCircle className="text-red-600" size={32} />
              </div>
            </div>
            <CardTitle className="text-2xl">Token Inválido</CardTitle>
            <CardDescription>
              Este link de recuperação é inválido, já foi usado ou expirou.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/')} 
              className="w-full"
              style={{backgroundColor: '#267698'}}
            >
              <ArrowLeft size={16} className="mr-2" />
              Voltar para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F5F2E9' }}>
      <div className="w-full max-w-md">
        {/* Logo Emily Kids */}
        <EmilyKidsLogo />

        {/* Card */}
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className="bg-blue-100 p-3 rounded-full">
                <Lock className="text-blue-600" size={28} />
              </div>
            </div>
          <div className="mb-3">
            <div className="flex items-center justify-center gap-1">
              <span className="text-6xl font-bold" style={{color: '#F26C4F'}}>E</span>
              <span className="text-6xl font-bold" style={{color: '#F4A261'}}>M</span>
              <span className="text-6xl font-bold" style={{color: '#267698'}}>I</span>
              <span className="text-6xl font-bold" style={{color: '#2C9AA1'}}>L</span>
              <span className="text-6xl font-bold" style={{color: '#E76F51'}}>Y</span>
            </div>
            <div className="text-3xl font-bold mt-1" style={{color: '#3A3A3A'}}>KIDS</div>
          </div>
        </div>

        {/* Card de Reset */}
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-3">
              <div className="bg-green-100 p-3 rounded-full">
                <Lock className="text-green-600" size={28} />
              </div>
            </div>
            <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
            <CardDescription>
              Defina uma nova senha para: {tokenData?.email}
              <br />
              <span className="text-xs text-gray-500">
                Token expira em {tokenData?.expires_in_minutes} minutos
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-5">
              {/* Nova Senha */}
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm font-semibold">
                  Nova Senha
                </Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 pr-10"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Força da Senha */}
                {newPassword && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">Força da senha:</span>
                      <span className={`font-semibold ${
                        passwordStrength.score <= 2 ? 'text-red-600' :
                        passwordStrength.score <= 4 ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {passwordStrength.message}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${getStrengthColor()}`}
                        style={{ width: `${(passwordStrength.score / 6) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirmar Senha */}
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-semibold">
                  Confirmar Senha
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-11 pr-10"
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                {/* Match indicator */}
                {confirmPassword && (
                  <div className="flex items-center gap-2 text-xs">
                    {newPassword === confirmPassword ? (
                      <>
                        <CheckCircle size={14} className="text-green-600" />
                        <span className="text-green-600">As senhas coincidem</span>
                      </>
                    ) : (
                      <>
                        <XCircle size={14} className="text-red-600" />
                        <span className="text-red-600">As senhas não coincidem</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Requisitos */}
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-xs">
                  <p className="font-semibold mb-1">Requisitos da senha:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Mínimo 6 caracteres (recomendado 10+)</li>
                    <li>Letras maiúsculas e minúsculas</li>
                    <li>Números</li>
                    <li>Caracteres especiais (!@#$%)</li>
                    <li>Não use senhas antigas</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* Botões */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/')}
                  disabled={loading}
                  className="flex-1"
                >
                  <ArrowLeft size={16} className="mr-2" />
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || newPassword !== confirmPassword || passwordStrength.score < 3}
                  className="flex-1"
                  style={{backgroundColor: '#267698'}}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                      Redefinindo...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <CheckCircle size={16} />
                      Redefinir Senha
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-xs text-gray-500">
          © 2025 Emily Kids. Todos os direitos reservados.
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
