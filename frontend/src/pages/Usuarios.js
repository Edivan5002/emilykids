import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Search, UserCheck, UserX, Shield, Users as UsersIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Usuarios = () => {
  const { user } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [filteredUsuarios, setFilteredUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    papel: 'vendedor',
    ativo: true
  });

  useEffect(() => {
    if (user?.papel === 'admin') {
      fetchUsuarios();
    }
  }, [user]);

  useEffect(() => {
    const filtered = usuarios.filter(u =>
      u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsuarios(filtered);
  }, [searchTerm, usuarios]);

  const fetchUsuarios = async () => {
    try {
      const response = await axios.get(`${API}/usuarios`);
      setUsuarios(response.data);
      setFilteredUsuarios(response.data);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUsuario) {
        await axios.put(`${API}/usuarios/${editingUsuario.id}`, formData);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await axios.post(`${API}/auth/register`, formData);
        toast.success('Usuário cadastrado com sucesso!');
      }
      fetchUsuarios();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar usuário');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este usuário?')) return;
    try {
      await axios.delete(`${API}/usuarios/${id}`);
      toast.success('Usuário excluído com sucesso!');
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir usuário');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      const response = await axios.post(`${API}/usuarios/${id}/toggle-status`);
      toast.success(response.data.message);
      fetchUsuarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao alterar status');
    }
  };

  const handleEdit = (usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      papel: usuario.papel,
      ativo: usuario.ativo
    });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingUsuario(null);
    setFormData({
      nome: '',
      email: '',
      senha: '',
      papel: 'vendedor',
      ativo: true
    });
  };

  const getPapelColor = (papel) => {
    switch (papel) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'gerente': return 'bg-blue-100 text-blue-800';
      case 'vendedor': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPapelIcon = (papel) => {
    switch (papel) {
      case 'admin': return <Shield size={14} />;
      default: return <UsersIcon size={14} />;
    }
  };

  // Verificar se é admin
  if (user?.papel !== 'admin') {
    return (
      <div className="page-container">
        <Card>
          <CardContent className="p-12 text-center">
            <Shield size={48} className="mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Acesso Negado</h2>
            <p className="text-gray-600">Apenas administradores podem acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container" data-testid="usuarios-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gerenciamento de Usuários</h1>
          <p className="text-gray-600">Gerencie usuários, papéis e permissões</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button 
              data-testid="add-usuario-btn" 
              onClick={() => setEditingUsuario(null)}
              style={{backgroundColor: '#267698'}}
            >
              <Plus className="mr-2" size={18} />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="usuario-form">
              <div>
                <Label>Nome Completo *</Label>
                <Input
                  data-testid="usuario-nome-input"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  data-testid="usuario-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Senha {editingUsuario ? '(deixe em branco para manter)' : '*'}</Label>
                <Input
                  data-testid="usuario-senha-input"
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                  required={!editingUsuario}
                  placeholder={editingUsuario ? 'Digite nova senha ou deixe em branco' : ''}
                />
              </div>
              <div>
                <Label>Papel/Perfil *</Label>
                <Select 
                  value={formData.papel} 
                  onValueChange={(v) => setFormData({ ...formData, papel: v })}
                >
                  <SelectTrigger data-testid="usuario-papel-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield size={16} />
                        Administrador (Acesso Total)
                      </div>
                    </SelectItem>
                    <SelectItem value="gerente">
                      <div className="flex items-center gap-2">
                        <UsersIcon size={16} />
                        Gerente (Relatórios e Supervisão)
                      </div>
                    </SelectItem>
                    <SelectItem value="vendedor">
                      <div className="flex items-center gap-2">
                        <UsersIcon size={16} />
                        Vendedor (Operacional)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editingUsuario && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="ativo"
                    checked={formData.ativo}
                    onChange={(e) => setFormData({ ...formData, ativo: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label htmlFor="ativo" className="cursor-pointer">
                    Usuário Ativo
                  </Label>
                </div>
              )}
              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  data-testid="usuario-save-btn" 
                  className="flex-1"
                  style={{backgroundColor: '#267698'}}
                >
                  {editingUsuario ? 'Atualizar' : 'Criar'}
                </Button>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg" style={{backgroundColor: '#267698'}}>
                <UsersIcon className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Usuários</p>
                <p className="text-2xl font-bold">{usuarios.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500">
                <Shield className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Administradores</p>
                <p className="text-2xl font-bold">{usuarios.filter(u => u.papel === 'admin').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500">
                <UserCheck className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ativos</p>
                <p className="text-2xl font-bold">{usuarios.filter(u => u.ativo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-500">
                <UserX className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Inativos</p>
                <p className="text-2xl font-bold">{usuarios.filter(u => !u.ativo).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            data-testid="search-usuarios-input"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="table-container" data-testid="usuarios-table">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Papel</th>
              <th>Status</th>
              <th>Data de Criação</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.map((usuario) => (
              <tr key={usuario.id} data-testid={`usuario-row-${usuario.id}`}>
                <td className="font-medium">{usuario.nome}</td>
                <td>{usuario.email}</td>
                <td>
                  <span className={`badge ${getPapelColor(usuario.papel)} flex items-center gap-1 w-fit`}>
                    {getPapelIcon(usuario.papel)}
                    {usuario.papel.charAt(0).toUpperCase() + usuario.papel.slice(1)}
                  </span>
                </td>
                <td>
                  <span className={`badge ${usuario.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="text-sm text-gray-600">
                  {new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      data-testid={`toggle-status-${usuario.id}`}
                      onClick={() => handleToggleStatus(usuario.id)}
                      disabled={usuario.id === user.id}
                      title={usuario.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {usuario.ativo ? <UserX size={16} className="text-orange-500" /> : <UserCheck size={16} className="text-green-500" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      data-testid={`edit-usuario-${usuario.id}`}
                      onClick={() => handleEdit(usuario)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      data-testid={`delete-usuario-${usuario.id}`}
                      onClick={() => handleDelete(usuario.id)}
                      disabled={usuario.id === user.id}
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsuarios.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            Nenhum usuário encontrado
          </div>
        )}
      </div>
    </div>
  );
};

export default Usuarios;
