import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Power, Search, X, TrendingUp, Package, DollarSign, AlertTriangle, History } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Produtos = () => {
  const [produtos, setProdutos] = useState([]);
  const [produtosFiltrados, setProdutosFiltrados] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('basico');
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nome: '' });
  const [toggleDialog, setToggleDialog] = useState({ open: false, id: null, nome: '', ativo: false });
  const [historicoDialog, setHistoricoDialog] = useState({ open: false, produto_id: null, historico: [] });
  const [loading, setLoading] = useState(false);
  const [relatorios, setRelatorios] = useState(null);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    termo: '',
    marca_id: 'todas',
    categoria_id: 'todas',
    subcategoria_id: 'todas',
    ativo: 'todos',
    com_estoque: '',
    estoque_baixo: false,
    em_destaque: false
  });

  const [formData, setFormData] = useState({
    sku: '',
    nome: '',
    marca_id: '',
    categoria_id: '',
    subcategoria_id: '',
    unidade: 'UN',
    preco_custo: 0,
    preco_venda: 0,
    margem_lucro: 0,
    preco_promocional: '',
    data_inicio_promo: '',
    data_fim_promo: '',
    estoque_minimo: 0,
    estoque_maximo: 0,
    codigo_barras: '',
    peso: '',
    altura: '',
    largura: '',
    profundidade: '',
    fornecedor_preferencial_id: '',
    comissao_vendedor: '',
    tags: [],
    em_destaque: false,
    tem_variacoes: false,
    variacoes: [],
    eh_kit: false,
    componentes_kit: [],
    fotos: [],
    descricao: '',
    ativo: true
  });

  const [novaVariacao, setNovaVariacao] = useState({ tamanho: '', cor: '', sku_variante: '', estoque_atual: 0, preco_adicional: 0 });
  const [novoComponente, setNovoComponente] = useState({ produto_id: '', quantidade: 1 });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchData();
    fetchRelatorios();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, produtos]);

  const fetchData = async () => {
    try {
      const [prodRes, marcaRes, catRes, subRes, fornRes] = await Promise.all([
        axios.get(`${API}/produtos?incluir_inativos=true`),
        axios.get(`${API}/marcas`),
        axios.get(`${API}/categorias`),
        axios.get(`${API}/subcategorias`),
        axios.get(`${API}/fornecedores?incluir_inativos=true`)
      ]);
      setProdutos(prodRes.data);
      setProdutosFiltrados(prodRes.data);
      setMarcas(marcaRes.data.filter(m => m.ativo));
      setCategorias(catRes.data.filter(c => c.ativo));
      setSubcategorias(subRes.data.filter(s => s.ativo));
      setFornecedores(fornRes.data.filter(f => f.ativo));
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const fetchRelatorios = async () => {
    try {
      const [maisVendidos, valorEstoque] = await Promise.all([
        axios.get(`${API}/produtos/relatorios/mais-vendidos?limite=5`),
        axios.get(`${API}/produtos/relatorios/valor-estoque`)
      ]);
      setRelatorios({
        maisVendidos: maisVendidos.data,
        valorEstoque: valorEstoque.data
      });
    } catch (error) {
      console.error('Erro ao carregar relatórios');
    }
  };

  const aplicarFiltros = async () => {
    // Se não há filtros aplicados, mostrar todos
    if (filtros.termo === '' && 
        (filtros.marca_id === 'todas' || filtros.marca_id === '') && 
        (filtros.categoria_id === 'todas' || filtros.categoria_id === '') && 
        (filtros.subcategoria_id === 'todas' || filtros.subcategoria_id === '') && 
        (filtros.ativo === 'todos' || filtros.ativo === '') && 
        filtros.com_estoque === '' && 
        !filtros.estoque_baixo && 
        !filtros.em_destaque) {
      setProdutosFiltrados(produtos);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (filtros.termo) params.append('termo', filtros.termo);
      if (filtros.marca_id && filtros.marca_id !== 'todas') params.append('marca_id', filtros.marca_id);
      if (filtros.categoria_id && filtros.categoria_id !== 'todas') params.append('categoria_id', filtros.categoria_id);
      if (filtros.subcategoria_id && filtros.subcategoria_id !== 'todas') params.append('subcategoria_id', filtros.subcategoria_id);
      if (filtros.ativo && filtros.ativo !== 'todos') params.append('ativo', filtros.ativo);
      if (filtros.com_estoque !== '') params.append('com_estoque', filtros.com_estoque);
      if (filtros.estoque_baixo) params.append('estoque_baixo', 'true');
      if (filtros.em_destaque) params.append('em_destaque', 'true');

      const response = await axios.get(`${API}/produtos/busca-avancada?${params.toString()}`);
      setProdutosFiltrados(response.data);
    } catch (error) {
      toast.error('Erro ao aplicar filtros');
    }
  };

  const calcularMargem = (custo, venda) => {
    if (custo > 0) {
      return ((venda - custo) / custo * 100).toFixed(2);
    }
    return 0;
  };

  const handlePrecoCustoChange = (valor) => {
    const novoCusto = parseFloat(valor) || 0;
    setFormData(prev => ({
      ...prev,
      preco_custo: novoCusto,
      margem_lucro: calcularMargem(novoCusto, prev.preco_venda)
    }));
  };

  const handlePrecoVendaChange = (valor) => {
    const novaVenda = parseFloat(valor) || 0;
    setFormData(prev => ({
      ...prev,
      preco_venda: novaVenda,
      margem_lucro: calcularMargem(prev.preco_custo, novaVenda)
    }));
  };

  const handleMargemChange = (valor) => {
    const novaMargem = parseFloat(valor) || 0;
    const novaVenda = formData.preco_custo * (1 + novaMargem / 100);
    setFormData(prev => ({
      ...prev,
      margem_lucro: novaMargem,
      preco_venda: novaVenda.toFixed(2)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dados = { ...formData };
      
      // Sanitizar campos opcionais: converter strings vazias em null
      const camposOpcionais = [
        'marca_id', 'categoria_id', 'subcategoria_id',
        'preco_promocional', 'data_inicio_promo', 'data_fim_promo',
        'codigo_barras', 'peso', 'altura', 'largura', 'profundidade',
        'fornecedor_preferencial_id', 'comissao_vendedor', 'descricao'
      ];
      
      camposOpcionais.forEach(campo => {
        if (dados[campo] === '' || dados[campo] === undefined) {
          dados[campo] = null;
        }
      });
      
      // Arrays vazios devem ser null
      if (dados.tags && dados.tags.length === 0) dados.tags = null;
      if (dados.variacoes && dados.variacoes.length === 0) dados.variacoes = null;
      if (dados.componentes_kit && dados.componentes_kit.length === 0) dados.componentes_kit = null;
      if (dados.fotos && dados.fotos.length === 0) dados.fotos = null;
      
      if (isEditing) {
        await axios.put(`${API}/produtos/${editingId}`, dados);
        toast.success('Produto atualizado com sucesso!');
      } else {
        await axios.post(`${API}/produtos`, dados);
        toast.success('Produto cadastrado com sucesso!');
      }
      fetchData();
      fetchRelatorios();
      handleCloseDialog();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao salvar produto';
      toast.error(errorMsg);
    }
  };

  const handleEdit = (produto) => {
    setIsEditing(true);
    setEditingId(produto.id);
    setFormData({
      sku: produto.sku,
      nome: produto.nome,
      marca_id: produto.marca_id || '',
      categoria_id: produto.categoria_id || '',
      subcategoria_id: produto.subcategoria_id || '',
      unidade: produto.unidade || 'UN',
      preco_custo: produto.preco_custo,
      preco_venda: produto.preco_venda,
      margem_lucro: produto.margem_lucro || 0,
      preco_promocional: produto.preco_promocional || '',
      data_inicio_promo: produto.data_inicio_promo || '',
      data_fim_promo: produto.data_fim_promo || '',
      estoque_minimo: produto.estoque_minimo || 0,
      estoque_maximo: produto.estoque_maximo || 0,
      codigo_barras: produto.codigo_barras || '',
      peso: produto.peso || '',
      altura: produto.altura || '',
      largura: produto.largura || '',
      profundidade: produto.profundidade || '',
      fornecedor_preferencial_id: produto.fornecedor_preferencial_id || '',
      comissao_vendedor: produto.comissao_vendedor || '',
      tags: produto.tags || [],
      em_destaque: produto.em_destaque || false,
      tem_variacoes: produto.tem_variacoes || false,
      variacoes: produto.variacoes || [],
      eh_kit: produto.eh_kit || false,
      componentes_kit: produto.componentes_kit || [],
      fotos: produto.fotos || [],
      descricao: produto.descricao || '',
      ativo: produto.ativo
    });
    setIsOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/produtos/${deleteDialog.id}`);
      toast.success('Produto excluído com sucesso!');
      fetchData();
      fetchRelatorios();
      setDeleteDialog({ open: false, id: null, nome: '' });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao excluir produto';
      toast.error(errorMsg);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await axios.put(`${API}/produtos/${toggleDialog.id}/toggle-status`);
      toast.success(response.data.message);
      fetchData();
      setToggleDialog({ open: false, id: null, nome: '', ativo: false });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao alterar status';
      toast.error(errorMsg);
    }
  };

  const handleVerHistorico = async (produto_id) => {
    try {
      const response = await axios.get(`${API}/produtos/${produto_id}/historico-precos`);
      setHistoricoDialog({ open: true, produto_id, historico: response.data });
    } catch (error) {
      toast.error('Erro ao carregar histórico');
    }
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setActiveTab('basico');
    setFormData({
      sku: '', nome: '', marca_id: '', categoria_id: '', subcategoria_id: '', unidade: 'UN',
      preco_custo: 0, preco_venda: 0, margem_lucro: 0, preco_promocional: '', data_inicio_promo: '', data_fim_promo: '',
      estoque_minimo: 0, estoque_maximo: 0, codigo_barras: '', peso: '', altura: '', largura: '', profundidade: '',
      fornecedor_preferencial_id: '', comissao_vendedor: '', tags: [], em_destaque: false,
      tem_variacoes: false, variacoes: [], eh_kit: false, componentes_kit: [], fotos: [], descricao: '', ativo: true
    });
  };

  const adicionarVariacao = () => {
    if (!novaVariacao.sku_variante) {
      toast.error('SKU da variação é obrigatório');
      return;
    }
    setFormData(prev => ({
      ...prev,
      variacoes: [...prev.variacoes, { ...novaVariacao, id: Date.now().toString() }]
    }));
    setNovaVariacao({ tamanho: '', cor: '', sku_variante: '', estoque_atual: 0, preco_adicional: 0 });
  };

  const removerVariacao = (id) => {
    setFormData(prev => ({
      ...prev,
      variacoes: prev.variacoes.filter(v => v.id !== id)
    }));
  };

  const adicionarComponente = () => {
    if (!novoComponente.produto_id) {
      toast.error('Selecione um produto');
      return;
    }
    const produtoSelecionado = produtos.find(p => p.id === novoComponente.produto_id);
    setFormData(prev => ({
      ...prev,
      componentes_kit: [...prev.componentes_kit, { ...novoComponente, nome: produtoSelecionado?.nome }]
    }));
    setNovoComponente({ produto_id: '', quantidade: 1 });
  };

  const removerComponente = (produto_id) => {
    setFormData(prev => ({
      ...prev,
      componentes_kit: prev.componentes_kit.filter(c => c.produto_id !== produto_id)
    }));
  };

  const adicionarTag = () => {
    if (tagInput && !formData.tags.includes(tagInput)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput]
      }));
      setTagInput('');
    }
  };

  const removerTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const getMarcaNome = (marca_id) => {
    const marca = marcas.find(m => m.id === marca_id);
    return marca ? marca.nome : '-';
  };

  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  };

  const limparFiltros = () => {
    setFiltros({
      termo: '', marca_id: 'todas', categoria_id: 'todas', subcategoria_id: 'todas',
      ativo: 'todos', com_estoque: '', estoque_baixo: false, em_destaque: false
    });
  };

  return (
    <div className="page-container" data-testid="produtos-page">
      {/* Header com Relatórios */}
      {relatorios && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package size={16} className="text-blue-500" />
                Total Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{relatorios.valorEstoque.total_produtos}</div>
              <p className="text-xs text-gray-500">{relatorios.valorEstoque.total_itens_estoque} itens em estoque</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign size={16} className="text-green-500" />
                Valor do Estoque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatarMoeda(relatorios.valorEstoque.valor_venda_total)}</div>
              <p className="text-xs text-gray-500">Custo: {formatarMoeda(relatorios.valorEstoque.valor_custo_total)}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp size={16} className="text-purple-500" />
                Margem Potencial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatarMoeda(relatorios.valorEstoque.margem_potencial)}</div>
              <p className="text-xs text-gray-500">Lucro estimado</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />
                Estoque Baixo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{relatorios.valorEstoque.produtos_estoque_baixo}</div>
              <p className="text-xs text-gray-500">Produtos precisam reposição</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Produtos</h1>
          <p className="text-gray-600">Gerencie seu catálogo de produtos completo</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-produto-btn"><Plus className="mr-2" size={18} />Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basico">Básico</TabsTrigger>
                  <TabsTrigger value="precos">Preços</TabsTrigger>
                  <TabsTrigger value="variacoes">Variações</TabsTrigger>
                  <TabsTrigger value="extras">Extras</TabsTrigger>
                  <TabsTrigger value="kits">Kits</TabsTrigger>
                </TabsList>

                {/* ABA BÁSICO */}
                <TabsContent value="basico" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>SKU *</Label>
                      <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Nome *</Label>
                      <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Marca</Label>
                      <Select value={formData.marca_id} onValueChange={(value) => setFormData({ ...formData, marca_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Categoria</Label>
                      <Select value={formData.categoria_id} onValueChange={(value) => setFormData({ ...formData, categoria_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Subcategoria</Label>
                      <Select value={formData.subcategoria_id} onValueChange={(value) => setFormData({ ...formData, subcategoria_id: value })}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {subcategorias.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Código de Barras</Label>
                      <Input value={formData.codigo_barras} onChange={(e) => setFormData({ ...formData, codigo_barras: e.target.value })} />
                    </div>
                    <div>
                      <Label>Unidade</Label>
                      <Select value={formData.unidade} onValueChange={(value) => setFormData({ ...formData, unidade: value })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UN">Unidade</SelectItem>
                          <SelectItem value="PC">Peça</SelectItem>
                          <SelectItem value="CX">Caixa</SelectItem>
                          <SelectItem value="KG">Quilograma</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Fornecedor Preferencial</Label>
                      <Select value={formData.fornecedor_preferencial_id} onValueChange={(value) => setFormData({ ...formData, fornecedor_preferencial_id: value })}>
                        <SelectTrigger className="text-black"><SelectValue placeholder="Selecione" className="text-black" /></SelectTrigger>
                        <SelectContent>
                          {fornecedores.map(f => <SelectItem key={f.id} value={f.id} className="text-black">{f.razao_social}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Estoque Mínimo</Label>
                      <Input type="number" value={formData.estoque_minimo} onChange={(e) => setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label>Estoque Máximo</Label>
                      <Input type="number" value={formData.estoque_maximo} onChange={(e) => setFormData({ ...formData, estoque_maximo: parseInt(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
                  </div>
                </TabsContent>

                {/* ABA PREÇOS */}
                <TabsContent value="precos" className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Preço de Custo (R$) *</Label>
                      <Input type="number" step="0.01" value={formData.preco_custo} onChange={(e) => handlePrecoCustoChange(e.target.value)} required />
                    </div>
                    <div>
                      <Label>Preço de Venda (R$) *</Label>
                      <Input type="number" step="0.01" value={formData.preco_venda} onChange={(e) => handlePrecoVendaChange(e.target.value)} required />
                    </div>
                    <div>
                      <Label>Margem de Lucro (%)</Label>
                      <Input type="number" step="0.01" value={formData.margem_lucro} onChange={(e) => handleMargemChange(e.target.value)} />
                      <p className="text-xs text-gray-500 mt-1">Calculado automaticamente</p>
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Informações de Preço:</p>
                    <p className="text-sm text-blue-700">Margem: {formData.margem_lucro}% | Lucro por unidade: {formatarMoeda(formData.preco_venda - formData.preco_custo)}</p>
                  </div>
                  <hr />
                  <h3 className="font-semibold">Preço Promocional</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Preço Promocional (R$)</Label>
                      <Input type="number" step="0.01" value={formData.preco_promocional} onChange={(e) => setFormData({ ...formData, preco_promocional: e.target.value })} />
                    </div>
                    <div>
                      <Label>Data Início</Label>
                      <Input type="date" value={formData.data_inicio_promo} onChange={(e) => setFormData({ ...formData, data_inicio_promo: e.target.value })} />
                    </div>
                    <div>
                      <Label>Data Fim</Label>
                      <Input type="date" value={formData.data_fim_promo} onChange={(e) => setFormData({ ...formData, data_fim_promo: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Comissão de Vendedor (% ou R$)</Label>
                    <Input type="number" step="0.01" value={formData.comissao_vendedor} onChange={(e) => setFormData({ ...formData, comissao_vendedor: e.target.value })} />
                  </div>
                </TabsContent>

                {/* ABA VARIAÇÕES */}
                <TabsContent value="variacoes" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.tem_variacoes} onChange={(e) => setFormData({ ...formData, tem_variacoes: e.target.checked })} />
                    <Label>Este produto possui variações (tamanhos/cores)</Label>
                  </div>
                  
                  {formData.tem_variacoes && (
                    <>
                      <div className="grid grid-cols-5 gap-2">
                        <Input placeholder="Tamanho" value={novaVariacao.tamanho} onChange={(e) => setNovaVariacao({ ...novaVariacao, tamanho: e.target.value })} />
                        <Input placeholder="Cor" value={novaVariacao.cor} onChange={(e) => setNovaVariacao({ ...novaVariacao, cor: e.target.value })} />
                        <Input placeholder="SKU Variante" value={novaVariacao.sku_variante} onChange={(e) => setNovaVariacao({ ...novaVariacao, sku_variante: e.target.value })} />
                        <Input type="number" placeholder="Estoque" value={novaVariacao.estoque_atual} onChange={(e) => setNovaVariacao({ ...novaVariacao, estoque_atual: parseInt(e.target.value) || 0 })} />
                        <Input type="number" step="0.01" placeholder="Preço +" value={novaVariacao.preco_adicional} onChange={(e) => setNovaVariacao({ ...novaVariacao, preco_adicional: parseFloat(e.target.value) || 0 })} />
                      </div>
                      <Button type="button" onClick={adicionarVariacao} size="sm">Adicionar Variação</Button>
                      
                      {formData.variacoes.length > 0 && (
                        <div className="border rounded p-4">
                          <h4 className="font-semibold mb-2">Variações Cadastradas:</h4>
                          {formData.variacoes.map((v) => (
                            <div key={v.id} className="flex items-center justify-between p-2 bg-gray-50 rounded mb-2">
                              <span>{v.tamanho} - {v.cor} - {v.sku_variante} (Estoque: {v.estoque_atual})</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removerVariacao(v.id)}>
                                <X size={16} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* ABA EXTRAS */}
                <TabsContent value="extras" className="space-y-4">
                  <h3 className="font-semibold">Dimensões e Peso</h3>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <Label>Peso (kg)</Label>
                      <Input type="number" step="0.01" value={formData.peso} onChange={(e) => setFormData({ ...formData, peso: e.target.value })} />
                    </div>
                    <div>
                      <Label>Altura (cm)</Label>
                      <Input type="number" step="0.01" value={formData.altura} onChange={(e) => setFormData({ ...formData, altura: e.target.value })} />
                    </div>
                    <div>
                      <Label>Largura (cm)</Label>
                      <Input type="number" step="0.01" value={formData.largura} onChange={(e) => setFormData({ ...formData, largura: e.target.value })} />
                    </div>
                    <div>
                      <Label>Profundidade (cm)</Label>
                      <Input type="number" step="0.01" value={formData.profundidade} onChange={(e) => setFormData({ ...formData, profundidade: e.target.value })} />
                    </div>
                  </div>
                  
                  <hr />
                  <h3 className="font-semibold">Tags e Destaques</h3>
                  <div className="flex gap-2">
                    <Input placeholder="Digite uma tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), adicionarTag())} />
                    <Button type="button" onClick={adicionarTag} size="sm">Adicionar</Button>
                  </div>
                  {formData.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.tags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X size={14} className="cursor-pointer" onClick={() => removerTag(tag)} />
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.em_destaque} onChange={(e) => setFormData({ ...formData, em_destaque: e.target.checked })} />
                    <Label>Produto em Destaque</Label>
                  </div>
                </TabsContent>

                {/* ABA KITS */}
                <TabsContent value="kits" className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={formData.eh_kit} onChange={(e) => setFormData({ ...formData, eh_kit: e.target.checked })} />
                    <Label>Este produto é um kit/combo</Label>
                  </div>
                  
                  {formData.eh_kit && (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <Select value={novoComponente.produto_id} onValueChange={(value) => setNovoComponente({ ...novoComponente, produto_id: value })}>
                            <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                            <SelectContent>
                              {produtos.filter(p => p.id !== editingId).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input type="number" placeholder="Quantidade" value={novoComponente.quantidade} onChange={(e) => setNovoComponente({ ...novoComponente, quantidade: parseInt(e.target.value) || 1 })} />
                      </div>
                      <Button type="button" onClick={adicionarComponente} size="sm">Adicionar ao Kit</Button>
                      
                      {formData.componentes_kit.length > 0 && (
                        <div className="border rounded p-4">
                          <h4 className="font-semibold mb-2">Componentes do Kit:</h4>
                          {formData.componentes_kit.map((c) => (
                            <div key={c.produto_id} className="flex items-center justify-between p-2 bg-gray-50 rounded mb-2">
                              <span>{c.nome} - Qtd: {c.quantidade}</span>
                              <Button type="button" variant="ghost" size="sm" onClick={() => removerComponente(c.produto_id)}>
                                <X size={16} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </TabsContent>
              </Tabs>
              
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button type="submit">{isEditing ? 'Atualizar' : 'Salvar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros Avançados */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2"><Search size={20} />Filtros Avançados</span>
            <Button variant="ghost" size="sm" onClick={limparFiltros}>Limpar Filtros</Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <Input placeholder="Buscar por nome, SKU ou código de barras" value={filtros.termo} onChange={(e) => setFiltros({ ...filtros, termo: e.target.value })} />
            
            <Select value={filtros.marca_id || 'todas'} onValueChange={(value) => setFiltros({ ...filtros, marca_id: value === 'todas' ? '' : value })}>
              <SelectTrigger><SelectValue placeholder="Todas as marcas" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Select value={filtros.categoria_id || 'todas'} onValueChange={(value) => setFiltros({ ...filtros, categoria_id: value === 'todas' ? '' : value })}>
              <SelectTrigger><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            
            <Select value={filtros.ativo || 'todos'} onValueChange={(value) => setFiltros({ ...filtros, ativo: value === 'todos' ? '' : value })}>
              <SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="true">Apenas Ativos</SelectItem>
                <SelectItem value="false">Apenas Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex gap-4 mt-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={filtros.estoque_baixo} onChange={(e) => setFiltros({ ...filtros, estoque_baixo: e.target.checked })} />
              <span className="text-sm">Apenas com estoque baixo</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={filtros.em_destaque} onChange={(e) => setFiltros({ ...filtros, em_destaque: e.target.checked })} />
              <span className="text-sm">Apenas em destaque</span>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Produtos */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>SKU</th>
              <th>Nome</th>
              <th>Marca</th>
              <th>Preço Custo</th>
              <th>Preço Venda</th>
              <th>Margem</th>
              <th>Estoque</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.map((p) => (
              <tr key={p.id}>
                <td className="font-mono text-sm">{p.sku}</td>
                <td className="font-medium">
                  {p.nome}
                  {p.em_destaque && <Badge variant="default" className="ml-2">Destaque</Badge>}
                  {p.tags && p.tags.map(tag => <Badge key={tag} variant="outline" className="ml-1">{tag}</Badge>)}
                </td>
                <td>{getMarcaNome(p.marca_id)}</td>
                <td>{formatarMoeda(p.preco_custo)}</td>
                <td>{formatarMoeda(p.preco_venda)}</td>
                <td className="text-green-600 font-semibold">{p.margem_lucro?.toFixed(2)}%</td>
                <td>
                  <span className={p.estoque_atual <= p.estoque_minimo ? 'text-red-600 font-semibold' : ''}>
                    {p.estoque_atual}
                  </span>
                </td>
                <td>
                  <span className={`badge ${p.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {p.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleVerHistorico(p.id)} title="Histórico de Preços">
                      <History size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(p)} title="Editar">
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setToggleDialog({ open: true, id: p.id, nome: p.nome, ativo: p.ativo })} title={p.ativo ? 'Inativar' : 'Ativar'}>
                      <Power size={16} className={p.ativo ? 'text-orange-500' : 'text-green-500'} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, id: p.id, nome: p.nome })} title="Excluir">
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o produto <strong>{deleteDialog.nome}</strong>?
              Esta ação não pode ser desfeita e será bloqueada se houver dependências.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Dialog */}
      <AlertDialog open={toggleDialog.open} onOpenChange={(open) => setToggleDialog({ ...toggleDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {toggleDialog.ativo ? 'inativar' : 'ativar'} o produto <strong>{toggleDialog.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Histórico de Preços Dialog */}
      <Dialog open={historicoDialog.open} onOpenChange={(open) => setHistoricoDialog({ ...historicoDialog, open })}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Histórico de Alterações de Preços</DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto">
            {historicoDialog.historico.length === 0 ? (
              <p className="text-center text-gray-500 py-4">Nenhum histórico disponível</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Data</th>
                    <th className="text-left p-2">Usuário</th>
                    <th className="text-right p-2">Custo</th>
                    <th className="text-right p-2">Venda</th>
                    <th className="text-right p-2">Margem</th>
                  </tr>
                </thead>
                <tbody>
                  {historicoDialog.historico.map((h) => (
                    <tr key={h.id} className="border-b">
                      <td className="p-2 text-sm">{new Date(h.data_alteracao).toLocaleString('pt-BR')}</td>
                      <td className="p-2 text-sm">{h.usuario_nome}</td>
                      <td className="p-2 text-sm text-right">
                        <span className="text-red-500">{formatarMoeda(h.preco_custo_anterior)}</span>
                        {' → '}
                        <span className="text-green-500">{formatarMoeda(h.preco_custo_novo)}</span>
                      </td>
                      <td className="p-2 text-sm text-right">
                        <span className="text-red-500">{formatarMoeda(h.preco_venda_anterior)}</span>
                        {' → '}
                        <span className="text-green-500">{formatarMoeda(h.preco_venda_novo)}</span>
                      </td>
                      <td className="p-2 text-sm text-right">
                        <span className="text-red-500">{h.margem_anterior.toFixed(2)}%</span>
                        {' → '}
                        <span className="text-green-500">{h.margem_nova.toFixed(2)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
