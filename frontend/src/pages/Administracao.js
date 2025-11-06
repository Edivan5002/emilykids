import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Trash2, 
  AlertTriangle, 
  Database, 
  FileText, 
  ShoppingCart,
  Package,
  Users,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Administracao = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [senhaMestra, setSenhaMestra] = useState('');
  const [logsAuditoria, setLogsAuditoria] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, action: null, data: {} });
  const [detalhesDialog, setDetalhesDialog] = useState({ open: false, log: null });
  
  // Estados para cada tipo de operação
  const [diasVendas, setDiasVendas] = useState(90);
  const [diasOrcamentos, setDiasOrcamentos] = useState(90);
  const [diasLogs, setDiasLogs] = useState(90);
  const [moduloSelecionado, setModuloSelecionado] = useState('');
  const [confirmarLimparTudo, setConfirmarLimparTudo] = useState('');

  useEffect(() => {
    fetchStats();
    fetchLogsAuditoria();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.post(`${API}/admin/estatisticas`);
      setStats(response.data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    }
  };

  const fetchLogsAuditoria = async () => {
    try {
      const response = await axios.get(`${API}/admin/logs-auditoria?limit=50`);
      setLogsAuditoria(response.data.logs);
    } catch (error) {
      console.error('Erro ao carregar logs de auditoria');
    }
  };

  const handleDeleteVendasAntigas = async () => {
    if (!senhaMestra) {
      toast.error('Digite a senha mestra');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/delete-vendas-antigas`, {
        dias: diasVendas,
        senha_mestra: senhaMestra
      });
      toast.success(response.data.message);
      setSenhaMestra('');
      setConfirmDialog({ open: false, action: null, data: {} });
      fetchStats();
      fetchLogsAuditoria();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao deletar vendas');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrcamentosAntigos = async () => {
    if (!senhaMestra) {
      toast.error('Digite a senha mestra');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/delete-orcamentos-antigos`, {
        dias: diasOrcamentos,
        senha_mestra: senhaMestra
      });
      toast.success(response.data.message);
      setSenhaMestra('');
      setConfirmDialog({ open: false, action: null, data: {} });
      fetchStats();
      fetchLogsAuditoria();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao deletar orçamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleLimparLogs = async () => {
    if (!senhaMestra) {
      toast.error('Digite a senha mestra');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/limpar-logs`, {
        dias: diasLogs,
        senha_mestra: senhaMestra
      });
      toast.success(response.data.message);
      setSenhaMestra('');
      setConfirmDialog({ open: false, action: null, data: {} });
      fetchStats();
      fetchLogsAuditoria();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao limpar logs');
    } finally {
      setLoading(false);
    }
  };

  const handleResetarModulo = async () => {
    if (!senhaMestra || !moduloSelecionado) {
      toast.error('Digite a senha mestra e selecione um módulo');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/resetar-modulo`, {
        modulo: moduloSelecionado,
        senha_mestra: senhaMestra
      });
      toast.success(response.data.message);
      setSenhaMestra('');
      setModuloSelecionado('');
      setConfirmDialog({ open: false, action: null, data: {} });
      fetchStats();
      fetchLogsAuditoria();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao resetar módulo');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoverDadosTeste = async () => {
    if (!senhaMestra) {
      toast.error('Digite a senha mestra');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/remover-dados-teste`, {
        senha_mestra: senhaMestra
      });
      toast.success(response.data.message);
      setSenhaMestra('');
      setConfirmDialog({ open: false, action: null, data: {} });
      fetchStats();
      fetchLogsAuditoria();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao remover dados de teste');
    } finally {
      setLoading(false);
    }
  };

  const handleLimparTudo = async () => {
    if (!senhaMestra || confirmarLimparTudo !== 'LIMPAR TUDO') {
      toast.error('Digite a senha mestra e a confirmação corretamente');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/limpar-tudo`, {
        senha_mestra: senhaMestra,
        confirmar: confirmarLimparTudo
      });
      toast.success(response.data.message);
      setSenhaMestra('');
      setConfirmarLimparTudo('');
      setConfirmDialog({ open: false, action: null, data: {} });
      fetchStats();
      fetchLogsAuditoria();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao limpar sistema');
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (action, data = {}) => {
    setConfirmDialog({ open: true, action, data });
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield size={36} className="text-red-600" />
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Administração do Sistema</h1>
            <p className="text-gray-600">Gerenciamento avançado de dados e limpeza</p>
          </div>
        </div>
        <Alert className="mt-4 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>ATENÇÃO:</strong> Todas as operações nesta área são irreversíveis e requerem senha mestra.
            Use com extremo cuidado!
          </AlertDescription>
        </Alert>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
          <TabsTrigger value="dashboard">
            <Database size={16} className="mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="vendas">
            <ShoppingCart size={16} className="mr-2" />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="orcamentos">
            <FileText size={16} className="mr-2" />
            Orçamentos
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText size={16} className="mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="modulos">
            <Package size={16} className="mr-2" />
            Módulos
          </TabsTrigger>
          <TabsTrigger value="auditoria">
            <Activity size={16} className="mr-2" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        {/* DASHBOARD TAB */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            {/* Estatísticas */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Vendas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.vendas}</div>
                    <p className="text-xs text-gray-500">{stats.vendas_canceladas} canceladas</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Produtos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.produtos}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Clientes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.clientes}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Logs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.logs}</div>
                    <p className="text-xs text-gray-500">{stats.logs_seguranca} segurança</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Ações Rápidas Perigosas */}
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertTriangle size={20} />
                  Ações Críticas
                </CardTitle>
                <CardDescription>
                  Use estas opções apenas se souber o que está fazendo. 
                  <strong className="block mt-1">Nota:</strong> "Limpar Todo o Sistema" preserva APENAS Usuários e Papéis/Permissões. TODOS os outros dados, incluindo logs, serão deletados permanentemente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="border-orange-500 text-orange-700 hover:bg-orange-50"
                    onClick={() => openConfirmDialog('removerTeste')}
                  >
                    <Trash2 size={16} className="mr-2" />
                    Remover Dados de Teste
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => openConfirmDialog('limparTudo')}
                    title="Remove todos os dados exceto Usuários e Papéis/Permissões"
                  >
                    <XCircle size={16} className="mr-2" />
                    Limpar Todo o Sistema
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* VENDAS TAB */}
        <TabsContent value="vendas">
          <Card>
            <CardHeader>
              <CardTitle>Deletar Vendas Antigas</CardTitle>
              <CardDescription>Remove vendas mais antigas que o período especificado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Deletar vendas com mais de (dias):</Label>
                <Input
                  type="number"
                  value={diasVendas}
                  onChange={(e) => setDiasVendas(parseInt(e.target.value))}
                  min="1"
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Vendas criadas antes de {new Date(Date.now() - diasVendas * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {stats && (
                <Alert>
                  <ShoppingCart className="h-4 w-4" />
                  <AlertDescription>
                    Total de vendas no sistema: <strong>{stats.vendas}</strong>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={() => openConfirmDialog('deleteVendas')}
                variant="destructive"
                className="w-full"
              >
                <Trash2 size={16} className="mr-2" />
                Deletar Vendas Antigas
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ORÇAMENTOS TAB */}
        <TabsContent value="orcamentos">
          <Card>
            <CardHeader>
              <CardTitle>Deletar Orçamentos Antigos</CardTitle>
              <CardDescription>Remove orçamentos mais antigos que o período especificado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Deletar orçamentos com mais de (dias):</Label>
                <Input
                  type="number"
                  value={diasOrcamentos}
                  onChange={(e) => setDiasOrcamentos(parseInt(e.target.value))}
                  min="1"
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Orçamentos criados antes de {new Date(Date.now() - diasOrcamentos * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {stats && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Total de orçamentos no sistema: <strong>{stats.orcamentos}</strong>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={() => openConfirmDialog('deleteOrcamentos')}
                variant="destructive"
                className="w-full"
              >
                <Trash2 size={16} className="mr-2" />
                Deletar Orçamentos Antigos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOGS TAB */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Limpar Logs Antigos</CardTitle>
              <CardDescription>Remove logs do sistema mais antigos que o período especificado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Deletar logs com mais de (dias):</Label>
                <Input
                  type="number"
                  value={diasLogs}
                  onChange={(e) => setDiasLogs(parseInt(e.target.value))}
                  min="1"
                  className="mt-2"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Logs criados antes de {new Date(Date.now() - diasLogs * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                </p>
              </div>

              {stats && (
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription>
                    Total de logs no sistema: <strong>{stats.logs + stats.logs_seguranca}</strong>
                  </AlertDescription>
                </Alert>
              )}

              <Button 
                onClick={() => openConfirmDialog('limparLogs')}
                variant="destructive"
                className="w-full"
              >
                <Trash2 size={16} className="mr-2" />
                Limpar Logs Antigos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MÓDULOS TAB */}
        <TabsContent value="modulos">
          <Card>
            <CardHeader>
              <CardTitle>Resetar Módulo Completo</CardTitle>
              <CardDescription>Remove TODOS os dados de um módulo específico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Selecione o módulo:</Label>
                <select
                  value={moduloSelecionado}
                  onChange={(e) => setModuloSelecionado(e.target.value)}
                  className="w-full mt-2 p-2 border rounded-md"
                >
                  <option value="">Selecione...</option>
                  <option value="vendas">Vendas ({stats?.vendas || 0} registros)</option>
                  <option value="orcamentos">Orçamentos ({stats?.orcamentos || 0} registros)</option>
                  <option value="notas_fiscais">Notas Fiscais ({stats?.notas_fiscais || 0} registros)</option>
                  <option value="produtos">Produtos ({stats?.produtos || 0} registros)</option>
                  <option value="movimentacoes_estoque">Movimentações Estoque ({stats?.movimentacoes_estoque || 0} registros)</option>
                  <option value="inventarios">Inventários ({stats?.inventarios || 0} registros)</option>
                  <option value="logs">Logs ({stats?.logs || 0} registros)</option>
                </select>
              </div>

              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Esta ação deletará TODOS os registros do módulo selecionado permanentemente!
                </AlertDescription>
              </Alert>

              <Button 
                onClick={() => openConfirmDialog('resetarModulo')}
                variant="destructive"
                className="w-full"
                disabled={!moduloSelecionado}
              >
                <XCircle size={16} className="mr-2" />
                Resetar Módulo Selecionado
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AUDITORIA TAB */}
        <TabsContent value="auditoria">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="text-blue-600" size={24} />
                Logs de Auditoria Administrativa
              </CardTitle>
              <CardDescription>Histórico de todas as ações administrativas realizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {logsAuditoria.map((log, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={log.acao.includes('limpar_tudo') ? 'destructive' : 'default'}>
                          {log.acao}
                        </Badge>
                        <span className="font-semibold">{log.user_nome}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                        Ver detalhes
                      </summary>
                      <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                        {JSON.stringify(log.detalhes, null, 2)}
                      </pre>
                    </details>
                  </div>
                ))}
                {logsAuditoria.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Activity size={64} className="mx-auto mb-4 text-gray-300" />
                    <p>Nenhuma ação administrativa registrada</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Confirmação */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={24} />
              Confirmação Necessária
            </DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Por favor, confirme com a senha mestra.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {confirmDialog.action === 'limparTudo' && (
              <div>
                <Label>Digite "LIMPAR TUDO" para confirmar:</Label>
                <Input
                  value={confirmarLimparTudo}
                  onChange={(e) => setConfirmarLimparTudo(e.target.value)}
                  placeholder="LIMPAR TUDO"
                  className="mt-2"
                />
              </div>
            )}

            <div>
              <Label>Senha Mestra:</Label>
              <Input
                type="password"
                value={senhaMestra}
                onChange={(e) => setSenhaMestra(e.target.value)}
                placeholder="Digite a senha mestra"
                className="mt-2"
              />
            </div>

            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertDescription className="text-yellow-800 text-sm">
                {confirmDialog.action === 'deleteVendas' && `Você está prestes a deletar vendas com mais de ${diasVendas} dias.`}
                {confirmDialog.action === 'deleteOrcamentos' && `Você está prestes a deletar orçamentos com mais de ${diasOrcamentos} dias.`}
                {confirmDialog.action === 'limparLogs' && `Você está prestes a deletar logs com mais de ${diasLogs} dias.`}
                {confirmDialog.action === 'resetarModulo' && `Você está prestes a resetar completamente o módulo "${moduloSelecionado}".`}
                {confirmDialog.action === 'removerTeste' && 'Você está prestes a remover todos os dados de teste do sistema.'}
                {confirmDialog.action === 'limparTudo' && 'Você está prestes a LIMPAR TODO O SISTEMA incluindo TODOS os LOGS (exceto Usuários e Papéis/Permissões). Esta é a ação mais destrutiva!'}
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialog({ open: false, action: null, data: {} });
                setSenhaMestra('');
                setConfirmarLimparTudo('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirmDialog.action === 'deleteVendas') handleDeleteVendasAntigas();
                if (confirmDialog.action === 'deleteOrcamentos') handleDeleteOrcamentosAntigos();
                if (confirmDialog.action === 'limparLogs') handleLimparLogs();
                if (confirmDialog.action === 'resetarModulo') handleResetarModulo();
                if (confirmDialog.action === 'removerTeste') handleRemoverDadosTeste();
                if (confirmDialog.action === 'limparTudo') handleLimparTudo();
              }}
              disabled={loading}
            >
              {loading ? 'Processando...' : 'Confirmar e Executar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Administracao;
