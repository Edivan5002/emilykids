import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, AlertCircle, TrendingDown, TrendingUp, Edit, Shield, Search, Filter, Eye, FileText, Calendar, User, Clipboard, CheckCircle, XCircle, Play, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [subcategorias, setSubcategorias] = useState([]);
  const [isAjusteOpen, setIsAjusteOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAutorizacao, setShowAutorizacao] = useState(false);
  const [ajusteData, setAjusteData] = useState(null);
  const [detalhesMovimentacao, setDetalhesMovimentacao] = useState(null);
  const [isDetalhesOpen, setIsDetalhesOpen] = useState(false);
  
  // Inventário
  const [inventarios, setInventarios] = useState([]);
  const [inventarioAtivo, setInventarioAtivo] = useState(null);
  const [contagemDialog, setContagemDialog] = useState({ open: false, item: null, quantidade: 0, observacao: '' });
  const [cancelarDialog, setCancelarDialog] = useState({ open: false, motivo: '' });
  const [detalhesInventarioDialog, setDetalhesInventarioDialog] = useState({ open: false, inventario: null });

  // Filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    marca: 'todas',
    categoria: 'todas',
    subcategoria: 'todas',
    status: 'todos' // todos, alerta_minimo, alerta_maximo
  });

  const [formAjuste, setFormAjuste] = useState({
    produto_id: '',
    quantidade: 0,
    tipo: 'entrada',
    motivo: ''
  });

  // Estados de paginação para todas as áreas
  const ITENS_POR_PAGINA = 20;
  const [paginaVisaoGeral, setPaginaVisaoGeral] = useState(1);
  const [paginaInventarioHistorico, setPaginaInventarioHistorico] = useState(1);
  const [paginaMovimentacoes, setPaginaMovimentacoes] = useState(1);
  const [paginaAlertasAbaixo, setPaginaAlertasAbaixo] = useState(1);
  const [paginaAlertasAcima, setPaginaAlertasAcima] = useState(1);
  const [paginaUltimosAjustes, setPaginaUltimosAjustes] = useState(1);

  useEffect(() => {
    fetchData();
    fetchInventarios();
  }, []);

  const fetchData = async () => {
    try {
      // Sempre carregar produtos
      const prodRes = await axios.get(`${API}/produtos`);
      setProdutos(prodRes.data);
      
      // Tentar carregar movimentações
      try {
        const movRes = await axios.get(`${API}/estoque/movimentacoes`);
        setMovimentacoes(movRes.data);
      } catch (err) {
        console.log('Sem permissão para movimentações');
        setMovimentacoes([]);
      }
      
      // Tentar carregar alertas
      try {
        const alertRes = await axios.get(`${API}/estoque/alertas`);
        setAlertas(alertRes.data);
      } catch (err) {
        console.log('Sem permissão para alertas');
        setAlertas({});
      }
      
      // Tentar carregar marcas
      try {
        const marcasRes = await axios.get(`${API}/marcas`);
        setMarcas(marcasRes.data);
      } catch (err) {
        console.log('Sem permissão para marcas');
        setMarcas([]);
      }
      
      // Tentar carregar categorias
      try {
        const catRes = await axios.get(`${API}/categorias?limit=0`);
        const categoriasData = catRes.data?.data || catRes.data || [];
        setCategorias(categoriasData);
      } catch (err) {
        console.log('Sem permissão para categorias');
        setCategorias([]);
      }
      
      // Tentar carregar subcategorias
      try {
        const subcatRes = await axios.get(`${API}/subcategorias?limit=0`);
        const subcategoriasData = subcatRes.data?.data || subcatRes.data || [];
        setSubcategorias(subcategoriasData);
      } catch (err) {
        console.log('Sem permissão para subcategorias');
        setSubcategorias([]);
      }
    } catch (error) {
      toast.error('Erro ao carregar estoque');
    }
  };

  const fetchInventarios = async () => {
    try {
      const response = await axios.get(`${API}/estoque/inventario?limit=0`);
      setInventarios(response.data);
      
      // Verificar se há inventário em andamento
      const inventarioAberto = response.data.find(inv => inv.status === 'em_andamento');
      if (inventarioAberto) {
        setInventarioAtivo(inventarioAberto);
      } else {
        setInventarioAtivo(null);
      }
    } catch (error) {
      console.error('Erro ao buscar inventários:', error);
    }
  };

  const iniciarNovoInventario = async () => {
    try {
      const response = await axios.post(`${API}/estoque/inventario/iniciar`);
      toast.success(`Inventário ${response.data.numero} iniciado com ${response.data.total_produtos} produtos!`);
      await fetchInventarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao iniciar inventário');
    }
  };

  const registrarContagem = async () => {
    if (!contagemDialog.item || contagemDialog.quantidade < 0) {
      toast.error('Dados inválidos');
      return;
    }

    try {
      await axios.put(
        `${API}/estoque/inventario/${inventarioAtivo.id}/registrar-contagem`,
        null,
        {
          params: {
            produto_id: contagemDialog.item.produto_id,
            quantidade_contada: contagemDialog.quantidade,
            observacao: contagemDialog.observacao || undefined
          }
        }
      );
      toast.success('Contagem registrada!');
      setContagemDialog({ open: false, item: null, quantidade: 0, observacao: '' });
      await fetchInventarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao registrar contagem');
    }
  };

  const finalizarInventario = async () => {
    if (!inventarioAtivo) return;

    const confirmar = window.confirm(
      `Finalizar inventário ${inventarioAtivo.numero}?\n\n` +
      `Total de produtos: ${inventarioAtivo.total_produtos}\n` +
      `Produtos contados: ${inventarioAtivo.total_contados}\n` +
      `Divergências: ${inventarioAtivo.total_divergencias}\n\n` +
      `Os ajustes serão aplicados automaticamente no estoque.`
    );

    if (!confirmar) return;

    try {
      const response = await axios.post(
        `${API}/estoque/inventario/${inventarioAtivo.id}/finalizar`,
        null,
        { params: { aplicar_ajustes: true } }
      );
      
      toast.success(
        `Inventário finalizado! ${response.data.total_divergencias} divergências e ` +
        `${response.data.ajustes_aplicados?.length || 0} ajustes aplicados.`
      );
      
      await fetchInventarios();
      await fetchData(); // Recarregar para ver os estoques atualizados
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao finalizar inventário');
    }
  };

  const cancelarInventarioConfirm = async () => {
    if (!cancelarDialog.motivo.trim()) {
      toast.error('O motivo do cancelamento é obrigatório');
      return;
    }

    try {
      await axios.delete(
        `${API}/estoque/inventario/${inventarioAtivo.id}/cancelar`,
        { params: { motivo: cancelarDialog.motivo.trim() } }
      );
      
      toast.success('Inventário cancelado com sucesso');
      setCancelarDialog({ open: false, motivo: '' });
      await fetchInventarios();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar inventário');
    }
  };

  const handleVerDetalhesInventario = async (inventario) => {
    try {
      // Buscar detalhes completos do inventário
      const response = await axios.get(`${API}/estoque/inventario/${inventario.id}`);
      setDetalhesInventarioDialog({ open: true, inventario: response.data });
    } catch (error) {
      toast.error('Erro ao buscar detalhes do inventário');
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
      console.log('DEBUG: Enviando ajuste com dados:', formAjuste);
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

  const handleVerDetalhes = (movimentacao) => {
    console.log('DEBUG: Abrindo detalhes da movimentação:', movimentacao);
    console.log('DEBUG: Motivo:', movimentacao.motivo);
    console.log('DEBUG: Tipo de referência:', movimentacao.referencia_tipo);
    setDetalhesMovimentacao(movimentacao);
    setIsDetalhesOpen(true);
  };

  const handleCloseDetalhes = () => {
    setIsDetalhesOpen(false);
    setDetalhesMovimentacao(null);
  };

  const getUsuarioNome = (movimentacao) => {
    // O nome do usuário agora vem diretamente do backend
    return movimentacao.user_nome || 'Sistema';
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
    if (filtros.marca && filtros.marca !== 'todas' && p.marca_id !== filtros.marca) {
      return false;
    }

    // Categoria
    if (filtros.categoria && filtros.categoria !== 'todas' && p.categoria_id !== filtros.categoria) {
      return false;
    }
    
    // Subcategoria
    if (filtros.subcategoria && filtros.subcategoria !== 'todas' && p.subcategoria_id !== filtros.subcategoria) {
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

  const getSubcategoriaNome = (subcategoriaId) => {
    const subcat = subcategorias.find(s => s.id === subcategoriaId);
    return subcat?.nome || '-';
  };

  const getProdutoDescricaoCompleta = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) return 'Produto não encontrado';
    
    const marcaNome = getMarcaNome(produto.marca_id);
    const categoriaNome = getCategoriaNome(produto.categoria_id);
    const subcategoriaNome = getSubcategoriaNome(produto.subcategoria_id);
    
    return `${marcaNome} | ${categoriaNome} | ${subcategoriaNome} | ${produto.nome}`;
  };

  // Helper para obter marca_id de um item de inventário
  const getItemMarcaId = (item) => {
    return item.marca_id || item.produto_marca_id || produtos.find(p => p.id === item.produto_id)?.marca_id;
  };

  // Helper para obter categoria_id de um item de inventário
  const getItemCategoriaId = (item) => {
    return item.categoria_id || item.produto_categoria_id || produtos.find(p => p.id === item.produto_id)?.categoria_id;
  };

  // Helper para obter subcategoria_id de um item de inventário
  const getItemSubcategoriaId = (item) => {
    return item.subcategoria_id || item.produto_subcategoria_id || produtos.find(p => p.id === item.produto_id)?.subcategoria_id;
  };

  const getTipoIcon = (tipo) => {
    return tipo === 'entrada' ? 
      <TrendingUp className="text-green-600" size={16} /> : 
      <TrendingDown className="text-red-600" size={16} />;
  };

  const getTipoColor = (tipo) => {
    return tipo === 'entrada' ? 'text-green-600' : 'text-red-600';
  };

  // === LÓGICA DE PAGINAÇÃO PARA TODAS AS ÁREAS ===
  
  // 1. Visão Geral (produtosFiltrados)
  const totalPaginasVisaoGeral = Math.ceil(produtosFiltrados.length / ITENS_POR_PAGINA);
  const indiceInicialVisaoGeral = (paginaVisaoGeral - 1) * ITENS_POR_PAGINA;
  const indiceFinalVisaoGeral = indiceInicialVisaoGeral + ITENS_POR_PAGINA;
  const produtosPaginados = produtosFiltrados.slice(indiceInicialVisaoGeral, indiceFinalVisaoGeral);
  
  // 2. Inventário - Histórico
  const totalPaginasInventario = Math.ceil(inventarios.length / ITENS_POR_PAGINA);
  const indiceInicialInventario = (paginaInventarioHistorico - 1) * ITENS_POR_PAGINA;
  const indiceFinalInventario = indiceInicialInventario + ITENS_POR_PAGINA;
  const inventariosPaginados = inventarios.slice(indiceInicialInventario, indiceFinalInventario);
  
  // 3. Movimentações
  const totalPaginasMovimentacoes = Math.ceil(movimentacoes.length / ITENS_POR_PAGINA);
  const indiceInicialMovimentacoes = (paginaMovimentacoes - 1) * ITENS_POR_PAGINA;
  const indiceFinalMovimentacoes = indiceInicialMovimentacoes + ITENS_POR_PAGINA;
  const movimentacoesPaginadas = movimentacoes.slice(indiceInicialMovimentacoes, indiceFinalMovimentacoes);
  
  // 4. Alertas - Estoque Abaixo
  const alertasAbaixo = alertas?.alertas_minimo || [];
  const totalPaginasAlertasAbaixo = Math.ceil(alertasAbaixo.length / ITENS_POR_PAGINA);
  const indiceInicialAlertasAbaixo = (paginaAlertasAbaixo - 1) * ITENS_POR_PAGINA;
  const indiceFinalAlertasAbaixo = indiceInicialAlertasAbaixo + ITENS_POR_PAGINA;
  const alertasAbaixoPaginados = alertasAbaixo.slice(indiceInicialAlertasAbaixo, indiceFinalAlertasAbaixo);
  
  // 5. Alertas - Estoque Acima
  const alertasAcima = alertas?.alertas_maximo || [];
  const totalPaginasAlertasAcima = Math.ceil(alertasAcima.length / ITENS_POR_PAGINA);
  const indiceInicialAlertasAcima = (paginaAlertasAcima - 1) * ITENS_POR_PAGINA;
  const indiceFinalAlertasAcima = indiceInicialAlertasAcima + ITENS_POR_PAGINA;
  const alertasAcimaPaginados = alertasAcima.slice(indiceInicialAlertasAcima, indiceFinalAlertasAcima);
  
  // 6. Últimos Ajustes
  const ultimosAjustes = movimentacoes.filter(m => m.tipo === 'ajuste_manual');
  const totalPaginasAjustes = Math.ceil(ultimosAjustes.length / ITENS_POR_PAGINA);
  const indiceInicialAjustes = (paginaUltimosAjustes - 1) * ITENS_POR_PAGINA;
  const indiceFinalAjustes = indiceInicialAjustes + ITENS_POR_PAGINA;
  const ajustesPaginados = ultimosAjustes.slice(indiceInicialAjustes, indiceFinalAjustes);

  return (
    <div className="page-container" data-testid="estoque-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Controle de Estoque</h1>
        <p className="text-gray-600">Gestão completa de estoque e movimentações</p>
      </div>

      <Tabs defaultValue="visao-geral" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="visao-geral">
            <Package className="mr-2" size={16} />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="inventario">
            <Clipboard className="mr-2" size={16} />
            Inventário
            {inventarioAtivo && (
              <span className="ml-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">
                Em andamento
              </span>
            )}
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
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                  <Label>Subcategoria</Label>
                  <Select value={filtros.subcategoria} onValueChange={(value) => setFiltros({...filtros, subcategoria: value === 'todas' ? '' : value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {subcategorias.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
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
              <div className="table-responsive">
                <table className="w-full min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3 text-sm font-semibold hidden md:table-cell">SKU</th>
                      <th className="text-left p-3 text-sm font-semibold">Produto</th>
                      <th className="text-left p-3 text-sm font-semibold hidden lg:table-cell">Marca</th>
                      <th className="text-left p-3 text-sm font-semibold hidden lg:table-cell">Categoria</th>
                      <th className="text-left p-3 text-sm font-semibold hidden xl:table-cell">Subcategoria</th>
                      <th className="text-center p-3 text-sm font-semibold">Estoque Atual</th>
                      <th className="text-center p-3 text-sm font-semibold hidden sm:table-cell">Mínimo</th>
                      <th className="text-center p-3 text-sm font-semibold hidden sm:table-cell">Máximo</th>
                      <th className="text-left p-3 text-sm font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {produtosFiltrados.map(produto => {
                      const status = getEstoqueStatus(produto);
                      return (
                        <tr key={produto.id} className="border-b hover:bg-gray-50">
                          <td className="p-3 text-sm font-mono hidden md:table-cell">{produto.sku}</td>
                          <td className="p-3 text-sm font-medium">{produto.nome}</td>
                          <td className="p-3 text-sm text-gray-600 hidden lg:table-cell">{getMarcaNome(produto.marca_id)}</td>
                          <td className="p-3 text-sm text-gray-600 hidden lg:table-cell">{getCategoriaNome(produto.categoria_id)}</td>
                          <td className="p-3 text-sm text-gray-600 hidden xl:table-cell">{getSubcategoriaNome(produto.subcategoria_id)}</td>
                          <td className="p-3 text-sm text-center">
                            <span className={`font-bold ${status.color}`}>{produto.estoque_atual}</span>
                          </td>
                          <td className="p-3 text-sm text-center text-gray-600 hidden sm:table-cell">{produto.estoque_minimo}</td>
                          <td className="p-3 text-sm text-center text-gray-600 hidden sm:table-cell">{produto.estoque_maximo}</td>
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

        {/* TAB: INVENTÁRIO PERIÓDICO */}
        <TabsContent value="inventario">
          <div className="space-y-4">
            {/* Status do Inventário Ativo */}
            {inventarioAtivo ? (
              <Card className="border-green-500 border-2">
                <CardHeader className="bg-green-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-green-800">Inventário em Andamento</CardTitle>
                      <p className="text-sm text-green-600 mt-1">
                        {inventarioAtivo.numero} - Iniciado em {new Date(inventarioAtivo.data_inicio).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        className="border-red-500 text-red-600 hover:bg-red-50"
                        onClick={() => setCancelarDialog({ open: true, motivo: '' })}
                      >
                        <XCircle className="mr-2" size={16} />
                        Cancelar Inventário
                      </Button>
                      <Button variant="default" onClick={finalizarInventario}>
                        <CheckCircle className="mr-2" size={16} />
                        Finalizar Inventário
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <p className="text-2xl font-bold text-blue-600">{inventarioAtivo.total_produtos}</p>
                      <p className="text-sm text-gray-600">Total de Produtos</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <p className="text-2xl font-bold text-green-600">{inventarioAtivo.total_contados}</p>
                      <p className="text-sm text-gray-600">Contados</p>
                    </div>
                    <div className="text-center p-3 bg-yellow-50 rounded">
                      <p className="text-2xl font-bold text-yellow-600">
                        {inventarioAtivo.total_produtos - inventarioAtivo.total_contados}
                      </p>
                      <p className="text-sm text-gray-600">Pendentes</p>
                    </div>
                    <div className="text-center p-3 bg-red-50 rounded">
                      <p className="text-2xl font-bold text-red-600">{inventarioAtivo.total_divergencias}</p>
                      <p className="text-sm text-gray-600">Divergências</p>
                    </div>
                  </div>

                  {/* Lista de Produtos para Contagem */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full min-w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-3 hidden md:table-cell">SKU</th>
                          <th className="text-left p-3">Produto</th>
                          <th className="text-left p-3 hidden lg:table-cell">Marca</th>
                          <th className="text-left p-3 hidden lg:table-cell">Categoria</th>
                          <th className="text-left p-3 hidden xl:table-cell">Subcategoria</th>
                          <th className="text-center p-3 hidden sm:table-cell">Estoque Sistema</th>
                          <th className="text-center p-3">Contado</th>
                          <th className="text-center p-3 hidden sm:table-cell">Diferença</th>
                          <th className="text-center p-3 hidden lg:table-cell">Status</th>
                          <th className="text-center p-3">Ação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventarioAtivo.itens.map((item, idx) => (
                          <tr key={idx} className={item.estoque_contado !== null ? 'bg-green-50' : ''}>
                            <td className="p-3 font-mono text-sm hidden md:table-cell">{item.produto_sku}</td>
                            <td className="p-3">{item.produto_nome}</td>
                            <td className="p-3 text-sm text-gray-600 hidden lg:table-cell">{getMarcaNome(getItemMarcaId(item))}</td>
                            <td className="p-3 text-sm text-gray-600 hidden lg:table-cell">{getCategoriaNome(getItemCategoriaId(item))}</td>
                            <td className="p-3 text-sm text-gray-600 hidden xl:table-cell">{getSubcategoriaNome(getItemSubcategoriaId(item))}</td>
                            <td className="p-3 text-center font-semibold hidden sm:table-cell">{item.estoque_sistema}</td>
                            <td className="p-3 text-center">
                              {item.estoque_contado !== null ? (
                                <span className="font-semibold text-green-600">{item.estoque_contado}</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center hidden sm:table-cell">
                              {item.diferenca !== null && item.diferenca !== 0 ? (
                                <span className={`font-semibold ${item.diferenca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {item.diferenca > 0 ? '+' : ''}{item.diferenca}
                                </span>
                              ) : item.diferenca === 0 ? (
                                <span className="text-green-600">✓</span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center hidden lg:table-cell">
                              {item.estoque_contado !== null ? (
                                <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Contado</span>
                              ) : (
                                <span className="text-xs bg-yellow-500 text-white px-2 py-1 rounded">Pendente</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <Button
                                size="sm"
                                variant={item.estoque_contado !== null ? 'outline' : 'default'}
                                onClick={() => setContagemDialog({
                                  open: true,
                                  item: item,
                                  quantidade: item.estoque_contado || item.estoque_sistema,
                                  observacao: item.observacao || ''
                                })}
                              >
                                {item.estoque_contado !== null ? 'Recontar' : 'Contar'}
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Inventário Periódico</CardTitle>
                    <Button onClick={iniciarNovoInventario}>
                      <Play className="mr-2" size={16} />
                      Iniciar Novo Inventário
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-gray-500">
                    <Clipboard size={64} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium">Nenhum inventário em andamento</p>
                    <p className="text-sm">Clique em "Iniciar Novo Inventário" para começar</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Histórico de Inventários */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Inventários</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {inventarios.filter(inv => inv.status !== 'em_andamento').length > 0 ? (
                    inventarios.filter(inv => inv.status !== 'em_andamento').map(inv => (
                      <div key={inv.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="font-semibold">{inv.numero}</span>
                              <span className={`text-xs px-2 py-1 rounded ${
                                inv.status === 'concluido' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {inv.status === 'concluido' ? 'Concluído' : 'Cancelado'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {new Date(inv.data_inicio).toLocaleDateString('pt-BR')} - 
                              {inv.data_conclusao && ` ${new Date(inv.data_conclusao).toLocaleDateString('pt-BR')}`}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              {inv.total_produtos} produtos • {inv.total_divergencias} divergências
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-500">Responsável:</p>
                            <p className="text-sm font-medium">{inv.responsavel_nome}</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleVerDetalhesInventario(inv)}
                          >
                            <Eye size={16} className="mr-2" />
                            Ver Detalhes
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">Nenhum inventário concluído</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
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
                        <div className="flex items-center gap-3 flex-1">
                          {getTipoIcon(mov.tipo)}
                          <div className="flex-1">
                            <p className="font-medium">{produto ? getProdutoDescricaoCompleta(produto.id) : 'Produto não encontrado'}</p>
                            <p className="text-sm text-gray-600">
                              {mov.referencia_tipo === 'nota_fiscal' && 'Entrada por Nota Fiscal'}
                              {mov.referencia_tipo === 'venda' && 'Saída por Venda'}
                              {mov.referencia_tipo === 'orcamento' && 'Reserva por Orçamento'}
                              {mov.referencia_tipo === 'devolucao' && 'Entrada por Devolução'}
                              {mov.referencia_tipo === 'devolucao_venda' && 'Devolução de Venda'}
                              {mov.referencia_tipo === 'ajuste_manual' && 'Ajuste Manual'}
                              {mov.referencia_tipo === 'cancelamento_nota_fiscal' && 'Cancelamento de Nota Fiscal'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className={`text-lg font-bold ${getTipoColor(mov.tipo)}`}>
                              {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(mov.timestamp).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleVerDetalhes(mov)}
                            title="Ver detalhes"
                          >
                            <Eye size={16} />
                          </Button>
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
                            <p className="font-medium text-gray-900">{getProdutoDescricaoCompleta(p.id)}</p>
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
                            <p className="font-medium text-gray-900">{getProdutoDescricaoCompleta(p.id)}</p>
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
                      <div key={mov.id} className="p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            {getTipoIcon(mov.tipo)}
                            <div className="flex-1">
                              <p className="font-medium">{produto ? getProdutoDescricaoCompleta(produto.id) : 'Produto não encontrado'}</p>
                              <p className="text-sm text-gray-600">Ajuste Manual</p>
                              {mov.motivo && (
                                <p className="text-xs text-gray-500 mt-1 italic">"{mov.motivo.substring(0, 50)}{mov.motivo.length > 50 ? '...' : ''}"</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`text-lg font-bold ${getTipoColor(mov.tipo)}`}>
                                {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(mov.timestamp).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleVerDetalhes(mov)}
                              title="Ver detalhes completos"
                            >
                              <Eye size={16} />
                            </Button>
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
                      {getProdutoDescricaoCompleta(p.id)} (Estoque: {p.estoque_atual})
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

      {/* Modal de Detalhes da Movimentação */}
      <Dialog open={isDetalhesOpen} onOpenChange={setIsDetalhesOpen}>
        <DialogContent className="dialog-responsive-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detalhesMovimentacao?.referencia_tipo === 'ajuste_manual' ? (
                <>
                  <Edit size={24} className="text-blue-600" />
                  <span>Detalhes do Ajuste Manual</span>
                </>
              ) : (
                <>
                  <FileText size={24} />
                  <span>Detalhes da Movimentação</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {detalhesMovimentacao && (
            <div className="space-y-6">
              {/* Badge de Ajuste Manual */}
              {detalhesMovimentacao.referencia_tipo === 'ajuste_manual' && (
                <div className="flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-lg">
                  <Edit size={20} />
                  <span className="font-semibold text-lg">AJUSTE MANUAL DE ESTOQUE</span>
                </div>
              )}

              {/* Informações Principais */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Produto</p>
                  <p className="font-semibold">
                    {detalhesMovimentacao.produto_id ? getProdutoDescricaoCompleta(detalhesMovimentacao.produto_id) : 'Produto não encontrado'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">SKU</p>
                  <p className="font-semibold">
                    {produtos.find(p => p.id === detalhesMovimentacao.produto_id)?.sku || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Tipo de Movimentação</p>
                  <div className="flex items-center gap-2">
                    {getTipoIcon(detalhesMovimentacao.tipo)}
                    <span className={`font-semibold ${getTipoColor(detalhesMovimentacao.tipo)}`}>
                      {detalhesMovimentacao.tipo === 'entrada' ? 'ENTRADA' : 'SAÍDA'}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Quantidade</p>
                  <p className={`text-2xl font-bold ${getTipoColor(detalhesMovimentacao.tipo)}`}>
                    {detalhesMovimentacao.tipo === 'entrada' ? '+' : '-'}{detalhesMovimentacao.quantidade}
                  </p>
                </div>
              </div>

              {/* Informações de Referência */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Origem da Movimentação</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Tipo de Referência</p>
                    <p className="font-medium">
                      {detalhesMovimentacao.referencia_tipo === 'nota_fiscal' && '📄 Nota Fiscal'}
                      {detalhesMovimentacao.referencia_tipo === 'venda' && '💰 Venda'}
                      {detalhesMovimentacao.referencia_tipo === 'orcamento' && '📋 Orçamento'}
                      {detalhesMovimentacao.referencia_tipo === 'devolucao' && '↩️ Devolução'}
                      {detalhesMovimentacao.referencia_tipo === 'devolucao_venda' && '↩️ Devolução de Venda'}
                      {detalhesMovimentacao.referencia_tipo === 'ajuste_manual' && '⚙️ Ajuste Manual'}
                      {detalhesMovimentacao.referencia_tipo === 'cancelamento_nota_fiscal' && '❌ Cancelamento de NF'}
                    </p>
                  </div>
                  {detalhesMovimentacao.referencia_id && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">ID de Referência</p>
                      <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {detalhesMovimentacao.referencia_id.substring(0, 8)}...
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Informações de Ajuste Manual */}
              {detalhesMovimentacao.referencia_tipo === 'ajuste_manual' && (
                <div className="p-5 bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <AlertCircle size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-blue-900 text-lg mb-2">
                        Motivo do Ajuste Manual
                      </h3>
                      {detalhesMovimentacao.motivo ? (
                        <p className="text-blue-900 leading-relaxed bg-white p-3 rounded border border-blue-200">
                          {detalhesMovimentacao.motivo}
                        </p>
                      ) : (
                        <p className="text-blue-700 italic">Nenhum motivo foi registrado para este ajuste.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Informações de Data e Usuário */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg border-b pb-2">Informações Adicionais</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Data e Hora</p>
                      <p className="font-medium">
                        {new Date(detalhesMovimentacao.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-gray-500" />
                    <div>
                      <p className="text-sm text-gray-600">Usuário Responsável</p>
                      <p className="font-medium">{getUsuarioNome(detalhesMovimentacao)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão de Fechar */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={handleCloseDetalhes}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Contagem */}
      <Dialog open={contagemDialog.open} onOpenChange={(open) => !open && setContagemDialog({ open: false, item: null, quantidade: 0, observacao: '' })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Contagem</DialogTitle>
          </DialogHeader>
          {contagemDialog.item && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Produto:</p>
                <p className="font-semibold">{contagemDialog.item.produto_nome}</p>
                <p className="text-sm text-gray-500">SKU: {contagemDialog.item.produto_sku}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-blue-50 rounded">
                  <p className="text-sm text-blue-600">Estoque no Sistema:</p>
                  <p className="text-2xl font-bold text-blue-700">{contagemDialog.item.estoque_sistema}</p>
                </div>
                <div className="p-3 bg-green-50 rounded">
                  <p className="text-sm text-green-600">Quantidade Contada:</p>
                  <Input
                    type="number"
                    min="0"
                    value={contagemDialog.quantidade}
                    onChange={(e) => setContagemDialog({...contagemDialog, quantidade: parseInt(e.target.value) || 0})}
                    className="text-2xl font-bold text-green-700 text-center mt-1"
                  />
                </div>
              </div>

              {contagemDialog.quantidade !== contagemDialog.item.estoque_sistema && (
                <div className={`p-3 rounded ${
                  contagemDialog.quantidade > contagemDialog.item.estoque_sistema 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="text-sm font-semibold">
                    Diferença: {contagemDialog.quantidade > contagemDialog.item.estoque_sistema ? '+' : ''}
                    {contagemDialog.quantidade - contagemDialog.item.estoque_sistema} unidades
                  </p>
                </div>
              )}

              <div>
                <Label>Observação (opcional)</Label>
                <textarea
                  className="w-full p-2 border rounded mt-1"
                  rows="3"
                  placeholder="Adicione uma observação sobre esta contagem..."
                  value={contagemDialog.observacao}
                  onChange={(e) => setContagemDialog({...contagemDialog, observacao: e.target.value})}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setContagemDialog({ open: false, item: null, quantidade: 0, observacao: '' })}
                >
                  Cancelar
                </Button>
                <Button onClick={registrarContagem}>
                  Confirmar Contagem
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Cancelar Inventário */}
      <Dialog open={cancelarDialog.open} onOpenChange={(open) => !open && setCancelarDialog({ open: false, motivo: '' })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancelar Inventário</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">
                ⚠️ <strong>Atenção:</strong> Esta ação é irreversível!
              </p>
              <ul className="mt-2 text-sm text-red-800 list-disc list-inside">
                <li>O inventário será cancelado</li>
                <li>Todas as contagens serão perdidas</li>
                <li>Nenhum ajuste será aplicado ao estoque</li>
                <li>Esta ação não pode ser desfeita</li>
              </ul>
            </div>

            {inventarioAtivo && (
              <div className="p-3 bg-gray-50 rounded">
                <p className="text-sm text-gray-600">Inventário:</p>
                <p className="font-semibold">{inventarioAtivo.numero}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {inventarioAtivo.total_contados} de {inventarioAtivo.total_produtos} produtos contados
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="motivo-cancelamento">Motivo do Cancelamento *</Label>
              <textarea
                id="motivo-cancelamento"
                className="w-full mt-1 p-2 border rounded-md"
                rows="3"
                placeholder="Digite o motivo do cancelamento..."
                value={cancelarDialog.motivo}
                onChange={(e) => setCancelarDialog({ ...cancelarDialog, motivo: e.target.value })}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setCancelarDialog({ open: false, motivo: '' })}
              >
                Voltar
              </Button>
              <Button 
                variant="destructive"
                onClick={cancelarInventarioConfirm}
                disabled={!cancelarDialog.motivo.trim()}
              >
                <XCircle className="mr-2" size={16} />
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Detalhes do Inventário */}
      <Dialog open={detalhesInventarioDialog.open} onOpenChange={(open) => setDetalhesInventarioDialog({ open, inventario: null })}>
        <DialogContent className="dialog-responsive max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clipboard className="text-blue-600" size={24} />
              Detalhes do Inventário
            </DialogTitle>
          </DialogHeader>
          
          {detalhesInventarioDialog.inventario && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Informações Gerais</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Número do Inventário</p>
                      <p className="font-semibold text-lg">{detalhesInventarioDialog.inventario.numero}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                        detalhesInventarioDialog.inventario.status === 'concluido' 
                          ? 'bg-green-100 text-green-700' 
                          : detalhesInventarioDialog.inventario.status === 'cancelado'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {detalhesInventarioDialog.inventario.status === 'concluido' ? 'Concluído' : 
                         detalhesInventarioDialog.inventario.status === 'cancelado' ? 'Cancelado' : 'Em Andamento'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Data de Início</p>
                      <p className="font-medium">
                        {new Date(detalhesInventarioDialog.inventario.data_inicio).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    {detalhesInventarioDialog.inventario.data_conclusao && (
                      <div>
                        <p className="text-sm text-gray-600">Data de Conclusão</p>
                        <p className="font-medium">
                          {new Date(detalhesInventarioDialog.inventario.data_conclusao).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Responsável</p>
                      <p className="font-medium">{detalhesInventarioDialog.inventario.responsavel_nome}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total de Produtos</p>
                      <p className="font-medium">{detalhesInventarioDialog.inventario.total_produtos}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Produtos Contados</p>
                      <p className="font-medium">{detalhesInventarioDialog.inventario.total_contados}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Divergências</p>
                      <p className="font-medium text-orange-600">{detalhesInventarioDialog.inventario.total_divergencias}</p>
                    </div>
                    {detalhesInventarioDialog.inventario.motivo_cancelamento && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Motivo do Cancelamento</p>
                        <p className="font-medium text-red-600">{detalhesInventarioDialog.inventario.motivo_cancelamento}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Itens do Inventário */}
              {detalhesInventarioDialog.inventario.itens && detalhesInventarioDialog.inventario.itens.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Itens do Inventário</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="table-responsive">
                      <table className="w-full min-w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="text-left p-3 text-sm font-semibold">SKU</th>
                            <th className="text-left p-3 text-sm font-semibold">Produto</th>
                            <th className="text-left p-3 text-sm font-semibold hidden lg:table-cell">Marca</th>
                            <th className="text-left p-3 text-sm font-semibold hidden lg:table-cell">Categoria</th>
                            <th className="text-left p-3 text-sm font-semibold hidden xl:table-cell">Subcategoria</th>
                            <th className="text-center p-3 text-sm font-semibold">Estoque Sistema</th>
                            <th className="text-center p-3 text-sm font-semibold">Contado</th>
                            <th className="text-center p-3 text-sm font-semibold">Diferença</th>
                            <th className="text-left p-3 text-sm font-semibold">Observação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {detalhesInventarioDialog.inventario.itens.map((item, idx) => (
                            <tr key={idx} className={`border-b ${
                              item.diferenca !== null && item.diferenca !== 0 
                                ? 'bg-yellow-50' 
                                : item.estoque_contado !== null 
                                ? 'bg-green-50' 
                                : ''
                            }`}>
                              <td className="p-3 text-sm font-mono">{item.produto_sku}</td>
                              <td className="p-3 text-sm">{item.produto_nome}</td>
                              <td className="p-3 text-sm text-gray-600 hidden lg:table-cell">{getMarcaNome(getItemMarcaId(item))}</td>
                              <td className="p-3 text-sm text-gray-600 hidden lg:table-cell">{getCategoriaNome(getItemCategoriaId(item))}</td>
                              <td className="p-3 text-sm text-gray-600 hidden xl:table-cell">{getSubcategoriaNome(getItemSubcategoriaId(item))}</td>
                              <td className="p-3 text-sm text-center font-semibold">{item.estoque_sistema}</td>
                              <td className="p-3 text-sm text-center">
                                {item.estoque_contado !== null ? (
                                  <span className="font-semibold text-green-600">{item.estoque_contado}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-3 text-sm text-center">
                                {item.diferenca !== null && item.diferenca !== 0 ? (
                                  <span className={`font-bold ${item.diferenca > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {item.diferenca > 0 ? '+' : ''}{item.diferenca}
                                  </span>
                                ) : item.diferenca === 0 ? (
                                  <span className="text-green-600">✓</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="p-3 text-sm text-gray-600">{item.observacao || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Estoque;
