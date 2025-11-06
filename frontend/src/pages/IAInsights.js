import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, ShoppingCart, BarChart3, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

// Componente para ícone Emily Kids (boneca com balão)
const EmilyIcon = ({ size = 20, className = "" }) => (
  <img 
    src="/boneca.png" 
    alt="Emily Kids" 
    style={{ width: size, height: size }}
    className={`inline-block ${className}`}
  />
);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const IAInsights = () => {
  const [loading, setLoading] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [clientes, setClientes] = useState([]);
  
  // Estados para cada análise
  const [previsaoData, setPrevisaoData] = useState(null);
  const [precificacaoData, setPrecificacaoData] = useState(null);
  const [recomendacoesData, setRecomendacoesData] = useState(null);
  const [analisePredicaoData, setAnalisePredicaoData] = useState(null);
  
  // Seleções
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, cliRes] = await Promise.all([
        axios.get(`${API}/produtos`),
        axios.get(`${API}/clientes`)
      ]);
      setProdutos(prodRes.data);
      setClientes(cliRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const analisarPrevisaoDemanda = async () => {
    if (!produtoSelecionado) {
      toast.error('Selecione um produto');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ia/previsao-demanda`, {
        produto_id: produtoSelecionado
      });
      setPrevisaoData(response.data);
      toast.success('Análise de previsão concluída!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao analisar');
    } finally {
      setLoading(false);
    }
  };

  const analisarPrecificacao = async () => {
    if (!produtoSelecionado) {
      toast.error('Selecione um produto');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ia/sugestao-precificacao`, {
        produto_id: produtoSelecionado
      });
      setPrecificacaoData(response.data);
      toast.success('Análise de precificação concluída!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao analisar precificação');
    } finally {
      setLoading(false);
    }
  };

  const analisarRecomendacoes = async () => {
    if (!clienteSelecionado) {
      toast.error('Selecione um cliente');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/ia/recomendacoes-cliente`, {
        cliente_id: clienteSelecionado
      });
      setRecomendacoesData(response.data);
      toast.success('Recomendações geradas!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao analisar');
    } finally {
      setLoading(false);
    }
  };

  const analisarPreditiva = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/ia/analise-preditiva`);
      setAnalisePredicaoData(response.data);
      toast.success('Análise preditiva concluída!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao analisar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container" data-testid="ia-insights-page">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl" style={{backgroundColor: '#267698'}}>
            <EmilyIcon size={32} className="text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-4xl font-bold" style={{color: '#F26C4F'}}>E</span>
              <span className="text-4xl font-bold" style={{color: '#F4A261'}}>M</span>
              <span className="text-4xl font-bold" style={{color: '#267698'}}>I</span>
              <span className="text-4xl font-bold" style={{color: '#2C9AA1'}}>L</span>
              <span className="text-4xl font-bold" style={{color: '#E76F51'}}>Y</span>
              <span className="text-4xl font-bold ml-2" style={{color: '#3A3A3A'}}>KIDS</span>
              <span className="text-2xl font-bold ml-2 text-gray-600">IA</span>
            </div>
            <p className="text-gray-600">Inteligência artificial para seu negócio</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="previsao" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="previsao" data-testid="tab-previsao">
            <TrendingUp className="mr-2" size={16} />
            Previsão de Demanda
          </TabsTrigger>
          <TabsTrigger value="recomendacoes" data-testid="tab-recomendacoes">
            <ShoppingCart className="mr-2" size={16} />
            Recomendações
          </TabsTrigger>
          <TabsTrigger value="preditiva" data-testid="tab-preditiva">
            <BarChart3 className="mr-2" size={16} />
            Análise Preditiva
          </TabsTrigger>
        </TabsList>

        {/* PREVISÃO DE DEMANDA */}
        <TabsContent value="previsao" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Previsão de Demanda com IA</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Selecione um Produto</label>
                <Select value={produtoSelecionado} onValueChange={setProdutoSelecionado}>
                  <SelectTrigger data-testid="select-produto">
                    <SelectValue placeholder="Escolha um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nome} - SKU: {p.sku}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={analisarPrevisaoDemanda} 
                disabled={loading || !produtoSelecionado}
                data-testid="btn-analisar-previsao"
                className="w-full"
                style={{backgroundColor: '#267698'}}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    Analisando...
                  </>
                ) : (
                  <>
                    <EmilyIcon size={16} className="mr-2" />
                    Analisar com IA
                  </>
                )}
              </Button>

              {previsaoData && (
                <div className="mt-6 space-y-4" data-testid="previsao-result">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Produto Analisado</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Nome:</p>
                        <p className="font-medium">{previsaoData.produto.nome}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">SKU:</p>
                        <p className="font-medium">{previsaoData.produto.sku}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Estoque Atual:</p>
                        <p className="font-medium">{previsaoData.produto.estoque_atual} un</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Estoque Mínimo:</p>
                        <p className="font-medium">{previsaoData.produto.estoque_minimo} un</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Estatísticas</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Vendido:</p>
                        <p className="font-medium text-xl">{previsaoData.estatisticas.total_vendido} un</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Nº de Vendas:</p>
                        <p className="font-medium text-xl">{previsaoData.estatisticas.quantidade_vendas}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Média Mensal:</p>
                        <p className="font-medium text-xl">{previsaoData.estatisticas.media_mensal} un</p>
                      </div>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <EmilyIcon size={20} />
                        Análise da IA (GPT-4)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                          {previsaoData.analise_ia}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* RECOMENDAÇÕES */}
        <TabsContent value="recomendacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recomendações Personalizadas para Clientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Selecione um Cliente</label>
                <Select value={clienteSelecionado} onValueChange={setClienteSelecionado}>
                  <SelectTrigger data-testid="select-cliente">
                    <SelectValue placeholder="Escolha um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} - {c.cpf_cnpj}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                onClick={analisarRecomendacoes} 
                disabled={loading || !clienteSelecionado}
                data-testid="btn-analisar-recomendacoes"
                className="w-full"
                style={{backgroundColor: '#2C9AA1'}}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    Analisando...
                  </>
                ) : (
                  <>
                    <EmilyIcon size={16} className="mr-2" />
                    Gerar Recomendações
                  </>
                )}
              </Button>

              {recomendacoesData && (
                <div className="mt-6 space-y-4" data-testid="recomendacoes-result">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Cliente Analisado</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Nome:</p>
                        <p className="font-medium">{recomendacoesData.cliente.nome}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Email:</p>
                        <p className="font-medium">{recomendacoesData.cliente.email || 'Não informado'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">Perfil de Compras</h3>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total de Compras:</p>
                        <p className="font-medium text-xl">{recomendacoesData.estatisticas.total_compras}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Total Gasto:</p>
                        <p className="font-medium text-xl">R$ {recomendacoesData.estatisticas.total_gasto.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Ticket Médio:</p>
                        <p className="font-medium text-xl">R$ {recomendacoesData.estatisticas.ticket_medio.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Produtos Distintos:</p>
                        <p className="font-medium text-xl">{recomendacoesData.estatisticas.produtos_distintos}</p>
                      </div>
                    </div>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <EmilyIcon size={20} />
                        Recomendações da IA (GPT-4)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                          {recomendacoesData.recomendacoes_ia}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ANÁLISE PREDITIVA */}
        <TabsContent value="preditiva" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Análise Preditiva Geral do Negócio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                Obtenha uma análise completa do seu negócio com insights de IA sobre tendências,
                previsões de faturamento, estratégias de crescimento e muito mais.
              </p>
              
              <Button 
                onClick={analisarPreditiva} 
                disabled={loading}
                data-testid="btn-analisar-preditiva"
                className="w-full"
                style={{backgroundColor: '#E76F51'}}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={16} />
                    Analisando todo o negócio...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2" size={16} />
                    Gerar Análise Completa
                  </>
                )}
              </Button>

              {analisePredicaoData && (
                <div className="mt-6 space-y-4" data-testid="preditiva-result">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-gray-600 text-sm">Total de Clientes</p>
                      <p className="font-bold text-3xl" style={{color: '#267698'}}>
                        {analisePredicaoData.metricas_gerais.total_clientes}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <p className="text-gray-600 text-sm">Total de Produtos</p>
                      <p className="font-bold text-3xl" style={{color: '#2C9AA1'}}>
                        {analisePredicaoData.metricas_gerais.total_produtos}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-gray-600 text-sm">Total de Vendas</p>
                      <p className="font-bold text-3xl" style={{color: '#F26C4F'}}>
                        {analisePredicaoData.metricas_gerais.total_vendas}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-yellow-50 rounded-lg">
                      <p className="text-gray-600 text-sm">Faturamento Total</p>
                      <p className="font-bold text-2xl">
                        R$ {analisePredicaoData.metricas_gerais.faturamento_total.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-lg">
                      <p className="text-gray-600 text-sm">Ticket Médio</p>
                      <p className="font-bold text-2xl">
                        R$ {analisePredicaoData.metricas_gerais.ticket_medio.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {analisePredicaoData.top_produtos.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Produtos Mais Vendidos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {analisePredicaoData.top_produtos.map((produto, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="font-bold text-lg" style={{color: '#267698'}}>
                                {idx + 1}.
                              </span>
                              <span>{produto}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <EmilyIcon size={20} />
                        Análise Preditiva Completa (GPT-4)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="prose max-w-none">
                        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                          {analisePredicaoData.analise_preditiva_ia}
                        </pre>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default IAInsights;