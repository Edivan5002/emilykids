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
  FileEdit,
  ChevronLeft,
  ChevronRight
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
  
  // History
  const [permissionHistory, setPermissionHistory] = useState([]);
  const [detalhesHistorico, setDetalhesHistorico] = useState(null);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  
  // Loading
  const [loading, setLoading] = useState(false);
  
  // Paginação
  const [paginaRoles, setPaginaRoles] = useState(1);
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const ITENS_POR_PAGINA = 20;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    initializeRBAC();
    fetchRoles();
    fetchPermissions();
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
      const allPerms = await axios.get(`${API}/permissions`);
      setPermissions(allPerms.data);
      
      try {
        const byModule = await axios.get(`${API}/permissions/by-module`);
        setPermissionsByModule(byModule.data);
      } catch (err) {
        console.log('Erro ao carregar permissões por módulo');
        setPermissionsByModule({});
      }
    } catch (error) {
      toast.error('Erro ao carregar permissões');
    }
  };

  const fetchPermissionHistory = async () => {
    try {
      const response = await axios.get(`${API}/permission-history?limit=20`);
      setPermissionHistory(response.data.history);
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    }
  };

  const handleVerDetalhesHistorico = (entry) => {
    setDetalhesHistorico(entry);
    setIsDetalhesOpen(true);
  };

  const getAcaoBadgeColor = (acao) => {
    const colors = {
      'criar': 'bg-green-100 text-green-800 border-green-300',
      'editar': 'bg-blue-100 text-blue-800 border-blue-300',
      'deletar': 'bg-red-100 text-red-800 border-red-300',
      'atribuir': 'bg-purple-100 text-purple-800 border-purple-300',
      'remover': 'bg-orange-100 text-orange-800 border-orange-300',
      'atualizar': 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
    return colors[acao.toLowerCase()] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const getAcaoIcon = (acao) => {
    const acaoLower = acao.toLowerCase();
    if (acaoLower.includes('criar')) return <Plus size={16} />;
    if (acaoLower.includes('editar') || acaoLower.includes('atualizar')) return <FileEdit size={16} />;
    if (acaoLower.includes('deletar') || acaoLower.includes('remover')) return <Trash2 size={16} />;
    if (acaoLower.includes('atribuir')) return <UserCog size={16} />;
    return <History size={16} />;
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

  // Lógica de paginação para Roles
  const totalPaginasRoles = Math.ceil(roles.length / ITENS_POR_PAGINA);
  const indiceInicialRoles = (paginaRoles - 1) * ITENS_POR_PAGINA;
  const indiceFinalRoles = indiceInicialRoles + ITENS_POR_PAGINA;
  const rolesPaginados = roles.slice(indiceInicialRoles, indiceFinalRoles);

  // Lógica de paginação para Histórico
  const totalPaginasHistorico = Math.ceil(permissionHistory.length / ITENS_POR_PAGINA);
  const indiceInicialHistorico = (paginaHistorico - 1) * ITENS_POR_PAGINA;
  const indiceFinalHistorico = indiceInicialHistorico + ITENS_POR_PAGINA;
  const historicoPaginado = permissionHistory.slice(indiceInicialHistorico, indiceFinalHistorico);

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
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="roles">
            <Shield size={16} className="mr-2" />
            Papéis
          </TabsTrigger>
          <TabsTrigger value="permissions">
            <Key size={16} className="mr-2" />
            Permissões
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
            {rolesPaginados.map((role) => (
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

          {/* Controles de Paginação - Roles */}
          {roles.length > ITENS_POR_PAGINA && (
            <Card className="mt-4">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Página {paginaRoles} de {totalPaginasRoles} | Mostrando {indiceInicialRoles + 1} a {Math.min(indiceFinalRoles, roles.length)} de {roles.length} papéis
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaRoles(p => Math.max(1, p - 1))}
                      disabled={paginaRoles === 1}
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPaginasRoles }, (_, i) => i + 1).map((pagina) => (
                        <Button
                          key={pagina}
                          variant={paginaRoles === pagina ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPaginaRoles(pagina)}
                          className={paginaRoles === pagina ? "bg-blue-600 text-white" : ""}
                        >
                          {pagina}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaRoles(p => Math.min(totalPaginasRoles, p + 1))}
                      disabled={paginaRoles === totalPaginasRoles}
                    >
                      Próxima
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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

        {/* HISTORY TAB */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="text-purple-600" size={24} />
                Histórico de Mudanças ({permissionHistory.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {historicoPaginado.map((entry, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 border-2 rounded-lg hover:shadow-md transition-shadow bg-gradient-to-r from-white to-gray-50"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${getAcaoBadgeColor(entry.acao)}`}>
                          {getAcaoIcon(entry.acao)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">{entry.user_nome}</span>
                            <Badge className={`${getAcaoBadgeColor(entry.acao)} border`}>
                              {entry.acao}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {entry.detalhes?.nome && `${entry.detalhes.nome}`}
                            {entry.detalhes?.papel_nome && ` - Papel: ${entry.detalhes.papel_nome}`}
                            {entry.detalhes?.user_target_nome && ` - Usuário: ${entry.detalhes.user_target_nome}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 block mb-2">
                          {new Date(entry.timestamp).toLocaleString('pt-BR')}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerDetalhesHistorico(entry)}
                        >
                          <Eye size={16} className="mr-2" />
                          Detalhes
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {permissionHistory.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <History size={64} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Nenhum histórico registrado</p>
                    <p className="text-sm">As mudanças em papéis e permissões aparecerão aqui</p>
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

      {/* DETALHES HISTÓRICO MODAL */}
      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="text-purple-600" size={24} />
              Detalhes do Histórico
            </DialogTitle>
          </DialogHeader>
          
          {detalhesHistorico && (
            <div className="space-y-6">
              {/* Informações Principais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações da Ação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Ação Realizada</p>
                      <Badge className={`${getAcaoBadgeColor(detalhesHistorico.acao)} border text-base px-3 py-1`}>
                        {detalhesHistorico.acao}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Data e Hora</p>
                      <p className="font-medium flex items-center gap-2">
                        <Clock size={16} className="text-gray-500" />
                        {new Date(detalhesHistorico.timestamp).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Usuário Responsável</p>
                      <p className="font-semibold text-lg flex items-center gap-2">
                        <Users size={16} className="text-blue-600" />
                        {detalhesHistorico.user_nome}
                      </p>
                    </div>
                    {detalhesHistorico.user_id && (
                      <div>
                        <p className="text-sm text-gray-600 mb-1">ID do Usuário</p>
                        <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                          {detalhesHistorico.user_id}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Detalhes da Operação */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalhes da Operação</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {detalhesHistorico.detalhes && Object.entries(detalhesHistorico.detalhes).map(([key, value]) => (
                      <div key={key} className="border-b pb-3 last:border-b-0">
                        <p className="text-sm font-semibold text-gray-700 mb-1 capitalize">
                          {key.replace(/_/g, ' ')}
                        </p>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          {typeof value === 'object' ? (
                            <pre className="text-xs text-gray-800 overflow-auto">
                              {JSON.stringify(value, null, 2)}
                            </pre>
                          ) : (
                            <p className="text-sm text-gray-800">{String(value)}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* JSON Completo (Expandível) */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Dados Completos (JSON)</CardTitle>
                </CardHeader>
                <CardContent>
                  <details className="cursor-pointer">
                    <summary className="text-sm text-gray-600 hover:text-gray-900 font-medium mb-2">
                      Clique para expandir/recolher
                    </summary>
                    <pre className="text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 font-mono">
                      {JSON.stringify(detalhesHistorico, null, 2)}
                    </pre>
                  </details>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PapeisPermissoes;
