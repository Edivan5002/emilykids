import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, AlertCircle, TrendingDown, TrendingUp, Edit, Shield, Search, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import AutorizacaoModal from '../components/AutorizacaoModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Estoque = () => {
  const { user } = useAuth();
  const [produtos, setProdutos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [alertas, setAlertas] = useState(null);
  const [marcas, setMarcas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [isAjusteOpen, setIsAjusteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAutorizacao, setShowAutorizacao] = useState(false);
  const [ajusteData, setAjusteData] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    marca: '',
    categoria: '',
    status: 'todos' // todos, alerta_minimo, alerta_maximo
  });

  const [formAjuste, setFormAjuste] = useState({
    produto_id: '',
    quantidade: 0,
    tipo: 'entrada',
    motivo: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, movRes, alertRes, marcasRes, catRes] = await Promise.all([
        axios.get(`${API}/produtos`),
        axios.get(`${API}/estoque/movimentacoes`),
        axios.get(`${API}/estoque/alertas`),
        axios.get(`${API}/marcas`),
        axios.get(`${API}/categorias`)
      ]);
      setProdutos(prodRes.data);
      setMovimentacoes(movRes.data);
      setAlertas(alertRes.data);
      setMarcas(marcasRes.data);
      setCategorias(catRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const handleAjusteClick = () => {
    if (user?.papel === 'admin' || user?.papel === 'gerente') {
      setIsAjusteOpen(true);
    } else {
      // Vendedor precisa de autorização
      toast.info('Você precisa de autorização de um supervisor ou administrador');
      setShowAutorizacao(true);
    }
  };

  const handleAutorizacaoSucesso = async (autorizador) => {
    toast.success(`Autorização concedida por ${autorizador.nome}!`);
    setShowAutorizacao(false);
    setIsAjusteOpen(true);
  };

  const handleSubmitAjuste = async (e) => {
    e.preventDefault();
    
    if (!formAjuste.produto_id || formAjuste.quantidade <= 0 || !formAjuste.motivo.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/estoque/ajuste-manual`, formAjuste);
      toast.success('Estoque ajustado com sucesso!');
      fetchData();
      handleCloseAjuste();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao ajustar estoque');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseAjuste = () => {
    setIsAjusteOpen(false);
    setFormAjuste({
      produto_id: '',
      quantidade: 0,
      tipo: 'entrada',
      motivo: ''
    });
  };

  const produtosFiltrados = produtos.filter(p => {
    // Busca
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      if (!p.nome.toLowerCase().includes(busca) && 
          !p.sku.toLowerCase().includes(busca)) {
        return false;
      }
    }

    // Marca
    if (filtros.marca && p.marca_id !== filtros.marca) {
      return false;
    }

    // Categoria
    if (filtros.categoria && p.categoria_id !== filtros.categoria) {
      return false;
    }

    // Status de alerta
    if (filtros.status === 'alerta_minimo' && p.estoque_atual > p.estoque_minimo) {
      return false;
    }
    if (filtros.status === 'alerta_maximo' && p.estoque_atual < p.estoque_maximo) {
      return false;
    }

    return true;
  });

  const getEstoqueStatus = (produto) => {
    if (produto.estoque_atual <= produto.estoque_minimo) {
      return { color: 'text-red-600', bg: 'bg-red-50', label: 'Estoque Baixo' };
    }
    if (produto.estoque_atual >= produto.estoque_maximo) {
      return { color: 'text-orange-600', bg: 'bg-orange-50', label: 'Estoque Alto' };
    }
    return { color: 'text-green-600', bg: 'bg-green-50', label: 'Estoque Normal' };
  };

  const getMarcaNome = (marcaId) => {
    const marca = marcas.find(m => m.id === marcaId);
    return marca?.nome || '-';
  };

  const getCategoriaNome = (categoriaId) => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.nome || '-';
  };

  const getTipoIcon = (tipo) => {
    return tipo === 'entrada' ? 
      <TrendingUp className="text-green-600" size={16} /> : 
      <TrendingDown className="text-red-600" size={16} />;
  };

  const getTipoColor = (tipo) => {
    return tipo === 'entrada' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="page-container" data-testid="estoque-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Controle de Estoque</h1>
        <p className="text-gray-600">Gestão completa de estoque e movimentações</p>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="visao-geral">
            <Package className="mr-2" size={16} />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="movimentacoes">
            <TrendingUp className="mr-2" size={16} />
            Movimentações
          </TabsTrigger>
          <TabsTrigger value="alertas">
            <AlertCircle className="mr-2" size={16} />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="ajuste">
            <Edit className="mr-2" size={16} />
            Ajuste Manual
          </TabsTrigger>
        </TabsList>

        {/* TAB: VISÃO GERAL */}
        <TabsContent value="visao-geral">
          <Card>
            <CardHeader>
              <CardTitle>Produtos em Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filtros */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label>Buscar Produto</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                    <Input
                      placeholder="Nome ou SKU"
                      className="pl-10"
                      value={filtros.busca}
                      onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Marca</Label>
                  <Select value={filtros.marca} onValueChange={(value) => setFiltros({...filtros, marca: value === 'todas' ? '' : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {marcas.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={filtros.categoria} onValueChange={(value) => setFiltros({...filtros, categoria: value === 'todas' ? '' : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {categorias.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={filtros.status} onValueChange={(value) => setFiltros({...filtros, status: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="alerta_minimo">Alerta Mínimo</SelectItem>
                      <SelectItem value="alerta_maximo">Alerta Máximo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabela de Produtos */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold">SKU</th>
                      <th className="text-left p-3 text-sm font-semibold">Produto</th>
                      <th className="text-left p-3 text-sm font-semibold">Marca</th>
                      <th className="text-left p-3 text-sm font-semibold">Categoria</th>
                      <th className="text-center p-3 text-sm font-semibold">Estoque Atual</th>
                      <th className="text-center p-3 text-sm font-semibold">Mínimo</th>
                      <th className="text-center p-3 text-sm font-semibold">Máximo</th>
                      <th className="text-left p-3 text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map(produto => {
                      const status = getEstoqueStatus(produto);
                      return (
                        <tr key={produto.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm font-mono">{produto.sku}</td>
                          <td className="p-3 text-sm font-medium">{produto.nome}</td>
                          <td className="p-3 text-sm text-gray-600">{getMarcaNome(produto.marca_id)}</td>
                          <td className="p-3 text-sm text-gray-600">{getCategoriaNome(produto.categoria_id)}</td>
                          <td className="p-3 text-sm text-center">
                            <span className={`font-bold ${status.color}`}>{produto.estoque_atual}</span>
                          </td>
                          <td className="p-3 text-sm text-center text-gray-600">{produto.estoque_minimo}</td>
                          <td className="p-3 text-sm text-center text-gray-600">{produto.estoque_maximo}</td>
                          <td className="p-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {produtosFiltrados.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhum produto encontrado com os filtros selecionados
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: MOVIMENTAÇÕES */}
        <TabsContent value="movimentacoes">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Movimentações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {movimentacoes.map(mov => {
                  const produto = produtos.find(p => p.id === mov.produto_id);
                  return (
                    <div key={mov.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTipoIcon(mov.tipo)}
                          <div>
                            <p className="font-medium">{produto?.nome || 'Produto'}</p>
                            <p className="text-sm text-gray-600">
                              {mov.referencia_tipo === 'nota_fiscal' && 'Entrada por Nota Fiscal'}
                              {mov.referencia_tipo === 'venda' && 'Saída por Venda'}
                              {mov.referencia_tipo === 'orcamento' && 'Reserva por Orçamento'}
                              {mov.referencia_tipo === 'devolucao' && 'Entrada por Devolução'}
                              {mov.referencia_tipo === 'devolucao_venda' && 'Devolução de Venda'}
                              {mov.referencia_tipo === 'ajuste_manual' && 'Ajuste Manual'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-lg font-bold ${getTipoColor(mov.tipo)}`}>
                            {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(mov.timestamp).toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {movimentacoes.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma movimentação registrada
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: ALERTAS */}
        <TabsContent value="alertas">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Alertas de Estoque Mínimo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <AlertCircle size={20} />
                  Estoque Abaixo do Mínimo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertas && alertas.alertas_minimo.length > 0 ? (
                  <div className="space-y-2">
                    {alertas.alertas_minimo.map(p => (
                      <div key={p.id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">{p.nome}</p>
                            <p className="text-sm text-gray-600">SKU: {p.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">{p.estoque_atual}</p>
                            <p className="text-xs text-gray-500">Mín: {p.estoque_minimo}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum produto com estoque abaixo do mínimo
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Alertas de Estoque Máximo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <TrendingUp size={20} />
                  Estoque Acima do Máximo
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertas && alertas.alertas_maximo.length > 0 ? (
                  <div className="space-y-2">
                    {alertas.alertas_maximo.map(p => (
                      <div key={p.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium text-gray-900">{p.nome}</p>
                            <p className="text-sm text-gray-600">SKU: {p.sku}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-orange-600">{p.estoque_atual}</p>
                            <p className="text-xs text-gray-500">Máx: {p.estoque_maximo}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum produto com estoque acima do máximo
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Estatísticas */}
          {alertas && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Estatísticas de Alertas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">Total de Produtos</p>
                    <p className="text-2xl font-bold text-gray-900">{produtos.length}</p>
                  </div>
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Estoque Baixo</p>
                    <p className="text-2xl font-bold text-red-600">{alertas.alertas_minimo.length}</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <p className="text-sm text-gray-600">Estoque Alto</p>
                    <p className="text-2xl font-bold text-orange-600">{alertas.alertas_maximo.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB: AJUSTE MANUAL */}
        <TabsContent value="ajuste">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit size={20} />
                Ajuste Manual de Estoque
                {user?.papel === 'vendedor' && (
                  <Shield size={16} style={{color: '#E76F51'}} />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>Importante:</strong> O ajuste manual de estoque deve ser usado apenas para correções de inventário.
                  {user?.papel === 'vendedor' && (
                    <span> Como vendedor, você precisará de autorização de um supervisor ou administrador.</span>
                  )}
                </p>
              </div>

              <Button onClick={handleAjusteClick} className="mb-6">
                <Edit className="mr-2" size={16} />
                Realizar Ajuste de Estoque
                {user?.papel === 'vendedor' && <Shield className="ml-2" size={14} />}
              </Button>

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Últimos Ajustes Manuais</h3>
                {movimentacoes
                  .filter(m => m.referencia_tipo === 'ajuste_manual')
                  .slice(0, 10)
                  .map(mov => {
                    const produto = produtos.find(p => p.id === mov.produto_id);
                    return (
                      <div key={mov.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {getTipoIcon(mov.tipo)}
                            <div>
                              <p className="font-medium">{produto?.nome || 'Produto'}</p>
                              <p className="text-sm text-gray-600">Ajuste Manual</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${getTipoColor(mov.tipo)}`}>
                              {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(mov.timestamp).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                {movimentacoes.filter(m => m.referencia_tipo === 'ajuste_manual').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum ajuste manual registrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Ajuste */}
      <Dialog open={isAjusteOpen} onOpenChange={setIsAjusteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajuste Manual de Estoque</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAjuste} className="space-y-4">
            <div>
              <Label>Produto *</Label>
              <Select 
                value={formAjuste.produto_id} 
                onValueChange={(value) => setFormAjuste({...formAjuste, produto_id: value})}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o produto" />
                </SelectTrigger>
                <SelectContent>
                  {produtos.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} (Estoque: {p.estoque_atual})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Ajuste *</Label>
              <Select 
                value={formAjuste.tipo} 
                onValueChange={(value) => setFormAjuste({...formAjuste, tipo: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (Adicionar ao estoque)</SelectItem>
                  <SelectItem value="saida">Saída (Remover do estoque)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                value={formAjuste.quantidade}
                onChange={(e) => setFormAjuste({...formAjuste, quantidade: parseInt(e.target.value) || 0})}
                required
              />
            </div>

            <div>
              <Label>Motivo do Ajuste *</Label>
              <textarea
                className="w-full border rounded-md p-2 text-sm"
                rows="3"
                placeholder="Descreva o motivo do ajuste (ex: contagem de inventário, produto danificado, etc.)"
                value={formAjuste.motivo}
                onChange={(e) => setFormAjuste({...formAjuste, motivo: e.target.value})}
                required
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleCloseAjuste}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Ajustando...' : 'Confirmar Ajuste'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Autorização */}
      <AutorizacaoModal
        isOpen={showAutorizacao}
        onClose={() => setShowAutorizacao(false)}
        onAutorizado={handleAutorizacaoSucesso}
        acao="realizar ajuste manual de estoque"
      />
    </div>
  );
};

export default Estoque;
