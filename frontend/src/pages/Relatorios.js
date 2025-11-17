import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, PieChart, TrendingUp, DollarSign, Users, Package, 
  FileText, Download, Calendar, Filter, RefreshCw, Award, Target,
  Activity, ShoppingCart, AlertCircle, CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Relatorios = () => {
  const [loading, setLoading] = useState(false);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  // Estados para cada tipo de relatório
  const [kpis, setKpis] = useState(null);
  const [vendasPorPeriodo, setVendasPorPeriodo] = useState(null);
  const [vendasPorVendedor, setVendasPorVendedor] = useState(null);
  const [dre, setDre] = useState(null);
  const [curvaABC, setCurvaABC] = useState(null);
  const [rfm, setRfm] = useState(null);
  const [conversaoOrcamentos, setConversaoOrcamentos] = useState(null);
  const [auditoria, setAuditoria] = useState(null);
  
  // Produtos e clientes para referência
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);

  useEffect(() => {
    fetchReferenceData();
    // Definir datas padrão (último mês)
    const hoje = new Date();
    const umMesAtras = new Date(hoje);
    umMesAtras.setMonth(umMesAtras.getMonth() - 1);
    
    setDataFim(hoje.toISOString().split('T')[0]);
    setDataInicio(umMesAtras.toISOString().split('T')[0]);
  }, []);

  const fetchReferenceData = async () => {
    // Tentar carregar produtos
    try {
      const prodRes = await axios.get(`${API}/produtos?limit=0`);
      const produtosData = prodRes.data?.data || prodRes.data || [];
      setProdutos(produtosData);
    } catch (err) {
      console.log('Sem permissão para produtos');
      setProdutos([]);
    }
    
    // Tentar carregar clientes
    try {
      const cliRes = await axios.get(`${API}/clientes?limit=0`);
      const clientesData = cliRes.data?.data || cliRes.data || [];
      setClientes(clientesData);
    } catch (err) {
      console.log('Sem permissão para clientes');
      setClientes([]);
    }
    
    // Tentar carregar marcas
    try {
      const marcasRes = await axios.get(`${API}/marcas?limit=0`);
      const marcasData = marcasRes.data?.data || marcasRes.data || [];
      setMarcas(marcasData);
    } catch (err) {
      console.log('Sem permissão para marcas');
      setMarcas([]);
    }
    
    // Tentar carregar categorias
    try {
      const categRes = await axios.get(`${API}/categorias?limit=0`);
      const categoriasData = categRes.data?.data || categRes.data || [];
      setCategorias(categoriasData);
    } catch (err) {
      console.log('Sem permissão para categorias');
      setCategorias([]);
    }
    
    // Tentar carregar subcategorias
    try {
      const subcategRes = await axios.get(`${API}/subcategorias?limit=0`);
      const subcategoriasData = subcategRes.data?.data || subcategRes.data || [];
      setSubcategorias(subcategoriasData);
    } catch (err) {
      console.log('Sem permissão para subcategorias');
      setSubcategorias([]);
    }
  };

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/dashboard/kpis`, {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setKpis(response.data);
      toast.success('KPIs carregados com sucesso!');
    } catch (error) {
      toast.error('Erro ao carregar KPIs');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendasPorPeriodo = async (agrupamento = 'dia') => {
    if (!dataInicio || !dataFim) {
      toast.error('Selecione o período');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/vendas/por-periodo`, {
        params: { data_inicio: dataInicio, data_fim: dataFim, agrupamento }
      });
      setVendasPorPeriodo(response.data);
      toast.success('Relatório de vendas carregado!');
    } catch (error) {
      toast.error('Erro ao carregar relatório de vendas');
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
      toast.success('Relatório por vendedor carregado!');
    } catch (error) {
      toast.error('Erro ao carregar relatório por vendedor');
    } finally {
      setLoading(false);
    }
  };

  const fetchDRE = async () => {
    if (!dataInicio || !dataFim) {
      toast.error('Selecione o período');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/financeiro/dre`, {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setDre(response.data);
      toast.success('DRE carregado com sucesso!');
    } catch (error) {
      toast.error('Erro ao carregar DRE');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurvaABC = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/estoque/curva-abc`);
      setCurvaABC(response.data);
      toast.success('Curva ABC carregada!');
    } catch (error) {
      toast.error('Erro ao carregar Curva ABC');
    } finally {
      setLoading(false);
    }
  };

  const fetchRFM = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/clientes/rfm`);
      setRfm(response.data);
      toast.success('Análise RFM carregada!');
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
      toast.success('Relatório de conversão carregado!');
    } catch (error) {
      toast.error('Erro ao carregar conversão');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditoria = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/relatorios/operacional/auditoria`, {
        params: { data_inicio: dataInicio, data_fim: dataFim }
      });
      setAuditoria(response.data);
      toast.success('Relatório de auditoria carregado!');
    } catch (error) {
      toast.error('Erro ao carregar auditoria');
    } finally {
      setLoading(false);
    }
  };

  const exportarCSV = (dados, nomeArquivo) => {
    // Função simples de exportação CSV
    const csv = 'data:text/csv;charset=utf-8,' + encodeURIComponent(
      JSON.stringify(dados, null, 2)
    );
    const link = document.createElement('a');
    link.href = csv;
    link.download = `${nomeArquivo}_${new Date().toISOString()}.csv`;
    link.click();
    toast.success('Relatório exportado!');
  };

  const getProdutoNome = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto?.nome || 'Desconhecido';
  };
  
  const getProdutoDescricaoCompleta = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return 'Produto não encontrado';
    
    const marca = marcas.find(m => m.id === produto.marca_id);
    const categoria = categorias.find(c => c.id === produto.categoria_id);
    const subcategoria = subcategorias.find(s => s.id === produto.subcategoria_id);
    
    const marcaNome = marca?.nome || 'N/A';
    const categoriaNome = categoria?.nome || 'N/A';
    const subcategoriaNome = subcategoria?.nome || 'N/A';
    
    return `${marcaNome} | ${categoriaNome} | ${subcategoriaNome} | ${produto.nome}`;
  };

  const getClienteNome = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome || 'Desconhecido';
  };

  return (
    <div className="page-container" data-testid="relatorios-page">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Relatórios e Análises</h1>
            <p className="text-gray-600">Business Intelligence e Dashboards Executivos</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchReferenceData}>
              <RefreshCw className="mr-2" size={16} />
              Atualizar
            </Button>
          </div>
        </div>
      </div>

      {/* Filtro Global de Período */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filtros Globais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchKPIs} className="w-full" disabled={loading}>
                {loading ? 'Carregando...' : 'Aplicar Filtros'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2" size={16} />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="vendas">
            <ShoppingCart className="mr-2" size={16} />
            Vendas
          </TabsTrigger>
          <TabsTrigger value="financeiro">
            <DollarSign className="mr-2" size={16} />
            Financeiro
          </TabsTrigger>
          <TabsTrigger value="estoque">
            <Package className="mr-2" size={16} />
            Estoque
          </TabsTrigger>
          <TabsTrigger value="clientes">
            <Users className="mr-2" size={16} />
            Clientes
          </TabsTrigger>
        </TabsList>

        {/* TAB: DASHBOARD EXECUTIVO */}
        <TabsContent value="dashboard">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Dashboard Executivo</h2>
              <Button onClick={fetchKPIs} size="sm" disabled={loading}>
                <RefreshCw className="mr-2" size={14} />
                Atualizar KPIs
              </Button>
            </div>

            {kpis && (
              <>
                {/* KPIs Principais */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-blue-500">
                          <ShoppingCart className="text-white" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Total de Vendas</p>
                          <p className="text-2xl font-bold">{kpis.vendas.total}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg bg-green-500">
                          <DollarSign className="text-white" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Faturamento</p>
                          <p className="text-2xl font-bold">R$ {kpis.vendas.faturamento.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg" style={{backgroundColor: '#2C9AA1'}}>
                          <TrendingUp className="text-white" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Ticket Médio</p>
                          <p className="text-2xl font-bold">R$ {kpis.vendas.ticket_medio.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-lg" style={{backgroundColor: '#E76F51'}}>
                          <Users className="text-white" size={24} />
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Clientes Ativos</p>
                          <p className="text-2xl font-bold">{kpis.clientes.ativos}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Métricas Secundárias */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Estoque</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Valor Total</span>
                          <span className="font-bold">R$ {kpis.estoque.valor_total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Produtos</span>
                          <span className="font-bold">{kpis.estoque.produtos_total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-red-600">Alertas Mínimo</span>
                          <span className="font-bold text-red-600">{kpis.estoque.alertas_minimo}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Orçamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total</span>
                          <span className="font-bold">{kpis.orcamentos.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-orange-600">Abertos</span>
                          <span className="font-bold text-orange-600">{kpis.orcamentos.abertos}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-green-600">Taxa Conversão</span>
                          <span className="font-bold text-green-600">{kpis.orcamentos.taxa_conversao.toFixed(1)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Clientes</span>
                          <span className="font-bold">{kpis.clientes.total}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Descontos</span>
                          <span className="font-bold text-red-600">R$ {kpis.vendas.total_descontos.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Total Frete</span>
                          <span className="font-bold text-green-600">R$ {kpis.vendas.total_frete.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Produtos */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award size={20} />
                      Top 5 Produtos Mais Vendidos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {kpis.top_produtos.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold" style={{backgroundColor: '#2C9AA1', color: 'white'}}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{item.produto_descricao || getProdutoNome(item.produto_id)}</p>
                              <p className="text-sm text-gray-600">R$ {item.faturamento.toFixed(2)}</p>
                            </div>
                          </div>
                          <span className="text-lg font-bold" style={{color: '#E76F51'}}>{item.quantidade} un</span>
                        </div>
                      ))}
                      {kpis.top_produtos.length === 0 && (
                        <p className="text-center text-gray-500 py-4">Nenhum dado disponível</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {!kpis && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <BarChart3 size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Selecione um período e clique em "Aplicar Filtros" para carregar o dashboard</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: VENDAS */}
        <TabsContent value="vendas">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Relatórios de Vendas</h2>
              <div className="flex gap-2">
                <Button onClick={() => fetchVendasPorPeriodo('dia')} size="sm" disabled={loading}>
                  Por Dia
                </Button>
                <Button onClick={() => fetchVendasPorPeriodo('mes')} size="sm" disabled={loading}>
                  Por Mês
                </Button>
                <Button onClick={fetchVendasPorVendedor} size="sm" disabled={loading}>
                  Por Vendedor
                </Button>
              </div>
            </div>

            {/* Vendas Por Período */}
            {vendasPorPeriodo && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Vendas por Período ({vendasPorPeriodo.agrupamento})</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportarCSV(vendasPorPeriodo, 'vendas_periodo')}>
                      <Download className="mr-2" size={14} />
                      Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold">Total de Vendas:</span>
                      <span className="font-bold">{vendasPorPeriodo.total_vendas}</span>
                    </div>
                    <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                      <span className="font-semibold">Faturamento Total:</span>
                      <span className="font-bold text-green-600">R$ {vendasPorPeriodo.faturamento_total.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold">Período</th>
                          <th className="text-center p-3 text-sm font-semibold">Quantidade</th>
                          <th className="text-center p-3 text-sm font-semibold">Faturamento</th>
                          <th className="text-center p-3 text-sm font-semibold">Ticket Médio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(vendasPorPeriodo.dados).map(([periodo, dados]) => (
                          <tr key={periodo} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm">{periodo}</td>
                            <td className="p-3 text-sm text-center">{dados.quantidade}</td>
                            <td className="p-3 text-sm text-center font-medium">R$ {dados.faturamento.toFixed(2)}</td>
                            <td className="p-3 text-sm text-center font-medium">R$ {dados.ticket_medio.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vendas Por Vendedor */}
            {vendasPorVendedor && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Performance por Vendedor</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportarCSV(vendasPorVendedor, 'vendas_vendedor')}>
                      <Download className="mr-2" size={14} />
                      Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {vendasPorVendedor.vendedores.map((vendedor, index) => (
                      <div key={index} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-semibold">{vendedor.user_nome}</p>
                              <p className="text-sm text-gray-600">{vendedor.quantidade} vendas</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold" style={{color: '#2C9AA1'}}>R$ {vendedor.faturamento.toFixed(2)}</p>
                            <p className="text-sm text-gray-600">Ticket: R$ {vendedor.ticket_medio.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {vendasPorVendedor.vendedores.length === 0 && (
                      <p className="text-center text-gray-500 py-4">Nenhum dado disponível</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {!vendasPorPeriodo && !vendasPorVendedor && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <ShoppingCart size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Clique em um dos botões acima para gerar relatórios de vendas</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: FINANCEIRO */}
        <TabsContent value="financeiro">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Relatórios Financeiros</h2>
              <Button onClick={fetchDRE} size="sm" disabled={loading || !dataInicio || !dataFim}>
                Gerar DRE
              </Button>
            </div>

            {dre && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>DRE - Demonstrativo de Resultado do Exercício</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportarCSV(dre, 'dre')}>
                      <Download className="mr-2" size={14} />
                      Exportar
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    Período: {dre.periodo.data_inicio} a {dre.periodo.data_fim}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-blue-900">Receita Bruta</span>
                        <span className="text-xl font-bold text-blue-900">R$ {dre.receita_bruta.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-red-900">(-) Descontos</span>
                        <span className="text-xl font-bold text-red-900">R$ {dre.descontos.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-green-900">= Receita Líquida</span>
                        <span className="text-xl font-bold text-green-900">R$ {dre.receita_liquida.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="p-4 bg-orange-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-orange-900">(-) CMV (Custo Mercadoria Vendida)</span>
                        <span className="text-xl font-bold text-orange-900">R$ {dre.cmv.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg" style={{backgroundColor: '#2C9AA1'}}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-white text-lg">= Lucro Bruto</span>
                        <span className="text-2xl font-bold text-white">R$ {dre.lucro_bruto.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white opacity-90">Margem Bruta</span>
                        <span className="font-semibold text-white">{dre.margem_bruta_percentual.toFixed(2)}%</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-lg" style={{backgroundColor: '#E76F51'}}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-white text-lg">= Lucro Líquido</span>
                        <span className="text-2xl font-bold text-white">R$ {dre.lucro_liquido.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-white opacity-90">Margem Líquida</span>
                        <span className="font-semibold text-white">{dre.margem_liquida_percentual.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!dre && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Selecione um período e clique em "Gerar DRE"</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: ESTOQUE */}
        <TabsContent value="estoque">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Análise de Estoque</h2>
              <Button onClick={fetchCurvaABC} size="sm" disabled={loading}>
                Gerar Curva ABC
              </Button>
            </div>

            {curvaABC && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Curva ABC - Análise de Produtos</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportarCSV(curvaABC, 'curva_abc')}>
                      <Download className="mr-2" size={14} />
                      Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Resumo da Distribuição */}
                  <div className="filters-grid-3 mb-4 sm:mb-6">
                    <div className="p-4 bg-green-50 rounded-lg border-2 border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Classe A</p>
                          <p className="text-2xl font-bold text-green-600">{curvaABC.distribuicao.classe_a}</p>
                          <p className="text-xs text-gray-500">80% do faturamento</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-lg">
                          A
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Classe B</p>
                          <p className="text-2xl font-bold text-yellow-600">{curvaABC.distribuicao.classe_b}</p>
                          <p className="text-xs text-gray-500">15% do faturamento</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-yellow-500 text-white flex items-center justify-center font-bold text-lg">
                          B
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-red-50 rounded-lg border-2 border-red-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-gray-600">Classe C</p>
                          <p className="text-2xl font-bold text-red-600">{curvaABC.distribuicao.classe_c}</p>
                          <p className="text-xs text-gray-500">5% do faturamento</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-lg">
                          C
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tabela de Produtos */}
                  <div className="table-responsive">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold">Classe</th>
                          <th className="text-left p-3 text-sm font-semibold">Produto</th>
                          <th className="text-center p-3 text-sm font-semibold">Faturamento</th>
                          <th className="text-center p-3 text-sm font-semibold">% Individual</th>
                          <th className="text-center p-3 text-sm font-semibold">% Acumulado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {curvaABC.produtos.slice(0, 20).map((produto, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded font-bold text-white ${
                                produto.classe === 'A' ? 'bg-green-500' :
                                produto.classe === 'B' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}>
                                {produto.classe}
                              </span>
                            </td>
                            <td className="p-3 text-sm font-medium">{produto.produto_descricao || produto.produto_nome}</td>
                            <td className="p-3 text-sm text-center">R$ {produto.faturamento.toFixed(2)}</td>
                            <td className="p-3 text-sm text-center">{produto.percentual.toFixed(2)}%</td>
                            <td className="p-3 text-sm text-center font-medium">{produto.percentual_acumulado.toFixed(2)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {!curvaABC && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <Package size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Clique em "Gerar Curva ABC" para analisar seus produtos</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: CLIENTES */}
        <TabsContent value="clientes">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Análise de Clientes</h2>
              <div className="flex gap-2">
                <Button onClick={fetchRFM} size="sm" disabled={loading}>
                  Análise RFM
                </Button>
                <Button onClick={fetchConversaoOrcamentos} size="sm" disabled={loading}>
                  Conversão Orçamentos
                </Button>
                <Button onClick={fetchAuditoria} size="sm" disabled={loading}>
                  Auditoria
                </Button>
              </div>
            </div>

            {/* Análise RFM */}
            {rfm && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Análise RFM - Segmentação de Clientes</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">Recência, Frequência e Valor Monetário</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => exportarCSV(rfm, 'analise_rfm')}>
                      <Download className="mr-2" size={14} />
                      Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="table-responsive">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 text-sm font-semibold">Cliente</th>
                          <th className="text-center p-3 text-sm font-semibold">Segmento</th>
                          <th className="text-center p-3 text-sm font-semibold">Score RFM</th>
                          <th className="text-center p-3 text-sm font-semibold">Recência (dias)</th>
                          <th className="text-center p-3 text-sm font-semibold">Frequência</th>
                          <th className="text-center p-3 text-sm font-semibold">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rfm.clientes.slice(0, 20).map((cliente, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-3 text-sm font-medium">{cliente.cliente_nome}</td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                cliente.segmento === 'Champions' ? 'bg-green-100 text-green-800' :
                                cliente.segmento === 'Loyal Customers' ? 'bg-blue-100 text-blue-800' :
                                cliente.segmento === 'Promising' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {cliente.segmento}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex justify-center gap-1">
                                <span className="px-2 py-1 rounded bg-red-100 text-red-800 text-xs font-bold">{cliente.score_r}</span>
                                <span className="px-2 py-1 rounded bg-blue-100 text-blue-800 text-xs font-bold">{cliente.score_f}</span>
                                <span className="px-2 py-1 rounded bg-green-100 text-green-800 text-xs font-bold">{cliente.score_m}</span>
                              </div>
                            </td>
                            <td className="p-3 text-sm text-center">{cliente.recencia_dias}</td>
                            <td className="p-3 text-sm text-center">{cliente.frequencia}</td>
                            <td className="p-3 text-sm text-center font-medium">R$ {cliente.valor_monetario.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conversão de Orçamentos */}
            {conversaoOrcamentos && (
              <Card>
                <CardHeader>
                  <CardTitle>Análise de Conversão de Orçamentos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status dos Orçamentos */}
                    <div className="space-y-3">
                      <h3 className="font-semibold mb-3">Status dos Orçamentos</h3>
                      <div className="p-3 bg-blue-50 rounded-lg flex justify-between">
                        <span>Total de Orçamentos</span>
                        <span className="font-bold">{conversaoOrcamentos.total_orcamentos}</span>
                      </div>
                      <div className="p-3 bg-orange-50 rounded-lg flex justify-between">
                        <span>Abertos</span>
                        <span className="font-bold text-orange-600">{conversaoOrcamentos.status.abertos}</span>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg flex justify-between">
                        <span>Vendidos (Convertidos)</span>
                        <span className="font-bold text-green-600">{conversaoOrcamentos.status.vendidos}</span>
                      </div>
                      <div className="p-3 bg-yellow-50 rounded-lg flex justify-between">
                        <span>Devolvidos</span>
                        <span className="font-bold text-yellow-600">{conversaoOrcamentos.status.devolvidos}</span>
                      </div>
                    </div>

                    {/* Métricas */}
                    <div className="space-y-3">
                      <h3 className="font-semibold mb-3">Métricas de Performance</h3>
                      <div className="p-4 rounded-lg" style={{backgroundColor: '#2C9AA1'}}>
                        <p className="text-white text-sm mb-1">Taxa de Conversão</p>
                        <p className="text-white text-3xl font-bold">{conversaoOrcamentos.taxa_conversao_percentual.toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
                        <span className="text-sm">Valor Médio Orçamento</span>
                        <span className="font-bold">R$ {conversaoOrcamentos.valores.valor_medio_orcamento.toFixed(2)}</span>
                      </div>
                      <div className="p-3 bg-gray-50 rounded-lg flex justify-between">
                        <span className="text-sm">Valor Médio Vendido</span>
                        <span className="font-bold">R$ {conversaoOrcamentos.valores.valor_medio_vendido.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Auditoria */}
            {auditoria && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Relatório de Auditoria - Logs do Sistema</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => exportarCSV(auditoria, 'auditoria')}>
                      <Download className="mr-2" size={14} />
                      Exportar
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="filters-grid-3 mb-4 sm:mb-6">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Total de Ações</p>
                      <p className="text-2xl font-bold text-blue-600">{auditoria.total_acoes}</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-gray-600">Usuários Ativos</p>
                      <p className="text-2xl font-bold text-green-600">{Object.keys(auditoria.acoes_por_usuario).length}</p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-gray-600">Telas Acessadas</p>
                      <p className="text-2xl font-bold text-purple-600">{Object.keys(auditoria.acoes_por_tela).length}</p>
                    </div>
                  </div>

                  {/* Logs Recentes */}
                  <h3 className="font-semibold mb-3">Últimas Ações</h3>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {auditoria.logs_recentes.map((log, index) => (
                      <div key={index} className="p-3 border rounded-lg text-sm hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">{log.user_nome}</span>
                          <span className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <span className="px-2 py-0.5 rounded bg-gray-100 text-xs">{log.tela}</span>
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-xs">{log.acao}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {!rfm && !conversaoOrcamentos && !auditoria && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>Selecione um relatório acima para visualizar análises de clientes</p>
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
