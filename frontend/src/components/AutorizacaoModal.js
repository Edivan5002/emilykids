import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AutorizacaoModal = ({ isOpen, onClose, onAutorizado, acao = 'excluir' }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/validar-autorizacao`, {
        email,
        senha
      });

      toast.success(`Autorizado por ${response.data.autorizador.nome} (${response.data.autorizador.papel})`);
      
      // Limpar campos
      setEmail('');
      setSenha('');
      
      // Chamar callback de sucesso
      onAutorizado(response.data.autorizador);
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao validar autorização');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setSenha('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield size={24} style={{ color: '#E76F51' }} />
            Autorização Necessária
          </DialogTitle>
          <DialogDescription>
            Para {acao}, é necessário a autorização de um supervisor ou administrador.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Atenção:</strong> Apenas supervisores (gerentes) ou administradores podem autorizar esta ação.
            </p>
          </div>

          <div>
            <Label htmlFor="auth-email">Email do Supervisor/Administrador</Label>
            <Input
              id="auth-email"
              type="email"
              placeholder="email@emilykids.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              data-testid="auth-email-input"
            />
          </div>

          <div>
            <Label htmlFor="auth-senha">Senha</Label>
            <Input
              id="auth-senha"
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              disabled={loading}
              data-testid="auth-senha-input"
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
              style={{ backgroundColor: '#E76F51' }}
              data-testid="auth-submit-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 animate-spin" size={16} />
                  Validando...
                </>
              ) : (
                <>
                  <Shield className="mr-2" size={16} />
                  Autorizar
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AutorizacaoModal;
