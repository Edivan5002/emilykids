import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, TrendingUp, DollarSign, Users, Package, 
  FileText, Download, Calendar, Filter, RefreshCw, Award, Target,
  Activity, ShoppingCart, AlertCircle, CheckCircle, ChevronLeft, ChevronRight,
  TrendingDown, Percent, CreditCard, Wallet, ArrowUpRight, ArrowDownRight,
  FileSpreadsheet, Truck
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateBR, formatMonthYearBR, formatDateTimeBR, formatDateStringBR } from '@/utils/dateFormatter';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, ComposedChart
} from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Cores para gráficos
const CORES = ['#2C9AA1', '#E76F51', '#F4A261', '#267698', '#22c55e', '#8b5cf6', '#f59e0b', '#ef4444'];
const CORES_ABC = { A: '#22c55e', B: '#f59e0b', C: '#ef4444' };

const Relatorios = () => {
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Estados para relatórios
  const [kpis, setKpis] = useState(null);
  const [vendasPorPeriodo, setVendasPorPeriodo] = useState(null);
  const [vendasPorVendedor, setVendasPorVendedor] = useState(null);
  const [dre, setDre] = useState(null);
  const [curvaABC, setCurvaABC] = useState(null);
  const [rfm, setRfm] = useState(null);
  const [conversaoOrcamentos, setConversaoOrcamentos] = useState(null);
  const [comissoes, setComissoes] = useState(null);
  const [contasReceber, setContasReceber] = useState(null);
  const [contasPagar, setContasPagar] = useState(null);
  const [fluxoCaixa, setFluxoCaixa] = useState(null);
  const [pedidosCompra, setPedidosCompra] = useState(null);
  
  // Filtros avançados
  const [filtroMarca, setFiltroMarca] = useState('all');
  const [filtroCategoria, setFiltroCategoria] = useState('all');
  const [filtroVendedor, setFiltroVendedor] = useState('all');
  
  // Dados de referência
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  
  // Paginação
  const ITENS_POR_PAGINA = 15;
  const [paginaAtual, setPaginaAtual] = useState(1);

  useEffect(() => {
    fetchReferenceData();
    const hoje = new Date();
    const umMesAtras = new Date(hoje);
    umMesAtras.setMonth(umMesAtras.getMonth() - 1);
    setDataFim(hoje.toISOString().split('T')[0]);
    setDataInicio(umMesAtras.toISOString().split('T')[0]);
  }, []);

  const fetchReferenceData = async () => {
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };
    
    try {
      const [prodRes, cliRes, marcasRes, categRes, subcategRes, usersRes] = await Promise.all([
        axios.get(`${API}/produtos?limit=0`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/clientes?limit=0`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/marcas?limit=0`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/categorias?limit=0`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/subcategorias?limit=0`, { headers }).catch(() => ({ data: [] })),
        axios.get(`${API}/usuarios?papel=vendedor&limit=0`, { headers }).catch(() => ({ data: [] }))
      ]);
      
      setProdutos(prodRes.data?.data || prodRes.data || []);
      setClientes(cliRes.data?.data || cliRes.data || []);
      setMarcas(marcasRes.data?.data || marcasRes.data || []);
      setCategorias(categRes.data?.data || categRes.data || []);
      setSubcategorias(subcategRes.data?.data || subcategRes.data || []);
      setVendedores(usersRes.data?.data || usersRes.data || []);
    } catch (err) {
      console.log('Erro ao carregar dados de referência');
    }
  };

  // === FUNÇÕES DE FETCH ===
  
  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/dashboard/kpis`, {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setKpis(response.data);
      toast.success('Dashboard atualizado!');
    } catch (error) {
      toast.error('Erro ao carregar KPIs');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendasPorPeriodo = async (agrupamento = 'dia') => {
    if (!dataInicio || !dataFim) { toast.error('Selecione o período'); return; }
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/vendas/por-periodo`, {
        params: { data_inicio: dataInicio, data_fim: dataFim, agrupamento }
      });
      setVendasPorPeriodo(response.data);
    } catch (error) {
      toast.error('Erro ao carregar vendas');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendasPorVendedor = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/vendas/por-vendedor`, {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setVendasPorVendedor(response.data);
    } catch (error) {
      toast.error('Erro ao carregar vendas por vendedor');
    } finally {
      setLoading(false);
    }
  };

  const fetchComissoes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/comissoes/relatorio`, {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setComissoes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar comissões');
    } finally {
      setLoading(false);
    }
  };

  const fetchDRE = async () => {
    if (!dataInicio || !dataFim) { toast.error('Selecione o período'); return; }
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/financeiro/dre`, {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setDre(response.data);
    } catch (error) {
      toast.error('Erro ao carregar DRE');
    } finally {
      setLoading(false);
    }
  };

  const fetchContasReceber = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/contas-receber`, {
        params: { data_inicio: dataInicio, data_fim: dataFim, limit: 100 }
      });
      const data = response.data?.data || response.data || [];
      
      // Calcular resumo
      const pendentes = data.filter(c => c.status === 'pendente' || c.status === 'vencido');
      const vencidas = data.filter(c => c.status === 'vencido');
      const recebidas = data.filter(c => c.status === 'recebido_total');
      
      setContasReceber({
        contas: data,
        resumo: {
          total_pendente: pendentes.reduce((s, c) => s + (c.valor_total || 0), 0),
          total_vencido: vencidas.reduce((s, c) => s + (c.valor_total || 0), 0),
          total_recebido: recebidas.reduce((s, c) => s + (c.valor_total || 0), 0),
          qtd_pendentes: pendentes.length,
          qtd_vencidas: vencidas.length
        }
      });
    } catch (error) {
      toast.error('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  const fetchContasPagar = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/contas-pagar`, {
        params: { data_inicio: dataInicio, data_fim: dataFim, limit: 100 }
      });
      const data = response.data?.data || response.data || [];
      
      const pendentes = data.filter(c => c.status === 'pendente' || c.status === 'vencido');
      const vencidas = data.filter(c => c.status === 'vencido');
      const pagas = data.filter(c => c.status === 'pago_total');
      
      setContasPagar({
        contas: data,
        resumo: {
          total_pendente: pendentes.reduce((s, c) => s + (c.valor_total || 0), 0),
          total_vencido: vencidas.reduce((s, c) => s + (c.valor_total || 0), 0),
          total_pago: pagas.reduce((s, c) => s + (c.valor_total || 0), 0),
          qtd_pendentes: pendentes.length,
          qtd_vencidas: vencidas.length
        }
      });
    } catch (error) {
      toast.error('Erro ao carregar contas a pagar');
    } finally {
      setLoading(false);
    }
  };

  const fetchFluxoCaixa = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/fluxo-caixa/resumo`, {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setFluxoCaixa(response.data);
    } catch (error) {
      // Se o endpoint não existir, calcular localmente
      if (contasReceber && contasPagar) {
        setFluxoCaixa({
          entradas: contasReceber.resumo.total_recebido,
          saidas: contasPagar.resumo.total_pago,
          saldo: contasReceber.resumo.total_recebido - contasPagar.resumo.total_pago
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCurvaABC = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/produtos/curva-abc`);
      setCurvaABC(response.data);
    } catch (error) {
      toast.error('Erro ao carregar Curva ABC');
    } finally {
      setLoading(false);
    }
  };

  const fetchPedidosCompra = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/pedidos-compra`, { params: { limit: 100 } });
      const data = response.data?.data || response.data || [];
      
      const porStatus = {
        rascunho: data.filter(p => p.status === 'rascunho'),
        enviado: data.filter(p => p.status === 'enviado'),
        recebido: data.filter(p => p.status === 'recebido')
      };
      
      setPedidosCompra({
        pedidos: data,
        resumo: {
          total: data.length,
          valor_total: data.reduce((s, p) => s + (p.valor_total || 0), 0),
          por_status: porStatus
        }
      });
    } catch (error) {
      toast.error('Erro ao carregar pedidos de compra');
    } finally {
      setLoading(false);
    }
  };

  const fetchRFM = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/clientes/rfm`);
      setRfm(response.data);
    } catch (error) {
      toast.error('Erro ao carregar RFM');
    } finally {
      setLoading(false);
    }
  };

  const fetchConversaoOrcamentos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/orcamentos/conversao`, {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setConversaoOrcamentos(response.data);
    } catch (error) {
      toast.error('Erro ao carregar conversão');
    } finally {
      setLoading(false);
    }
  };

  // === EXPORTAÇÃO CSV CORRIGIDA ===
  const exportarCSV = (dados, nomeArquivo) => {
    if (!dados || (Array.isArray(dados) && dados.length === 0)) {
      toast.error('Sem dados para exportar');
      return;
    }

    let csvContent = '';
    let dataArray = Array.isArray(dados) ? dados : (dados.dados ? Object.entries(dados.dados) : [dados]);
    
    if (dataArray.length === 0) {
      toast.error('Sem dados para exportar');
      return;
    }

    // Se for objeto com entradas (vendas por período)
    if (!Array.isArray(dados) && dados.dados) {
      csvContent = 'Data,Quantidade,Valor Total,Ticket Médio\n';
      Object.entries(dados.dados).forEach(([data, info]) => {
        csvContent += `${data},${info.quantidade},${info.valor_total?.toFixed(2)},${info.ticket_medio?.toFixed(2)}\n`;
      });
    } else if (Array.isArray(dataArray) && dataArray.length > 0) {
      // Array de objetos
      const headers = Object.keys(dataArray[0]);
      csvContent = headers.join(',') + '\n';
      dataArray.forEach(item => {
        const row = headers.map(h => {
          const val = item[h];
          if (typeof val === 'object') return JSON.stringify(val);
          if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
          return val ?? '';
        });
        csvContent += row.join(',') + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${nomeArquivo}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado!');
  };

  // === HELPERS ===
  const formatMoeda = (valor) => `R$ ${(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  const getProdutoNome = (id) => produtos.find(p => p.id === id)?.nome || 'Desconhecido';
  const getClienteNome = (id) => clientes.find(c => c.id === id)?.nome || 'Desconhecido';

  // Dados para gráficos
  const vendasChartData = vendasPorPeriodo ? 
    Object.entries(vendasPorPeriodo.dados).map(([data, info]) => ({
      data: data.length > 10 ? data.substring(5) : data,
      valor: info.valor_total || 0,
      quantidade: info.quantidade || 0
    })) : [];

  const vendedoresChartData = vendasPorVendedor?.vendedores?.map(v => ({
    nome: v.vendedor_nome?.split(' ')[0] || 'N/A',
    valor: v.valor_total || 0,
    quantidade: v.quantidade_vendas || 0
  })) || [];

  const curvaABCChartData = curvaABC?.curvas ? 
    Object.entries(curvaABC.curvas).filter(([k]) => k !== 'null').map(([curva, info]) => ({
      name: `Curva ${curva}`,
      value: info.count || 0,
      faturamento: info.faturamento || 0
    })) : [];

  return (
    <div className="page-container" data-testid="relatorios-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Relatórios e Análises</h1>
        <p className="text-gray-600">Business Intelligence e Dashboards Executivos</p>
      </div>

      {/* Filtro Global de Período */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <Label>Data Início</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </div>
            <div>
              <Label>Marca</Label>
              <Select value={filtroMarca} onValueChange={setFiltroMarca}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Categoria</Label>
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={fetchKPIs} disabled={loading}>
              {loading ? 'Carregando...' : 'Aplicar Filtros'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6 mb-4">
          <TabsTrigger value="dashboard"><BarChart3 className="mr-1" size={14} />Dashboard</TabsTrigger>
          <TabsTrigger value="vendas"><ShoppingCart className="mr-1" size={14} />Vendas</TabsTrigger>
          <TabsTrigger value="financeiro"><DollarSign className="mr-1" size={14} />Financeiro</TabsTrigger>
          <TabsTrigger value="estoque"><Package className="mr-1" size={14} />Estoque</TabsTrigger>
          <TabsTrigger value="compras"><Truck className="mr-1" size={14} />Compras</TabsTrigger>
          <TabsTrigger value="clientes"><Users className="mr-1" size={14} />Clientes</TabsTrigger>
        </TabsList>

        {/* TAB: DASHBOARD */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Dashboard Executivo</h2>
              <Button onClick={fetchKPIs} size="sm" disabled={loading}>
                <RefreshCw className="mr-2" size={14} />Atualizar
              </Button>
            </div>

            {kpis ? (
              <>
                {/* KPIs Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500"><ShoppingCart className="text-white" size={20} /></div>
                        <div>
                          <p className="text-xs text-gray-600">Total Vendas</p>
                          <p className="text-xl font-bold">{kpis.vendas?.total || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500"><DollarSign className="text-white" size={20} /></div>
                        <div>
                          <p className="text-xs text-gray-600">Faturamento</p>
                          <p className="text-xl font-bold">{formatMoeda(kpis.vendas?.faturamento)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500"><Target className="text-white" size={20} /></div>
                        <div>
                          <p className="text-xs text-gray-600">Ticket Médio</p>
                          <p className="text-xl font-bold">{formatMoeda(kpis.vendas?.ticket_medio)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-orange-500"><Users className="text-white" size={20} /></div>
                        <div>
                          <p className="text-xs text-gray-600">Clientes Ativos</p>
                          <p className="text-xl font-bold">{kpis.clientes?.total || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Gráfico de Vendas */}
                {kpis.vendas_por_dia && Object.keys(kpis.vendas_por_dia).length > 0 && (
                  <Card>
                    <CardHeader><CardTitle>Evolução de Vendas</CardTitle></CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={Object.entries(kpis.vendas_por_dia).map(([d, v]) => ({ data: d.substring(5), valor: v.valor || 0, qtd: v.quantidade || 0 }))}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="data" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip formatter={(v, n) => n === 'valor' ? formatMoeda(v) : v} />
                          <Legend />
                          <Bar yAxisId="left" dataKey="valor" fill="#2C9AA1" name="Faturamento" />
                          <Line yAxisId="right" type="monotone" dataKey="qtd" stroke="#E76F51" name="Quantidade" />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Selecione um período e clique em "Aplicar Filtros"</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: VENDAS */}
        <TabsContent value="vendas">
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-bold">Relatórios de Vendas</h2>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => fetchVendasPorPeriodo('dia')} size="sm" disabled={loading}>Por Dia</Button>
                <Button onClick={() => fetchVendasPorPeriodo('mes')} size="sm" disabled={loading}>Por Mês</Button>
                <Button onClick={fetchVendasPorVendedor} size="sm" disabled={loading}>Por Vendedor</Button>
                <Button onClick={fetchComissoes} size="sm" disabled={loading} variant="outline">Comissões</Button>
              </div>
            </div>

            {/* Gráfico de Vendas por Período */}
            {vendasPorPeriodo && vendasChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Vendas por {vendasPorPeriodo.agrupamento === 'dia' ? 'Dia' : 'Mês'}</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportarCSV(vendasPorPeriodo, 'vendas_periodo')}>
                      <Download className="mr-2" size={14} />CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={vendasChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="data" />
                      <YAxis />
                      <Tooltip formatter={(v) => formatMoeda(v)} />
                      <Legend />
                      <Area type="monotone" dataKey="valor" stroke="#2C9AA1" fill="#2C9AA1" fillOpacity={0.3} name="Faturamento" />
                    </AreaChart>
                  </ResponsiveContainer>
                  
                  {/* Tabela */}
                  <div className="mt-4 overflow-x-auto max-h-64">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="p-2 text-left">Período</th>
                          <th className="p-2 text-right">Quantidade</th>
                          <th className="p-2 text-right">Valor Total</th>
                          <th className="p-2 text-right">Ticket Médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(vendasPorPeriodo.dados).slice(0, 20).map(([data, info]) => (
                          <tr key={data} className="border-b">
                            <td className="p-2">{data}</td>
                            <td className="p-2 text-right">{info.quantidade}</td>
                            <td className="p-2 text-right font-semibold text-green-600">{formatMoeda(info.valor_total)}</td>
                            <td className="p-2 text-right">{formatMoeda(info.ticket_medio)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vendas por Vendedor */}
            {vendasPorVendedor && vendedoresChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Vendas por Vendedor</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportarCSV(vendasPorVendedor.vendedores, 'vendas_vendedor')}>
                      <Download className="mr-2" size={14} />CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={vendedoresChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="nome" type="category" width={80} />
                        <Tooltip formatter={(v) => formatMoeda(v)} />
                        <Bar dataKey="valor" fill="#2C9AA1" name="Faturamento" />
                      </BarChart>
                    </ResponsiveContainer>
                    
                    <div className="overflow-x-auto max-h-64">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-2 text-left">Vendedor</th>
                            <th className="p-2 text-right">Vendas</th>
                            <th className="p-2 text-right">Faturamento</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vendasPorVendedor.vendedores?.map((v, i) => (
                            <tr key={i} className="border-b">
                              <td className="p-2">{v.vendedor_nome}</td>
                              <td className="p-2 text-right">{v.quantidade_vendas}</td>
                              <td className="p-2 text-right font-semibold text-green-600">{formatMoeda(v.valor_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comissões */}
            {comissoes && (
              <Card>
                <CardHeader><CardTitle>Relatório de Comissões</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Total Vendas</p>
                      <p className="text-lg font-bold">{formatMoeda(comissoes.totais?.total_vendas)}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Total Comissões</p>
                      <p className="text-lg font-bold text-green-600">{formatMoeda(comissoes.totais?.total_comissao)}</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Pendente</p>
                      <p className="text-lg font-bold text-yellow-600">{formatMoeda(comissoes.totais?.comissao_pendente)}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Pago</p>
                      <p className="text-lg font-bold text-purple-600">{formatMoeda(comissoes.totais?.comissao_paga)}</p>
                    </div>
                  </div>
                  
                  {comissoes.vendedores?.length > 0 && (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={comissoes.vendedores}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="vendedor_nome" />
                        <YAxis />
                        <Tooltip formatter={(v) => formatMoeda(v)} />
                        <Bar dataKey="total_comissao" fill="#22c55e" name="Comissão" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: FINANCEIRO */}
        <TabsContent value="financeiro">
          <div className="space-y-6">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-bold">Relatórios Financeiros</h2>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={fetchDRE} size="sm" disabled={loading}>DRE</Button>
                <Button onClick={fetchContasReceber} size="sm" disabled={loading}>Contas a Receber</Button>
                <Button onClick={fetchContasPagar} size="sm" disabled={loading}>Contas a Pagar</Button>
                <Button onClick={() => { fetchContasReceber(); fetchContasPagar(); }} size="sm" disabled={loading} variant="outline">Fluxo de Caixa</Button>
              </div>
            </div>

            {/* DRE */}
            {dre && (
              <Card>
                <CardHeader>
                  <CardTitle>DRE - Demonstrativo de Resultado</CardTitle>
                  <p className="text-sm text-gray-600">Período: {formatDateStringBR(dre.periodo?.data_inicio)} a {formatDateStringBR(dre.periodo?.data_fim)}</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gráfico */}
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Lucro Bruto', value: dre.lucro_bruto || 0 },
                            { name: 'CMV', value: dre.cmv || 0 },
                            { name: 'Descontos', value: dre.descontos || 0 }
                          ]}
                          cx="50%" cy="50%" outerRadius={100} label
                        >
                          {[0,1,2].map((i) => <Cell key={i} fill={CORES[i]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => formatMoeda(v)} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Tabela DRE */}
                    <div className="space-y-2">
                      <div className="p-3 bg-blue-50 rounded flex justify-between">
                        <span>Receita Bruta</span>
                        <span className="font-bold">{formatMoeda(dre.receita_bruta)}</span>
                      </div>
                      <div className="p-3 bg-red-50 rounded flex justify-between">
                        <span>(-) Descontos</span>
                        <span className="font-bold text-red-600">{formatMoeda(dre.descontos)}</span>
                      </div>
                      <div className="p-3 bg-green-50 rounded flex justify-between">
                        <span>= Receita Líquida</span>
                        <span className="font-bold text-green-600">{formatMoeda(dre.receita_liquida)}</span>
                      </div>
                      <div className="p-3 bg-orange-50 rounded flex justify-between">
                        <span>(-) CMV</span>
                        <span className="font-bold text-orange-600">{formatMoeda(dre.cmv)}</span>
                      </div>
                      <div className="p-3 rounded flex justify-between" style={{backgroundColor: '#2C9AA1'}}>
                        <span className="text-white font-semibold">= Lucro Bruto ({dre.margem_bruta_percentual?.toFixed(1)}%)</span>
                        <span className="font-bold text-white text-lg">{formatMoeda(dre.lucro_bruto)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contas a Receber */}
            {contasReceber && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="text-green-500" />Contas a Receber</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-yellow-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Pendente ({contasReceber.resumo.qtd_pendentes})</p>
                      <p className="text-lg font-bold text-yellow-600">{formatMoeda(contasReceber.resumo.total_pendente)}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Vencido ({contasReceber.resumo.qtd_vencidas})</p>
                      <p className="text-lg font-bold text-red-600">{formatMoeda(contasReceber.resumo.total_vencido)}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Recebido</p>
                      <p className="text-lg font-bold text-green-600">{formatMoeda(contasReceber.resumo.total_recebido)}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Total Contas</p>
                      <p className="text-lg font-bold">{contasReceber.contas?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contas a Pagar */}
            {contasPagar && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><TrendingDown className="text-red-500" />Contas a Pagar</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-yellow-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Pendente ({contasPagar.resumo.qtd_pendentes})</p>
                      <p className="text-lg font-bold text-yellow-600">{formatMoeda(contasPagar.resumo.total_pendente)}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Vencido ({contasPagar.resumo.qtd_vencidas})</p>
                      <p className="text-lg font-bold text-red-600">{formatMoeda(contasPagar.resumo.total_vencido)}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Pago</p>
                      <p className="text-lg font-bold text-green-600">{formatMoeda(contasPagar.resumo.total_pago)}</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded">
                      <p className="text-xs text-gray-600">Total Contas</p>
                      <p className="text-lg font-bold">{contasPagar.contas?.length || 0}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fluxo de Caixa Resumo */}
            {contasReceber && contasPagar && (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Activity className="text-blue-500" />Fluxo de Caixa - Resumo</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-100 rounded-lg text-center">
                      <ArrowUpRight className="mx-auto text-green-600 mb-2" size={32} />
                      <p className="text-sm text-gray-600">Entradas</p>
                      <p className="text-2xl font-bold text-green-600">{formatMoeda(contasReceber.resumo.total_recebido)}</p>
                    </div>
                    <div className="p-4 bg-red-100 rounded-lg text-center">
                      <ArrowDownRight className="mx-auto text-red-600 mb-2" size={32} />
                      <p className="text-sm text-gray-600">Saídas</p>
                      <p className="text-2xl font-bold text-red-600">{formatMoeda(contasPagar.resumo.total_pago)}</p>
                    </div>
                    <div className={`p-4 rounded-lg text-center ${(contasReceber.resumo.total_recebido - contasPagar.resumo.total_pago) >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                      <Wallet className={`mx-auto mb-2 ${(contasReceber.resumo.total_recebido - contasPagar.resumo.total_pago) >= 0 ? 'text-blue-600' : 'text-orange-600'}`} size={32} />
                      <p className="text-sm text-gray-600">Saldo</p>
                      <p className={`text-2xl font-bold ${(contasReceber.resumo.total_recebido - contasPagar.resumo.total_pago) >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                        {formatMoeda(contasReceber.resumo.total_recebido - contasPagar.resumo.total_pago)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!dre && !contasReceber && !contasPagar && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Selecione um relatório financeiro para visualizar</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: ESTOQUE */}
        <TabsContent value="estoque">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Análise de Estoque</h2>
              <Button onClick={fetchCurvaABC} size="sm" disabled={loading}>Gerar Curva ABC</Button>
            </div>

            {curvaABC && curvaABCChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Curva ABC de Produtos</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportarCSV(curvaABC.curvas, 'curva_abc')}>
                      <Download className="mr-2" size={14} />CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gráfico Pizza */}
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={curvaABCChartData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({name, value}) => `${name}: ${value}`}>
                          {curvaABCChartData.map((entry, i) => (
                            <Cell key={i} fill={CORES_ABC[entry.name.split(' ')[1]] || CORES[i]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Cards por Curva */}
                    <div className="space-y-3">
                      {['A', 'B', 'C'].map(curva => (
                        <div key={curva} className="p-3 rounded-lg border flex items-center gap-3" style={{borderColor: CORES_ABC[curva]}}>
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{backgroundColor: CORES_ABC[curva]}}>{curva}</div>
                          <div className="flex-1">
                            <p className="font-semibold">{curva === 'A' ? '80% do faturamento' : curva === 'B' ? '15% do faturamento' : '5% do faturamento'}</p>
                            <p className="text-sm text-gray-600">{curvaABC.curvas?.[curva]?.count || 0} produtos | {formatMoeda(curvaABC.curvas?.[curva]?.faturamento)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!curvaABC && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Clique em "Gerar Curva ABC" para analisar o estoque</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: COMPRAS */}
        <TabsContent value="compras">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Relatório de Compras</h2>
              <Button onClick={fetchPedidosCompra} size="sm" disabled={loading}>Carregar Pedidos</Button>
            </div>

            {pedidosCompra && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-gray-600">Total Pedidos</p>
                      <p className="text-2xl font-bold">{pedidosCompra.resumo.total}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-gray-600">Valor Total</p>
                      <p className="text-2xl font-bold text-blue-600">{formatMoeda(pedidosCompra.resumo.valor_total)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-gray-600">Em Rascunho</p>
                      <p className="text-2xl font-bold text-gray-600">{pedidosCompra.resumo.por_status?.rascunho?.length || 0}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <p className="text-xs text-gray-600">Recebidos</p>
                      <p className="text-2xl font-bold text-green-600">{pedidosCompra.resumo.por_status?.recebido?.length || 0}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader><CardTitle>Últimos Pedidos de Compra</CardTitle></CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="p-2 text-left">Número</th>
                            <th className="p-2 text-left">Fornecedor</th>
                            <th className="p-2 text-right">Valor</th>
                            <th className="p-2 text-center">Status</th>
                            <th className="p-2 text-left">Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pedidosCompra.pedidos?.slice(0, 10).map(p => (
                            <tr key={p.id} className="border-b">
                              <td className="p-2 font-mono">{p.numero}</td>
                              <td className="p-2">{p.fornecedor_nome || 'N/A'}</td>
                              <td className="p-2 text-right font-semibold">{formatMoeda(p.valor_total)}</td>
                              <td className="p-2 text-center">
                                <span className={`px-2 py-1 rounded-full text-xs ${p.status === 'recebido' ? 'bg-green-100 text-green-700' : p.status === 'enviado' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="p-2">{new Date(p.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!pedidosCompra && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <Truck size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Clique em "Carregar Pedidos" para ver o relatório de compras</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: CLIENTES */}
        <TabsContent value="clientes">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Análise de Clientes</h2>
              <div className="flex gap-2">
                <Button onClick={fetchRFM} size="sm" disabled={loading}>Análise RFM</Button>
                <Button onClick={fetchConversaoOrcamentos} size="sm" disabled={loading}>Conversão Orçamentos</Button>
              </div>
            </div>

            {rfm && (
              <Card>
                <CardHeader><CardTitle>Análise RFM - Segmentação de Clientes</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {rfm.segmentos?.map((seg, i) => (
                      <div key={i} className="p-3 rounded-lg border">
                        <p className="font-semibold">{seg.nome}</p>
                        <p className="text-2xl font-bold" style={{color: CORES[i]}}>{seg.quantidade}</p>
                        <p className="text-xs text-gray-600">clientes</p>
                      </div>
                    ))}
                  </div>
                  
                  {rfm.segmentos && (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={rfm.segmentos} dataKey="quantidade" nameKey="nome" cx="50%" cy="50%" outerRadius={80} label>
                          {rfm.segmentos.map((_, i) => <Cell key={i} fill={CORES[i]} />)}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            )}

            {conversaoOrcamentos && (
              <Card>
                <CardHeader><CardTitle>Taxa de Conversão de Orçamentos</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-3 rounded text-center">
                      <p className="text-xs text-gray-600">Total Orçamentos</p>
                      <p className="text-2xl font-bold">{conversaoOrcamentos.total_orcamentos || 0}</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded text-center">
                      <p className="text-xs text-gray-600">Convertidos</p>
                      <p className="text-2xl font-bold text-green-600">{conversaoOrcamentos.convertidos || 0}</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded text-center">
                      <p className="text-xs text-gray-600">Não Convertidos</p>
                      <p className="text-2xl font-bold text-red-600">{conversaoOrcamentos.nao_convertidos || 0}</p>
                    </div>
                    <div className="bg-purple-50 p-3 rounded text-center">
                      <p className="text-xs text-gray-600">Taxa Conversão</p>
                      <p className="text-2xl font-bold text-purple-600">{conversaoOrcamentos.taxa_conversao?.toFixed(1) || 0}%</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!rfm && !conversaoOrcamentos && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Selecione um tipo de análise de clientes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;
