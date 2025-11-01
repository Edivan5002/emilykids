import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  History, 
  Activity, 
  AlertTriangle, 
  Shield, 
  Download, 
  Archive,
  BarChart3,
  Users,
  Clock,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Monitor,
  Smartphone,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Logs = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dashboard
  const [dashboard, setDashboard] = useState(null);
  
  // Logs
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 20;
  
  // Filtros
  const [filtros, setFiltros] = useState({
    data_inicio: '',
    data_fim: '',
    user_id: '',
    severidade: '',
    tela: '',
    acao: '',
    metodo_http: ''
  });
  
  // Estatísticas
  const [estatisticas, setEstatisticas] = useState(null);
  
  // Logs de Segurança
  const [logsSeguranca, setLogsSeguranca] = useState([]);
  const [totalLogsSeguranca, setTotalLogsSeguranca] = useState(0);
  const [pageSeguranca, setPageSeguranca] = useState(1);
  
  // Atividades Suspeitas
  const [atividadesSuspeitas, setAtividadesSuspeitas] = useState(null);
  
  // Loading
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    
    if (activeTab === 'dashboard') {
      fetchDashboard();
    } else if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'estatisticas') {
      fetchEstatisticas();
    } else if (activeTab === 'seguranca') {
      fetchLogsSeguranca();
    } else if (activeTab === 'suspeitas') {
      fetchAtividadesSuspeitas();
    }
  }, [activeTab, currentPage, pageSeguranca]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/logs/dashboard`);
      setDashboard(response.data);
    } catch (error) {
      toast.error('Erro ao carregar dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = {
        limit: logsPerPage,
        offset: (currentPage - 1) * logsPerPage,
        ...filtros
      };
      
      // Remover parâmetros vazios
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null || params[key] === 'all') {
          delete params[key];
        }
      });
      
      const response = await axios.get(`${API}/logs`, { params });
      setLogs(response.data.logs);
      setTotalLogs(response.data.total);
    } catch (error) {
      toast.error('Erro ao carregar logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchEstatisticas = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtros.data_inicio) params.data_inicio = filtros.data_inicio;
      if (filtros.data_fim) params.data_fim = filtros.data_fim;
      
      const response = await axios.get(`${API}/logs/estatisticas`, { params });
      setEstatisticas(response.data);
    } catch (error) {
      toast.error('Erro ao carregar estatísticas');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogsSeguranca = async () => {
    setLoading(true);
    try {
      const params = {
        limit: 20,
        offset: (pageSeguranca - 1) * 20
      };
      
      const response = await axios.get(`${API}/logs/seguranca`, { params });
      setLogsSeguranca(response.data.logs);
      setTotalLogsSeguranca(response.data.total);
    } catch (error) {
      toast.error('Erro ao carregar logs de segurança');
    } finally {
      setLoading(false);
    }
  };

  const fetchAtividadesSuspeitas = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/logs/atividade-suspeita`);
      setAtividadesSuspeitas(response.data);
    } catch (error) {
      toast.error('Erro ao carregar atividades suspeitas');
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = async (formato) => {
    try {
      const params = { formato };
      if (filtros.data_inicio) params.data_inicio = filtros.data_inicio;
      if (filtros.data_fim) params.data_fim = filtros.data_fim;
      
      const response = await axios.get(`${API}/logs/exportar`, { params });
      
      if (formato === 'json') {
        const blob = new Blob([JSON.stringify(response.data.logs, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString()}.json`;
        a.click();
      } else if (formato === 'csv') {
        const blob = new Blob([response.data.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs_${new Date().toISOString()}.csv`;
        a.click();
      }
      
      toast.success(`Logs exportados em ${formato.toUpperCase()}`);
    } catch (error) {
      toast.error('Erro ao exportar logs');
    }
  };

  const handleArquivar = async () => {
    if (!window.confirm('Deseja arquivar logs antigos? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      const response = await axios.post(`${API}/logs/arquivar-antigos`);
      toast.success(response.data.message);
      fetchLogs();
    } catch (error) {
      toast.error('Erro ao arquivar logs');
    }
  };

  const handleAplicarFiltros = () => {
    setCurrentPage(1);
    fetchLogs();
  };

  const handleLimparFiltros = () => {
    setFiltros({
      data_inicio: '',
      data_fim: '',
      user_id: '',
      severidade: '',
      tela: '',
      acao: '',
      metodo_http: ''
    });
    setCurrentPage(1);
  };

  const getSeveridadeBadge = (severidade) => {
    const classes = {
      'INFO': 'bg-blue-100 text-blue-800',
      'WARNING': 'bg-yellow-100 text-yellow-800',
      'ERROR': 'bg-red-100 text-red-800',
      'CRITICAL': 'bg-purple-100 text-purple-800',
      'SECURITY': 'bg-pink-100 text-pink-800'
    };
    return classes[severidade] || 'bg-gray-100 text-gray-800';
  };

  const totalPages = Math.ceil(totalLogs / logsPerPage);
  const totalPagesSeguranca = Math.ceil(totalLogsSeguranca / 20);

  return (
    <div className="page-container" data-testid="logs-page">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <History size={32} className="text-pink-500" />
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Sistema de Logs</h1>
              <p className="text-gray-600">Auditoria, monitoramento e segurança</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => handleExportar('json')} variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              JSON
            </Button>
            <Button onClick={() => handleExportar('csv')} variant="outline" size="sm">
              <Download size={16} className="mr-2" />
              CSV
            </Button>
            <Button onClick={handleArquivar} variant="outline" size="sm">
              <Archive size={16} className="mr-2" />
              Arquivar Antigos
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger value="dashboard">
            <Activity size={16} className="mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History size={16} className="mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="estatisticas">
            <BarChart3 size={16} className="mr-2" />
            Estatísticas
          </TabsTrigger>
          <TabsTrigger value="seguranca">
            <Shield size={16} className="mr-2" />
            Segurança
          </TabsTrigger>
          <TabsTrigger value="suspeitas">
            <AlertTriangle size={16} className="mr-2" />
            Atividades Suspeitas
          </TabsTrigger>
        </TabsList>

        {/* DASHBOARD */}
        <TabsContent value="dashboard">
          {loading ? (
            <div className="text-center py-12">Carregando...</div>
          ) : dashboard ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total de Logs</p>
                        <p className="text-3xl font-bold text-gray-900">{dashboard.kpis.total_logs}</p>
                      </div>
                      <History className="text-blue-500" size={32} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Erros</p>
                        <p className="text-3xl font-bold text-red-600">{dashboard.kpis.total_erros}</p>
                      </div>
                      <AlertCircle className="text-red-500" size={32} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Segurança</p>
                        <p className="text-3xl font-bold text-pink-600">{dashboard.kpis.total_security}</p>
                      </div>
                      <Shield className="text-pink-500" size={32} />
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Usuários Ativos</p>
                        <p className="text-3xl font-bold text-green-600">{dashboard.kpis.usuarios_ativos}</p>
                      </div>
                      <Users className="text-green-500" size={32} />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Atividade por Dia - Últimos 7 Dias</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(dashboard.atividade_por_dia).sort().reverse().map(([dia, total]) => (
                      <div key={dia} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          {new Date(dia).toLocaleDateString('pt-BR')}
                        </span>
                        <div className="flex items-center gap-3">
                          <div className="w-64 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-pink-500 h-2 rounded-full transition-all"
                              style={{ width: `${(total / Math.max(...Object.values(dashboard.atividade_por_dia))) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold w-12 text-right">{total}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {dashboard.logs_seguranca_recentes.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="text-pink-500" size={20} />
                      Logs de Segurança Recentes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.logs_seguranca_recentes.map((log, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-pink-50">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-pink-100 text-pink-800">{log.tipo}</Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <p>IP: {log.ip}</p>
                            {log.user_email && <p>Email: {log.user_email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">Nenhum dado disponível</div>
          )}
        </TabsContent>

        {/* LOGS */}
        <TabsContent value="logs">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Data Início</Label>
                  <Input
                    type="datetime-local"
                    value={filtros.data_inicio}
                    onChange={(e) => setFiltros({...filtros, data_inicio: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                  />
                </div>
                
                <div>
                  <Label>Data Fim</Label>
                  <Input
                    type="datetime-local"
                    value={filtros.data_fim}
                    onChange={(e) => setFiltros({...filtros, data_fim: e.target.value ? new Date(e.target.value).toISOString() : ''})}
                  />
                </div>
                
                <div>
                  <Label>Severidade</Label>
                  <Select value={filtros.severidade} onValueChange={(value) => setFiltros({...filtros, severidade: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="INFO">INFO</SelectItem>
                      <SelectItem value="WARNING">WARNING</SelectItem>
                      <SelectItem value="ERROR">ERROR</SelectItem>
                      <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                      <SelectItem value="SECURITY">SECURITY</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Tela</Label>
                  <Input
                    placeholder="Ex: Dashboard, Vendas..."
                    value={filtros.tela}
                    onChange={(e) => setFiltros({...filtros, tela: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Ação</Label>
                  <Input
                    placeholder="Ex: login, criar, editar..."
                    value={filtros.acao}
                    onChange={(e) => setFiltros({...filtros, acao: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Método HTTP</Label>
                  <Select value={filtros.metodo_http} onValueChange={(value) => setFiltros({...filtros, metodo_http: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="GET">GET</SelectItem>
                      <SelectItem value="POST">POST</SelectItem>
                      <SelectItem value="PUT">PUT</SelectItem>
                      <SelectItem value="DELETE">DELETE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-end gap-2 md:col-span-2">
                  <Button onClick={handleAplicarFiltros} className="flex-1">
                    <Search size={16} className="mr-2" />
                    Aplicar Filtros
                  </Button>
                  <Button onClick={handleLimparFiltros} variant="outline">
                    Limpar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Logs ({totalLogs} registros)</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">Carregando...</div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {logs.map((log, idx) => (
                      <div key={idx} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <Badge className={getSeveridadeBadge(log.severidade)}>
                              {log.severidade}
                            </Badge>
                            <span className="font-semibold text-gray-900">{log.user_nome}</span>
                            {log.user_papel && (
                              <span className="text-xs text-gray-500">({log.user_papel})</span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                          <div>
                            <span className="text-gray-500">Tela:</span>
                            <span className="ml-2 font-medium">{log.tela}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Ação:</span>
                            <span className="ml-2 font-medium">{log.acao}</span>
                          </div>
                          {log.metodo_http && (
                            <div>
                              <span className="text-gray-500">Método:</span>
                              <span className="ml-2 font-medium">{log.metodo_http}</span>
                            </div>
                          )}
                          {log.status_code && (
                            <div>
                              <span className="text-gray-500">Status:</span>
                              <span className="ml-2 font-medium">{log.status_code}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Globe size={12} />
                            {log.ip}
                          </span>
                          {log.navegador && (
                            <span className="flex items-center gap-1">
                              <Monitor size={12} />
                              {log.navegador}
                            </span>
                          )}
                          {log.dispositivo && (
                            <span className="flex items-center gap-1">
                              <Smartphone size={12} />
                              {log.dispositivo}
                            </span>
                          )}
                          {log.tempo_execucao_ms && (
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {log.tempo_execucao_ms.toFixed(2)}ms
                            </span>
                          )}
                        </div>
                        
                        {log.erro && (
                          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                            <span className="font-semibold">Erro:</span> {log.erro}
                          </div>
                        )}
                        
                        {log.detalhes && Object.keys(log.detalhes).length > 0 && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                              Ver detalhes
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">
                              {JSON.stringify(log.detalhes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>

                  {logs.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      Nenhum log encontrado com os filtros aplicados
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Página {currentPage} de {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ESTATÍSTICAS */}
        <TabsContent value="estatisticas">
          {loading ? (
            <div className="text-center py-12">Carregando...</div>
          ) : estatisticas ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Por Severidade</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(estatisticas.por_severidade).sort((a, b) => b[1] - a[1]).map(([sev, count]) => (
                        <div key={sev} className="flex items-center justify-between">
                          <Badge className={getSeveridadeBadge(sev)}>{sev}</Badge>
                          <div className="flex items-center gap-3 flex-1 ml-4">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-pink-500 h-2 rounded-full"
                                style={{ width: `${(count / estatisticas.total_logs) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold w-16 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Por Ação</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(estatisticas.por_acao).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([acao, count]) => (
                        <div key={acao} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{acao}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Por Tela</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(estatisticas.por_tela).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([tela, count]) => (
                        <div key={tela} className="flex items-center justify-between text-sm">
                          <span className="text-gray-700">{tela}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Usuários Mais Ativos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {estatisticas.top_usuarios.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">#{idx + 1}</span>
                            <span className="text-gray-700">{item.usuario}</span>
                          </div>
                          <span className="font-semibold">{item.quantidade}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Por Dispositivo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(estatisticas.por_dispositivo).map(([disp, count]) => (
                        <div key={disp} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{disp}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Por Navegador</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(estatisticas.por_navegador).map(([nav, count]) => (
                        <div key={nav} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{nav}</span>
                          <span className="font-semibold">{count}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="text-sm text-gray-600">Tempo Médio de Execução</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {estatisticas.performance.tempo_medio_ms.toFixed(2)}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total de Medidas</p>
                      <p className="text-3xl font-bold text-gray-900">
                        {estatisticas.performance.total_medidas}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total de Erros</p>
                      <p className="text-3xl font-bold text-red-600">
                        {estatisticas.total_erros}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Button onClick={fetchEstatisticas}>Carregar Estatísticas</Button>
            </div>
          )}
        </TabsContent>

        {/* SEGURANÇA */}
        <TabsContent value="seguranca">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="text-pink-500" size={24} />
                Logs de Segurança ({totalLogsSeguranca} registros)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12">Carregando...</div>
              ) : (
                <>
                  <div className="space-y-3 mb-6">
                    {logsSeguranca.map((log, idx) => (
                      <div key={idx} className="p-4 border-2 border-pink-200 rounded-lg bg-pink-50">
                        <div className="flex items-start justify-between mb-3">
                          <Badge className="bg-pink-100 text-pink-800">{log.tipo}</Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div>
                            <span className="text-gray-600">IP:</span>
                            <span className="ml-2 font-medium">{log.ip}</span>
                          </div>
                          {log.user_email && (
                            <div>
                              <span className="text-gray-600">Email:</span>
                              <span className="ml-2 font-medium">{log.user_email}</span>
                            </div>
                          )}
                          {log.user_id && (
                            <div>
                              <span className="text-gray-600">User ID:</span>
                              <span className="ml-2 font-medium">{log.user_id}</span>
                            </div>
                          )}
                        </div>
                        
                        {log.detalhes && (
                          <details className="mt-3">
                            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                              Ver detalhes
                            </summary>
                            <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
                              {JSON.stringify(log.detalhes, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>

                  {logsSeguranca.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      Nenhum log de segurança encontrado
                    </div>
                  )}

                  {totalPagesSeguranca > 1 && (
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Página {pageSeguranca} de {totalPagesSeguranca}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPageSeguranca(p => Math.max(1, p - 1))}
                          disabled={pageSeguranca === 1}
                        >
                          <ChevronLeft size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPageSeguranca(p => Math.min(totalPagesSeguranca, p + 1))}
                          disabled={pageSeguranca === totalPagesSeguranca}
                        >
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ATIVIDADES SUSPEITAS */}
        <TabsContent value="suspeitas">
          {loading ? (
            <div className="text-center py-12">Carregando...</div>
          ) : atividadesSuspeitas ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-orange-500" size={24} />
                    IPs Suspeitos - {atividadesSuspeitas.periodo}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {atividadesSuspeitas.total_ips_suspeitos > 0 ? (
                    <div className="space-y-4">
                      {atividadesSuspeitas.ips_suspeitos.map((item, idx) => (
                        <div key={idx} className="p-4 border-2 border-orange-200 rounded-lg bg-orange-50">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Badge className="bg-orange-100 text-orange-800">
                                {item.tentativas} tentativas
                              </Badge>
                              <span className="font-mono font-semibold">{item.ip}</span>
                            </div>
                            <span className="text-sm text-gray-500">
                              Última: {new Date(item.ultima_tentativa).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          {item.emails_tentados.length > 0 && (
                            <div className="text-sm">
                              <span className="text-gray-600">Emails tentados:</span>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.emails_tentados.map((email, i) => (
                                  <Badge key={i} variant="outline">{email}</Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <TrendingUp className="mx-auto mb-3 text-green-500" size={48} />
                      <p className="text-lg font-semibold text-green-600">Nenhum IP suspeito detectado!</p>
                      <p className="text-sm text-gray-500 mt-2">Sistema seguro nas últimas 24 horas</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="text-red-500" size={24} />
                    Acessos Negados Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {atividadesSuspeitas.acessos_negados_recentes > 0 ? (
                    <div className="space-y-3">
                      {atividadesSuspeitas.detalhes_acessos_negados.map((log, idx) => (
                        <div key={idx} className="p-3 border rounded-lg bg-red-50">
                          <div className="flex items-center justify-between mb-2">
                            <Badge className="bg-red-100 text-red-800">{log.tipo}</Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(log.timestamp).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700">
                            <p>IP: {log.ip}</p>
                            {log.user_email && <p>Email: {log.user_email}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Nenhum acesso negado nas últimas 24 horas
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Button onClick={fetchAtividadesSuspeitas}>Verificar Atividades Suspeitas</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Logs;