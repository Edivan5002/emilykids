import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Search, UserCheck, UserX, Shield, Users as UsersIcon, Key, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
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
  
  // Estado para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 20;
  
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
    setPaginaAtual(1); // Resetar página ao filtrar
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
      require_2fa: formData.require_2fa
    };
    
    // Se for criação, incluir senha (obrigatória)
    if (!editingUsuario) {
      if (!formData.senha || formData.senha.length < 6) {
        toast.error('Senha deve ter pelo menos 6 caracteres');
        return;
      }
      dataToSend.senha = formData.senha;
      dataToSend.papel = 'vendedor'; // Compatibilidade com backend antigo
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

  // Lógica de paginação
  const totalPaginas = Math.ceil(filteredUsuarios.length / ITENS_POR_PAGINA);
  const indiceInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFinal = indiceInicial + ITENS_POR_PAGINA;
  const usuariosPaginados = filteredUsuarios.slice(indiceInicial, indiceFinal);

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
      <div className="mb-6 sm:mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon size={32} className="text-blue-500" />
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Gestão de Usuários</h1>
            <p className="text-gray-600">Gerencie usuários com papéis e permissões RBAC</p>
          </div>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleClose()}>
              <Plus size={16} className="mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="dialog-responsive-sm">
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
                <Label>
                  Papel (Role) *
                  {editingUsuario && editingUsuario.papel && (
                    <span className="ml-2 text-xs text-gray-500 font-normal">
                      (Atual: <span className="capitalize font-medium">{editingUsuario.papel}</span>)
                    </span>
                  )}
                </Label>
                <Select value={formData.role_id} onValueChange={(value) => setFormData({...formData, role_id: value})}>
                  <SelectTrigger>
                    {formData.role_id && getRoleById(formData.role_id) ? (
                      <div className="flex items-center gap-2 w-full">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: getRoleById(formData.role_id).cor }}
                        />
                        <span className="font-medium">{getRoleById(formData.role_id).nome}</span>
                        <span className="text-xs text-gray-500 ml-auto">
                          ({getRoleById(formData.role_id).permissoes.length} permissões)
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400">Selecione um papel</span>
                    )}
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
                {formData.role_id && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-900">
                      Papel Selecionado: {getRoleById(formData.role_id)?.nome || 'Carregando...'}
                    </p>
                    {getRoleById(formData.role_id) && (
                      <p className="text-xs text-blue-700 mt-1">
                        {getRoleById(formData.role_id).permissoes.length} permissões atribuídas
                      </p>
                    )}
                  </div>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  As permissões são definidas através do papel no menu Papéis & Permissões
                </p>
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
                <Label htmlFor="require_2fa" className="cursor-pointer">Requer autenticação 2FA</Label>
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
                      
                      <p className="text-sm text-gray-600">{usuario.email}</p>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <Shield size={14} className="text-gray-400" />
                        <span className="text-sm text-gray-500">Papel:</span>
                        {usuario.papel ? (
                          <span className="text-sm font-medium capitalize">{usuario.papel}</span>
                        ) : userRole ? (
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full" 
                              style={{ backgroundColor: userRole.cor }}
                            />
                            <span className="text-sm font-medium">{userRole.nome}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Não definido</span>
                        )}
                      </div>
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