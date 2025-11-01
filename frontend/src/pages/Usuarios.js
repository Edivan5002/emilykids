import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Search, UserCheck, UserX, Shield, Users as UsersIcon, Key, Eye } from 'lucide-react';
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
  
  // RBAC Data
  const [roles, setRoles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [userPermissions, setUserPermissions] = useState(null);
  const [viewingPermissions, setViewingPermissions] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    role_id: '',
    grupos: [],
    ativo: true,
    require_2fa: false
  });

  useEffect(() => {
    if (user?.papel === 'admin') {
      fetchUsuarios();
      fetchRoles();
      fetchGroups();
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

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API}/roles`);
      setRoles(response.data);
    } catch (error) {
      console.error('Erro ao carregar papéis');
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API}/user-groups`);
      setGroups(response.data);
    } catch (error) {
      console.error('Erro ao carregar grupos');
    }
  };

  const fetchUserPermissions = async (userId) => {
    try {
      const response = await axios.get(`${API}/users/${userId}/permissions`);
      setUserPermissions(response.data);
      setViewingPermissions(true);
    } catch (error) {
      toast.error('Erro ao carregar permissões do usuário');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Preparar dados para envio
    const dataToSend = {
      nome: formData.nome,
      email: formData.email,
      ativo: formData.ativo,
      role_id: formData.role_id || null,
      grupos: formData.grupos,
      require_2fa: formData.require_2fa
    };
    
    // Se for criação, incluir senha (obrigatória)
    if (!editingUsuario) {
      if (!formData.senha || formData.senha.length < 6) {
        toast.error('Senha deve ter pelo menos 6 caracteres');
        return;
      }
      dataToSend.senha = formData.senha;
    } else if (formData.senha) {
      // Se for edição e senha foi preenchida, incluir
      if (formData.senha.length < 6) {
        toast.error('Senha deve ter pelo menos 6 caracteres');
        return;
      }
      dataToSend.senha = formData.senha;
    }
    
    // Validar papel
    if (!formData.role_id) {
      toast.error('Selecione um papel para o usuário');
      return;
    }

    try {
      if (editingUsuario) {
        await axios.put(`${API}/usuarios/${editingUsuario.id}`, dataToSend);
        toast.success('Usuário atualizado com sucesso!');
      } else {
        // Criar usuário - usar endpoint direto de usuários, não register
        await axios.post(`${API}/usuarios`, dataToSend);
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

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      await axios.post(`${API}/usuarios/${id}/toggle-status`);
      toast.success(`Usuário ${currentStatus ? 'desativado' : 'ativado'} com sucesso!`);
      fetchUsuarios();
    } catch (error) {
      toast.error('Erro ao alterar status do usuário');
    }
  };

  const handleEdit = (usuario) => {
    setEditingUsuario(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      senha: '',
      role_id: usuario.role_id || '',
      grupos: usuario.grupos || [],
      ativo: usuario.ativo,
      require_2fa: usuario.require_2fa || false
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
      role_id: '',
      grupos: [],
      ativo: true,
      require_2fa: false
    });
  };

  const getRoleById = (roleId) => {
    return roles.find(r => r.id === roleId);
  };

  const getGroupsByIds = (groupIds) => {
    return groups.filter(g => groupIds.includes(g.id));
  };

  const toggleGroup = (groupId) => {
    setFormData(prev => ({
      ...prev,
      grupos: prev.grupos.includes(groupId)
        ? prev.grupos.filter(id => id !== groupId)
        : [...prev.grupos, groupId]
    }));
  };

  if (user?.papel !== 'admin') {
    return (
      <div className="page-container">
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <Shield size={48} className="mx-auto mb-4" />
              <p>Apenas administradores podem gerenciar usuários</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon size={32} className="text-blue-500" />
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Gestão de Usuários</h1>
            <p className="text-gray-600">Gerencie usuários, papéis e permissões</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleClose()}>
              <Plus size={16} className="mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingUsuario ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nome Completo *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Ex: João Silva"
                    required
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="joao@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Senha {!editingUsuario && '*'} {editingUsuario && '(deixe vazio para não alterar)'}</Label>
                <Input
                  type="password"
                  value={formData.senha}
                  onChange={(e) => setFormData({...formData, senha: e.target.value})}
                  placeholder="••••••••"
                  minLength={6}
                  required={!editingUsuario}
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo 6 caracteres</p>
              </div>

              <div>
                <Label>Papel (Role) *</Label>
                <Select value={formData.role_id} onValueChange={(value) => setFormData({...formData, role_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um papel" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.cor }}
                          />
                          <span>{role.nome}</span>
                          <span className="text-xs text-gray-500">({role.permissoes.length} permissões)</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  Defina as permissões do usuário através do papel
                </p>
              </div>

              <div>
                <Label>Grupos (opcional)</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                  {groups.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum grupo disponível</p>
                  ) : (
                    <div className="space-y-2">
                      {groups.map((group) => (
                        <label key={group.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={formData.grupos.includes(group.id)}
                            onChange={() => toggleGroup(group.id)}
                            className="rounded"
                          />
                          <span className="text-sm">{group.nome}</span>
                          <span className="text-xs text-gray-500">({group.role_ids.length} papéis)</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ativo"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="ativo" className="cursor-pointer">Usuário ativo</Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="require_2fa"
                  checked={formData.require_2fa}
                  onChange={(e) => setFormData({...formData, require_2fa: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="require_2fa" className="cursor-pointer">Requer autenticação de 2 fatores (2FA)</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1">
                  {editingUsuario ? 'Atualizar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Usuários Cadastrados ({usuarios.length})</CardTitle>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <Input
                placeholder="Buscar usuários..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredUsuarios.map((usuario) => {
              const userRole = getRoleById(usuario.role_id);
              const userGroups = getGroupsByIds(usuario.grupos || []);
              
              return (
                <div key={usuario.id} className="p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{usuario.nome}</h3>
                        {usuario.ativo ? (
                          <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800">Inativo</Badge>
                        )}
                        {usuario.require_2fa && (
                          <Badge className="bg-purple-100 text-purple-800">2FA</Badge>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{usuario.email}</p>
                      
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Shield size={14} className="text-gray-400" />
                          {userRole ? (
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full" 
                                style={{ backgroundColor: userRole.cor }}
                              />
                              <span className="font-medium">{userRole.nome}</span>
                              <span className="text-gray-500">({userRole.permissoes.length} permissões)</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">Sem papel definido</span>
                          )}
                        </div>
                        
                        {userGroups.length > 0 && (
                          <div className="flex items-center gap-2">
                            <UsersIcon size={14} className="text-gray-400" />
                            <span className="text-gray-600">{userGroups.length} grupo(s)</span>
                          </div>
                        )}
                      </div>
                      
                      {userGroups.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {userGroups.map(group => (
                            <Badge key={group.id} variant="outline" className="text-xs">
                              {group.nome}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchUserPermissions(usuario.id)}
                      >
                        <Eye size={14} className="mr-1" />
                        Permissões
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(usuario)}
                      >
                        <Edit size={14} className="mr-1" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleStatus(usuario.id, usuario.ativo)}
                      >
                        {usuario.ativo ? <UserX size={14} /> : <UserCheck size={14} />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(usuario.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {filteredUsuarios.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                {searchTerm ? 'Nenhum usuário encontrado' : 'Nenhum usuário cadastrado'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modal de Permissões */}
      <Dialog open={viewingPermissions} onOpenChange={setViewingPermissions}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key size={24} className="text-purple-600" />
              Permissões Efetivas do Usuário
            </DialogTitle>
          </DialogHeader>
          
          {userPermissions && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-purple-600">{userPermissions.total_permissions}</p>
                      <p className="text-sm text-gray-600">Total de Permissões</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600">{Object.keys(userPermissions.by_module).length}</p>
                      <p className="text-sm text-gray-600">Módulos com Acesso</p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600">{userPermissions.permissions.length}</p>
                      <p className="text-sm text-gray-600">Ações Permitidas</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Permissões por Módulo</h3>
                <div className="space-y-3">
                  {Object.entries(userPermissions.by_module).map(([modulo, acoes]) => (
                    <div key={modulo} className="border rounded-lg p-3">
                      <h4 className="font-medium capitalize mb-2">{modulo.replace('_', ' ')}</h4>
                      <div className="flex flex-wrap gap-2">
                        {acoes.map((acao, idx) => (
                          <Badge key={idx} variant="outline">{acao}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Usuarios;

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
