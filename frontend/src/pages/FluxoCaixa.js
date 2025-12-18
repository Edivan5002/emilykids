import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Activity, TrendingUp, TrendingDown, DollarSign, Calendar, 
  RefreshCw, Download, ChevronLeft, ChevronRight, Eye, Filter
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDateBR, formatDateStringBR } from '../utils/dateFormatter';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FluxoCaixa = () => {
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [fluxo, setFluxo] = useState(null);
  const [filtros, setFiltros] = useState({
    data_inicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0]
  });
  const [expandedPeriodos, setExpandedPeriodos] = useState({});
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 20;

  useEffect(() => {
    fetchDashboard();
    fetchFluxo();
  }, []);

  const fetchDashboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/fluxo-caixa/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
    } catch (error) {
      console.error('Erro ao buscar dashboard:', error);
      toast.error('Erro ao carregar dashboard');
    }
  };

  const fetchFluxo = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        data_inicio: filtros.data_inicio,
        data_fim: filtros.data_fim,
        tipo_visao: 'diario'
      });
      
      const response = await axios.get(`${API}/fluxo-caixa?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFluxo(response.data);
      setPaginaAtual(1);
    } catch (error) {
      console.error('Erro ao buscar fluxo:', error);
      toast.error('Erro ao carregar fluxo de caixa');
    } finally {
      setLoading(false);
    }
  };

  const handleAplicarFiltros = () => {
    fetchFluxo();
  };

  const exportarExcel = () => {
    toast.info('Exportação em desenvolvimento');
  };

  const toggleDetalhes = (periodo) => {
    setExpandedPeriodos(prev => ({
      ...prev,
      [periodo]: !prev[periodo]
    }));
  };

  // Lógica de paginação
  const fluxoArray = fluxo?.fluxo || [];
  const totalPaginas = Math.ceil(fluxoArray.length / ITENS_POR_PAGINA);
  const indiceInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFinal = indiceInicial + ITENS_POR_PAGINA;
  const fluxoPaginado = fluxoArray.slice(indiceInicial, indiceFinal);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fluxo de Caixa</h1>
          <p className="text-gray-600">Controle de entradas e saídas financeiras</p>
        </div>
        <Button onClick={exportarExcel} variant="outline">
          <Download size={16} className="mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Dashboard Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Recebido no Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {(dashboard.mes_atual?.recebido || 0).toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                <TrendingUp size={12} className="inline mr-1" />
                Entradas realizadas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">A Receber</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                R$ {(dashboard.mes_atual?.a_receber || 0).toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pendente este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">A Pagar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                R$ {(dashboard.mes_atual?.a_pagar || 0).toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pendente este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Saldo do Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${(dashboard.mes_atual?.saldo_mes || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                R$ {(dashboard.mes_atual?.saldo_mes || 0).toFixed(2)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Entradas - Saídas
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Projeção */}
      {dashboard?.projecao_30_dias && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="text-purple-600" />
              Projeção - Próximos 30 Dias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-2">Entradas Previstas</p>
                <p className="text-2xl font-bold text-green-600">
                  R$ {(dashboard.projecao_30_dias?.entradas_previstas || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Saídas Previstas</p>
                <p className="text-2xl font-bold text-red-600">
                  R$ {(dashboard.projecao_30_dias?.saidas_previstas || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Saldo Projetado</p>
                <p className={`text-2xl font-bold ${(dashboard.projecao_30_dias?.saldo_projetado || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {(dashboard.projecao_30_dias?.saldo_projetado || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter size={20} />
            Filtros de Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => setFiltros({...filtros, data_inicio: e.target.value})}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtros.data_fim}
                onChange={(e) => setFiltros({...filtros, data_fim: e.target.value})}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleAplicarFiltros} className="flex-1" disabled={loading}>
                <RefreshCw size={16} className="mr-2" />
                Atualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Fluxo Detalhado */}
      {fluxo && (
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Caixa Detalhado</CardTitle>
            <CardDescription>
              Período: {formatDateStringBR(filtros.data_inicio)} até {formatDateStringBR(filtros.data_fim)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Resumo do Período */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Entradas</p>
                <p className="text-xl font-bold text-green-600">
                  R$ {(fluxo.resumo?.total_entradas || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Saídas</p>
                <p className="text-xl font-bold text-red-600">
                  R$ {(fluxo.resumo?.total_saidas || 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Saldo do Período</p>
                <p className={`text-xl font-bold ${(fluxo.resumo?.saldo_periodo || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  R$ {(fluxo.resumo?.saldo_periodo || 0).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Lista de Fluxo por Dia */}
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Movimentações por Dia - {fluxoArray.length} {fluxoArray.length === 1 ? 'registro' : 'registros'}
            </h3>

            <div className="space-y-3">
              {fluxoPaginado.map((item) => (
                <div key={item.periodo} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100" onClick={() => toggleDetalhes(item.periodo)}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Calendar size={20} className="text-gray-600" />
                        <div>
                          <p className="font-semibold text-gray-900">{formatDateStringBR(item.periodo)}</p>
                          <p className="text-sm text-gray-600">
                            {item.detalhes_entradas.length + item.detalhes_saidas.length} movimentações
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Entradas</p>
                          <p className="font-semibold text-green-600">R$ {item.entradas.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Saídas</p>
                          <p className="font-semibold text-red-600">R$ {item.saidas.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Saldo do Dia</p>
                          <p className={`font-semibold ${item.saldo_periodo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {item.saldo_periodo.toFixed(2)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Saldo Acumulado</p>
                          <p className={`font-bold ${item.saldo_acumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            R$ {item.saldo_acumulado.toFixed(2)}
                          </p>
                        </div>
                        <Eye size={20} className="text-gray-400" />
                      </div>
                    </div>
                  </div>

                  {/* Detalhes Expandidos */}
                  {expandedPeriodos[item.periodo] && (
                    <div className="p-4 bg-white border-t">
                      <div className="grid grid-cols-2 gap-6">
                        {/* Entradas */}
                        <div>
                          <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                            <TrendingUp size={16} />
                            Entradas ({item.detalhes_entradas.length})
                          </h4>
                          {item.detalhes_entradas.length > 0 ? (
                            <div className="space-y-2">
                              {item.detalhes_entradas.map((entrada, idx) => (
                                <div key={idx} className="flex justify-between items-start p-2 bg-green-50 rounded">
                                  <div>
                                    <p className="font-medium text-sm">{entrada.descricao}</p>
                                    <p className="text-xs text-gray-600">{entrada.tipo}</p>
                                  </div>
                                  <p className="font-semibold text-green-700">R$ {entrada.valor.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Nenhuma entrada</p>
                          )}
                        </div>

                        {/* Saídas */}
                        <div>
                          <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                            <TrendingDown size={16} />
                            Saídas ({item.detalhes_saidas.length})
                          </h4>
                          {item.detalhes_saidas.length > 0 ? (
                            <div className="space-y-2">
                              {item.detalhes_saidas.map((saida, idx) => (
                                <div key={idx} className="flex justify-between items-start p-2 bg-red-50 rounded">
                                  <div>
                                    <p className="font-medium text-sm">{saida.descricao}</p>
                                    <p className="text-xs text-gray-600">{saida.tipo}</p>
                                  </div>
                                  <p className="font-semibold text-red-700">R$ {saida.valor.toFixed(2)}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">Nenhuma saída</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {fluxoArray.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <Activity size={48} className="mx-auto mb-4 text-gray-300" />
                  <p>Nenhuma movimentação encontrada no período selecionado</p>
                </div>
              )}
            </div>

            {/* Paginação */}
            {fluxoArray.length > ITENS_POR_PAGINA && (
              <div className="mt-6 p-4 border rounded-lg bg-white">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Página {paginaAtual} de {totalPaginas} | Mostrando {indiceInicial + 1} a {Math.min(indiceFinal, fluxoArray.length)} de {fluxoArray.length} registros
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                      disabled={paginaAtual === 1}
                    >
                      <ChevronLeft size={16} />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                        <Button
                          key={pagina}
                          variant={paginaAtual === pagina ? "default" : "outline"}
                          size="sm"
                          onClick={() => setPaginaAtual(pagina)}
                          className={paginaAtual === pagina ? "bg-blue-600 text-white" : ""}
                        >
                          {pagina}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                      disabled={paginaAtual === totalPaginas}
                    >
                      Próxima
                      <ChevronRight size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default FluxoCaixa;
