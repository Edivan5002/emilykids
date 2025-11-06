import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Users, 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Copy,
  CheckCircle,
  XCircle,
  Clock,
  History,
  Eye,
  UserCog,
  FileEdit
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PapeisPermissoes = () => {
  const [activeTab, setActiveTab] = useState('roles');
  
  // Roles
  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({
    nome: '',
    descricao: '',
    cor: '#6B7280',
    hierarquia_nivel: 99,
    permissoes: []
  });
  
  // Permissions
  const [permissions, setPermissions] = useState([]);
  const [permissionsByModule, setPermissionsByModule] = useState({});
  
  // Groups
  const [groups, setGroups] = useState([]);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({
    nome: '',
    descricao: '',
    user_ids: [],
    role_ids: []
  });
  
  // History
  const [permissionHistory, setPermissionHistory] = useState([]);
  const [detalhesHistorico, setDetalhesHistorico] = useState(null);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  
  // Loading
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    initializeRBAC();
    fetchRoles();
    fetchPermissions();
    fetchGroups();
    fetchPermissionHistory();
  }, []);

  const initializeRBAC = async () => {
    try {
      await axios.post(`${API}/rbac/initialize`);
    } catch (error) {
      // Já inicializado, ok
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API}/roles`);
      setRoles(response.data);
    } catch (error) {
      toast.error('Erro ao carregar papéis');
    }
  };

  const fetchPermissions = async () => {
    try {
      const [allPerms, byModule] = await Promise.all([
        axios.get(`${API}/permissions`),
        axios.get(`${API}/permissions/by-module`)
      ]);
      setPermissions(allPerms.data);
      setPermissionsByModule(byModule.data);
    } catch (error) {
      toast.error('Erro ao carregar permissões');
    }
  };

  const fetchGroups = async () => {
    try {
      const response = await axios.get(`${API}/user-groups`);
      setGroups(response.data);
    } catch (error) {
      toast.error('Erro ao carregar grupos');
    }
  };

  const fetchPermissionHistory = async () => {
    try {
      const response = await axios.get(`${API}/permission-history?limit=50`);
      setPermissionHistory(response.data.history);
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    }
  };

  const handleCreateRole = async () => {
    try {
      await axios.post(`${API}/roles`, roleForm);
      toast.success('Papel criado com sucesso!');
      setIsRoleModalOpen(false);
      resetRoleForm();
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar papel');
    }
  };

  const handleUpdateRole = async () => {
    try {
      await axios.put(`${API}/roles/${selectedRole.id}`, roleForm);
      toast.success('Papel atualizado com sucesso!');
      setIsRoleModalOpen(false);
      setSelectedRole(null);
      resetRoleForm();
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao atualizar papel');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Tem certeza que deseja deletar este papel?')) return;
    
    try {
      await axios.delete(`${API}/roles/${roleId}`);
      toast.success('Papel deletado com sucesso!');
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao deletar papel');
    }
  };

  const handleDuplicateRole = async (roleId) => {
    const novoNome = prompt('Nome para o novo papel:');
    if (!novoNome) return;
    
    try {
      await axios.post(`${API}/roles/${roleId}/duplicate?novo_nome=${encodeURIComponent(novoNome)}`);
      toast.success('Papel duplicado com sucesso!');
      fetchRoles();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao duplicar papel');
    }
  };

  const handleCreateGroup = async () => {
    try {
      await axios.post(`${API}/user-groups`, groupForm);
      toast.success('Grupo criado com sucesso!');
      setIsGroupModalOpen(false);
      setGroupForm({ nome: '', descricao: '', user_ids: [], role_ids: [] });
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar grupo');
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('Tem certeza que deseja deletar este grupo?')) return;
    
    try {
      await axios.delete(`${API}/user-groups/${groupId}`);
      toast.success('Grupo deletado com sucesso!');
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao deletar grupo');
    }
  };

  const resetRoleForm = () => {
    setRoleForm({
      nome: '',
      descricao: '',
      cor: '#6B7280',
      hierarquia_nivel: 99,
      permissoes: []
    });
  };

  const openEditRole = (role) => {
    setSelectedRole(role);
    setRoleForm({
      nome: role.nome,
      descricao: role.descricao || '',
      cor: role.cor,
      hierarquia_nivel: role.hierarquia_nivel,
      permissoes: role.permissoes
    });
    setIsRoleModalOpen(true);
  };

  const openNewRole = () => {
    setSelectedRole(null);
    resetRoleForm();
    setIsRoleModalOpen(true);
  };

  const togglePermission = (permId) => {
    setRoleForm(prev => ({
      ...prev,
      permissoes: prev.permissoes.includes(permId)
        ? prev.permissoes.filter(p => p !== permId)
        : [...prev.permissoes, permId]
    }));
  };

  const toggleAllModulePermissions = (modulePerms) => {
    const modulePermIds = modulePerms.map(p => p.id);
    const allSelected = modulePermIds.every(id => roleForm.permissoes.includes(id));
    
    if (allSelected) {
      // Desmarcar todos
      setRoleForm(prev => ({
        ...prev,
        permissoes: prev.permissoes.filter(id => !modulePermIds.includes(id))
      }));
    } else {
      // Marcar todos
      setRoleForm(prev => ({
        ...prev,
        permissoes: [...new Set([...prev.permissoes, ...modulePermIds])]
      }));
    }
  };

  return (
    <div className="page-container">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <Shield size={32} className="text-purple-500" />
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Papéis e Permissões</h1>
            <p className="text-gray-600">Sistema RBAC - Controle de Acesso Baseado em Papéis</p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-6">
          <TabsTrigger value="roles">
            <Shield size={16} className="mr-2" />
            Papéis
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Key size={16} className="mr-2" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="groups">
            <Users size={16} className="mr-2" />
            Grupos
          </TabsTrigger>
          <TabsTrigger value="history">
            <History size={16} className="mr-2" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* ROLES TAB */}
        <TabsContent value="roles">
          <div className="mb-4 flex justify-end">
            <Button onClick={openNewRole}>
              <Plus size={16} className="mr-2" />
              Novo Papel
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roles.map((role) => (
              <Card key={role.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full" 
                        style={{ backgroundColor: role.cor }}
                      />
                      <CardTitle className="text-lg">{role.nome}</CardTitle>
                    </div>
                    {role.is_sistema && (
                      <Badge variant="outline" className="text-xs">Sistema</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">{role.descricao || 'Sem descrição'}</p>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Hierarquia:</span>
                      <span className="font-semibold">Nível {role.hierarquia_nivel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Permissões:</span>
                      <span className="font-semibold">{role.permissoes.length}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => openEditRole(role)}
                      disabled={role.is_sistema}
                      className="flex-1"
                    >
                      <Edit size={14} className="mr-1" />
                      Editar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDuplicateRole(role.id)}
                      className="flex-1"
                    >
                      <Copy size={14} className="mr-1" />
                      Duplicar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteRole(role.id)}
                      disabled={role.is_sistema}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* PERMISSIONS TAB */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Matriz de Permissões ({permissions.length} total)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(permissionsByModule).map(([modulo, perms]) => (
                  <div key={modulo} className="border rounded-lg p-4">
                    <h3 className="font-semibold text-lg mb-3 capitalize">{modulo.replace('_', ' ')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                      {perms.map((perm) => (
                        <Badge key={perm.id} variant="outline" className="justify-center py-2">
                          {perm.acao}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GROUPS TAB */}
        <TabsContent value="groups">
          <div className="mb-4 flex justify-end">
            <Button onClick={() => setIsGroupModalOpen(true)}>
              <Plus size={16} className="mr-2" />
              Novo Grupo
            </Button>
          </div>

          <div className="space-y-4">
            {groups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{group.nome}</CardTitle>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => handleDeleteGroup(group.id)}
                      className="text-red-600"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-3">{group.descricao || 'Sem descrição'}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Usuários:</span>
                      <span className="ml-2 font-semibold">{group.user_ids.length}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Papéis:</span>
                      <span className="ml-2 font-semibold">{group.role_ids.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {groups.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                Nenhum grupo cadastrado
              </div>
            )}
          </div>
        </TabsContent>

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Mudanças</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {permissionHistory.map((entry, idx) => (
                  <div key={idx} className="p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <History size={16} className="text-gray-400" />
                        <span className="font-semibold">{entry.user_nome}</span>
                        <Badge variant="outline">{entry.acao}</Badge>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(entry.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto">
                      {JSON.stringify(entry.detalhes, null, 2)}
                    </pre>
                  </div>
                ))}
                {permissionHistory.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    Nenhum histórico registrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ROLE MODAL */}
      <Dialog open={isRoleModalOpen} onOpenChange={setIsRoleModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedRole ? 'Editar Papel' : 'Novo Papel'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nome</Label>
                <Input
                  value={roleForm.nome}
                  onChange={(e) => setRoleForm({...roleForm, nome: e.target.value})}
                  placeholder="Ex: Supervisor"
                />
              </div>
              
              <div>
                <Label>Cor</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={roleForm.cor}
                    onChange={(e) => setRoleForm({...roleForm, cor: e.target.value})}
                    className="w-20"
                  />
                  <Input
                    value={roleForm.cor}
                    onChange={(e) => setRoleForm({...roleForm, cor: e.target.value})}
                    placeholder="#6B7280"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={roleForm.descricao}
                onChange={(e) => setRoleForm({...roleForm, descricao: e.target.value})}
                placeholder="Descrição do papel"
              />
            </div>

            <div>
              <Label>Nível de Hierarquia (1 = maior poder, 100 = menor poder)</Label>
              <Input
                type="number"
                value={roleForm.hierarquia_nivel}
                onChange={(e) => setRoleForm({...roleForm, hierarquia_nivel: parseInt(e.target.value)})}
                min="1"
                max="100"
              />
            </div>

            <div>
              <Label className="text-lg font-semibold">Permissões</Label>
              <p className="text-sm text-gray-600 mb-3">
                Selecione as permissões para este papel ({roleForm.permissoes.length} selecionadas)
              </p>

              <div className="space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4">
                {Object.entries(permissionsByModule).map(([modulo, perms]) => {
                  const allSelected = perms.every(p => roleForm.permissoes.includes(p.id));
                  const someSelected = perms.some(p => roleForm.permissoes.includes(p.id));
                  
                  return (
                    <div key={modulo} className="border-b pb-3">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold capitalize">
                          {modulo.replace('_', ' ')}
                        </h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleAllModulePermissions(perms)}
                        >
                          {allSelected ? (
                            <>
                              <XCircle size={14} className="mr-1" />
                              Desmarcar Todos
                            </>
                          ) : (
                            <>
                              <CheckCircle size={14} className="mr-1" />
                              Marcar Todos
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                        {perms.map((perm) => (
                          <label
                            key={perm.id}
                            className={`
                              flex items-center gap-2 p-2 rounded cursor-pointer border
                              ${roleForm.permissoes.includes(perm.id) 
                                ? 'bg-purple-100 border-purple-500' 
                                : 'hover:bg-gray-50'
                              }
                            `}
                          >
                            <input
                              type="checkbox"
                              checked={roleForm.permissoes.includes(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              className="rounded"
                            />
                            <span className="text-sm">{perm.acao}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsRoleModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={selectedRole ? handleUpdateRole : handleCreateRole}>
                {selectedRole ? 'Atualizar' : 'Criar'} Papel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GROUP MODAL */}
      <Dialog open={isGroupModalOpen} onOpenChange={setIsGroupModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Grupo</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={groupForm.nome}
                onChange={(e) => setGroupForm({...groupForm, nome: e.target.value})}
                placeholder="Ex: Equipe Vendas Sul"
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Input
                value={groupForm.descricao}
                onChange={(e) => setGroupForm({...groupForm, descricao: e.target.value})}
                placeholder="Descrição do grupo"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsGroupModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateGroup}>
                Criar Grupo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PapeisPermissoes;
