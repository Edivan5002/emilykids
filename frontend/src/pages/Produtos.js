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
import { Plus, Edit, Trash2, Power, Search, X, TrendingUp, Package, DollarSign, AlertTriangle, History, Download, Star, ZoomIn, Upload, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { exportToCSV, formatCurrency } from '../utils/exportUtils';
import imageCompression from 'browser-image-compression';
import { ReactSortable } from 'react-sortablejs';

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
  
  // Estados para filtros em cascata
  const [categoriasFiltradas, setCategoriasFiltradas] = useState([]);
  const [subcategoriasFiltradas, setSubcategoriasFiltradas] = useState([]);
  
  // Estado para histórico de compras com paginação
  const [historicoCompras, setHistoricoCompras] = useState({ 
    data: [], 
    total: 0, 
    page: 1, 
    total_pages: 0, 
    loading: false 
  });
  
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
    preco_inicial: 0,  // Usado apenas no cadastro
    preco_medio: 0,  // Calculado automaticamente
    preco_ultima_compra: 0,  // Calculado automaticamente
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [previewImages, setPreviewImages] = useState([]);
  const [zoomImage, setZoomImage] = useState(null);
  const [fotoPrincipalIndex, setFotoPrincipalIndex] = useState(0);

  useEffect(() => {
    fetchData();
    fetchRelatorios();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [filtros, produtos]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Sempre tentar carregar produtos (vendedor tem permissão)
      const prodRes = await axios.get(`${API}/produtos?incluir_inativos=true&limit=0`);
      setProdutos(prodRes.data);
      setProdutosFiltrados(prodRes.data);
      
      // Tentar carregar dados adicionais, mas não falhar se não tiver permissão
      try {
        const marcaRes = await axios.get(`${API}/marcas?limit=0`);
        setMarcas(marcaRes.data.filter(m => m.ativo));
      } catch (err) {
        console.log('Sem permissão para marcas');
        setMarcas([]);
      }
      
      try {
        const catRes = await axios.get(`${API}/categorias?limit=0`);
        setCategorias(catRes.data.filter(c => c.ativo));
      } catch (err) {
        console.log('Sem permissão para categorias');
        setCategorias([]);
      }
      
      try {
        const subRes = await axios.get(`${API}/subcategorias?limit=0`);
        setSubcategorias(subRes.data.filter(s => s.ativo));
      } catch (err) {
        console.log('Sem permissão para subcategorias');
        setSubcategorias([]);
      }
      
      try {
        const fornRes = await axios.get(`${API}/fornecedores?incluir_inativos=true&limit=0`);
        setFornecedores(fornRes.data.filter(f => f.ativo));
      } catch (err) {
        console.log('Sem permissão para fornecedores');
        setFornecedores([]);
      }
    } catch (error) {
      toast.error('Erro ao carregar produtos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelatorios = async () => {
    try {
      const requests = [];
      
      // Tentar carregar relatórios, mas não falhar se não tiver permissão
      try {
        const maisVendidos = await axios.get(`${API}/produtos/relatorios/mais-vendidos?limite=20`);
        const valorEstoque = await axios.get(`${API}/produtos/relatorios/valor-estoque`);
        setRelatorios({
          maisVendidos: maisVendidos.data,
          valorEstoque: valorEstoque.data
        });
      } catch (err) {
        console.log('Sem permissão para relatórios de produtos');
        setRelatorios({ maisVendidos: [], valorEstoque: {} });
      }
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

  // Função para carregar histórico de compras com paginação
  const fetchHistoricoCompras = async (produtoId, page = 1) => {
    setHistoricoCompras(prev => ({ ...prev, loading: true }));
    try {
      const response = await axios.get(`${API}/produtos/${produtoId}/historico-compras-completo?page=${page}&limit=20`);
      setHistoricoCompras({
        data: response.data.data,
        total: response.data.total,
        page: response.data.page,
        total_pages: response.data.total_pages,
        loading: false
      });
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      toast.error('Erro ao carregar histórico de compras');
      setHistoricoCompras({ data: [], total: 0, page: 1, total_pages: 0, loading: false });
    }
  };

  // Função para atualizar categorias quando marca é selecionada
  const handleMarcaChange = (marcaId) => {
    setFormData(prev => ({
      ...prev,
      marca_id: marcaId,
      categoria_id: '',  // Limpar categoria
      subcategoria_id: ''  // Limpar subcategoria
    }));
    
    // Filtrar categorias da marca selecionada
    if (marcaId) {
      const catsFiltradas = categorias.filter(c => c.marca_id === marcaId);
      setCategoriasFiltradas(catsFiltradas);
      setSubcategoriasFiltradas([]);  // Limpar subcategorias
    } else {
      setCategoriasFiltradas([]);
      setSubcategoriasFiltradas([]);
    }
  };

  // Função para atualizar subcategorias quando categoria é selecionada
  const handleCategoriaChange = (categoriaId) => {
    setFormData(prev => ({
      ...prev,
      categoria_id: categoriaId,
      subcategoria_id: ''  // Limpar subcategoria
    }));
    
    // Filtrar subcategorias da categoria selecionada
    if (categoriaId) {
      const subsFiltradas = subcategorias.filter(s => s.categoria_id === categoriaId);
      setSubcategoriasFiltradas(subsFiltradas);
    } else {
      setSubcategoriasFiltradas([]);
    }
  };


  const calcularMargem = (custo, venda) => {
    if (custo > 0) {
      return ((venda - custo) / custo * 100).toFixed(2);
    }
    return 0;
  };

  const handlePrecoInicialChange = (valor) => {
    const novoPreco = parseFloat(valor) || 0;
    setFormData(prev => ({
      ...prev,
      preco_inicial: novoPreco,
      preco_medio: novoPreco,  // No cadastro, preco_medio = preco_inicial
      margem_lucro: calcularMargem(novoPreco, prev.preco_venda)
    }));
  };

  const handlePrecoVendaChange = (valor) => {
    const novaVenda = parseFloat(valor) || 0;
    const custoBase = isEditing ? formData.preco_medio : formData.preco_inicial;
    setFormData(prev => ({
      ...prev,
      preco_venda: novaVenda,
      margem_lucro: calcularMargem(custoBase, novaVenda)
    }));
  };

  const handleMargemChange = (valor) => {
    const novaMargem = parseFloat(valor) || 0;
    const custoBase = isEditing ? formData.preco_medio : formData.preco_inicial;
    const novaVenda = custoBase * (1 + novaMargem / 100);
    setFormData(prev => ({
      ...prev,
      margem_lucro: novaMargem,
      preco_venda: novaVenda.toFixed(2)
    }));
  };

  const handleExportarProdutos = () => {
    try {
      const columns = [
        { key: 'sku', label: 'SKU' },
        { key: 'nome', label: 'Nome' },
        { key: 'marca_nome', label: 'Marca' },
        { key: 'categoria_nome', label: 'Categoria' },
        { key: 'subcategoria_nome', label: 'Subcategoria' },
        { key: 'preco_medio', label: 'Preço Médio' },
        { key: 'preco_venda', label: 'Preço Venda' },
        { key: 'margem_lucro', label: 'Margem (%)' },
        { key: 'estoque_atual', label: 'Estoque Atual' },
        { key: 'estoque_minimo', label: 'Estoque Mínimo' },
        { key: 'estoque_maximo', label: 'Estoque Máximo' },
        { key: 'ativo', label: 'Status' }
      ];

      // Preparar dados com nomes das relações
      const dadosExportacao = produtosFiltrados.map(p => {
        const marca = marcas.find(m => m.id === p.marca_id);
        const categoria = categorias.find(c => c.id === p.categoria_id);
        const subcategoria = subcategorias.find(s => s.id === p.subcategoria_id);
        
        return {
          ...p,
          marca_nome: marca?.nome || '-',
          categoria_nome: categoria?.nome || '-',
          subcategoria_nome: subcategoria?.nome || '-',
          preco_custo: formatCurrency(p.preco_custo),
          preco_venda: formatCurrency(p.preco_venda),
          margem_lucro: p.margem_lucro?.toFixed(2) || '0.00',
          ativo: p.ativo ? 'Ativo' : 'Inativo'
        };
      });

      exportToCSV(dadosExportacao, 'produtos', columns);
      toast.success('Produtos exportados com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar produtos: ' + error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!formData.marca_id) {
      toast.error('Por favor, selecione uma marca');
      setActiveTab('basico');
      return;
    }
    if (!formData.categoria_id) {
      toast.error('Por favor, selecione uma categoria');
      setActiveTab('basico');
      return;
    }
    if (!formData.subcategoria_id) {
      toast.error('Por favor, selecione uma subcategoria');
      setActiveTab('basico');
      return;
    }
    
    try {
      const dados = { ...formData };
      
      // Sanitizar campos opcionais: converter strings vazias em null
      const camposOpcionais = [
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
      preco_inicial: produto.preco_inicial || produto.preco_custo || 0,
      preco_medio: produto.preco_medio || produto.preco_custo || 0,
      preco_ultima_compra: produto.preco_ultima_compra || produto.preco_custo || 0,
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
    setFotoPrincipalIndex(produto.foto_principal_index || 0);
    
    // Configurar filtros em cascata ao editar
    if (produto.marca_id) {
      const catsFiltradas = categorias.filter(c => c.marca_id === produto.marca_id);
      setCategoriasFiltradas(catsFiltradas);
      
      if (produto.categoria_id) {
        const subsFiltradas = subcategorias.filter(s => s.categoria_id === produto.categoria_id);
        setSubcategoriasFiltradas(subsFiltradas);
      }
    }
    
    // Carregar histórico de compras ao editar
    fetchHistoricoCompras(produto.id, 1);
    
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
      preco_inicial: 0, preco_medio: 0, preco_ultima_compra: 0, preco_venda: 0, margem_lucro: 0, 
      preco_promocional: '', data_inicio_promo: '', data_fim_promo: '',
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

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploadingImage(true);
    const compressedImages = [];

    try {
      for (const file of files) {
        // Validar tipo de arquivo
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`);
          continue;
        }

        // Comprimir imagem
        const options = {
          maxSizeMB: 0.5, // Máximo 500KB
          maxWidthOrHeight: 1024, // Máximo 1024px
          useWebWorker: true,
          fileType: 'image/jpeg'
        };

        const compressedFile = await imageCompression(file, options);
        
        // Converter para base64
        const reader = new FileReader();
        const base64Promise = new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(compressedFile);
        });
        
        const base64 = await base64Promise;
        compressedImages.push(base64);
      }

      setPreviewImages(compressedImages);
      toast.success(`${compressedImages.length} imagem(ns) processada(s) e comprimida(s)!`);
    } catch (error) {
      toast.error('Erro ao processar imagens: ' + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const uploadImagesToProduct = async () => {
    if (previewImages.length === 0) {
      toast.error('Selecione pelo menos uma imagem');
      return;
    }

    if (!editingId) {
      // Se está criando produto, adiciona à lista de fotos
      setFormData(prev => ({
        ...prev,
        fotos: [...(prev.fotos || []), ...previewImages]
      }));
      setPreviewImages([]);
      toast.success(`${previewImages.length} imagem(ns) adicionada(s)! Salve o produto para confirmar.`);
      return;
    }

    // Se está editando, faz upload imediato de todas as imagens
    setUploadingImage(true);
    try {
      for (const imagem of previewImages) {
        await axios.post(`${API}/produtos/${editingId}/upload-imagem`, { imagem });
      }
      toast.success(`${previewImages.length} imagem(ns) enviada(s) com sucesso!`);
      setPreviewImages([]);
      fetchData(); // Recarregar produtos
    } catch (error) {
      toast.error('Erro ao enviar imagens: ' + (error.response?.data?.detail || error.message));
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = async (indice) => {
    if (!editingId) {
      // Se está criando, remove da lista local
      setFormData(prev => ({
        ...prev,
        fotos: prev.fotos.filter((_, i) => i !== indice)
      }));
      toast.success('Imagem removida');
      return;
    }

    // Se está editando, remove do servidor
    try {
      await axios.delete(`${API}/produtos/${editingId}/imagem/${indice}`);
      toast.success('Imagem removida com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao remover imagem: ' + (error.response?.data?.detail || error.message));
    }
  };

  const definirImagemPrincipal = async (indice) => {
    if (!editingId) {
      // Se está criando, apenas atualiza estado local
      setFotoPrincipalIndex(indice);
      toast.success('Imagem principal definida! Salve o produto para confirmar.');
      return;
    }

    // Se está editando, atualiza no servidor
    try {
      await axios.put(`${API}/produtos/${editingId}/imagem-principal/${indice}`);
      toast.success('Imagem principal definida com sucesso!');
      setFotoPrincipalIndex(indice);
      fetchData();
    } catch (error) {
      toast.error('Erro ao definir imagem principal: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleReordenarImagens = async (novaOrdem) => {
    if (!editingId) {
      // Se está criando, apenas atualiza ordem local
      setFormData(prev => ({
        ...prev,
        fotos: novaOrdem.map(item => item.foto)
      }));
      return;
    }

    // Se está editando, atualiza no servidor
    try {
      const indices = novaOrdem.map(item => item.originalIndex);
      await axios.put(`${API}/produtos/${editingId}/reordenar-imagens`, { indices });
      toast.success('Imagens reordenadas com sucesso!');
      fetchData();
    } catch (error) {
      toast.error('Erro ao reordenar imagens: ' + (error.response?.data?.detail || error.message));
    }
  };

  const getMarcaNome = (marca_id) => {
    const marca = marcas.find(m => m.id === marca_id);
    return marca ? marca.nome : '-';
  };

  const getSubcategoriaNome = (subcategoria_id) => {
    const subcategoria = subcategorias.find(s => s.id === subcategoria_id);
    return subcategoria ? subcategoria.nome : '-';
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
        <div className="filters-grid-4 mb-4 sm:mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package size={16} className="text-blue-500" />
                Total Produtos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{relatorios.valorEstoque.total_produtos}</div>
              <p className="text-xs text-gray-500">
                {relatorios.valorEstoque.total_produtos_ativos} ativos • {relatorios.valorEstoque.total_produtos_inativos} inativos
              </p>
              <p className="text-xs text-gray-400 mt-1">{relatorios.valorEstoque.total_itens_estoque} itens em estoque</p>
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
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={handleExportarProdutos}
            disabled={produtosFiltrados.length === 0}
          >
            <Download className="mr-2" size={18} />
            Exportar CSV
          </Button>
          <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsOpen(true); }}>
            <DialogTrigger asChild>
              <Button data-testid="add-produto-btn"><Plus className="mr-2" size={18} />Novo Produto</Button>
            </DialogTrigger>
          <DialogContent className="dialog-responsive max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={`grid w-full ${isEditing ? 'grid-cols-7' : 'grid-cols-6'}`}>
                  <TabsTrigger value="basico">Básico</TabsTrigger>
                  <TabsTrigger value="precos">Preços</TabsTrigger>
                  <TabsTrigger value="imagens">Imagens</TabsTrigger>
                  <TabsTrigger value="variacoes">Variações</TabsTrigger>
                  <TabsTrigger value="extras">Extras</TabsTrigger>
                  <TabsTrigger value="kits">Kits</TabsTrigger>
                  {isEditing && <TabsTrigger value="ultimas-compras">Últimas Compras</TabsTrigger>}
                </TabsList>

                {/* ABA BÁSICO */}
                <TabsContent value="basico" className="space-y-4">
                  <div className="form-grid-2">
                    <div>
                      <Label>SKU *</Label>
                      <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Nome *</Label>
                      <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
                    </div>
                  </div>
                  <div className="form-grid">
                    <div>
                      <Label>Marca *</Label>
                      <Select 
                        value={formData.marca_id} 
                        onValueChange={handleMarcaChange}
                        required
                      >
                        <SelectTrigger className={!formData.marca_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Selecione uma marca" />
                        </SelectTrigger>
                        <SelectContent>
                          {marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {!formData.marca_id && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
                    </div>
                    <div>
                      <Label>Categoria *</Label>
                      <Select 
                        value={formData.categoria_id} 
                        onValueChange={handleCategoriaChange}
                        disabled={!formData.marca_id || categoriasFiltradas.length === 0}
                        required
                      >
                        <SelectTrigger className={!formData.categoria_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder={!formData.marca_id ? "Selecione marca primeiro" : "Selecione uma categoria"} />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasFiltradas.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {!formData.categoria_id && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
                    </div>
                    <div>
                      <Label>Subcategoria *</Label>
                      <Select 
                        value={formData.subcategoria_id} 
                        onValueChange={(value) => setFormData({ ...formData, subcategoria_id: value })}
                        disabled={!formData.categoria_id || subcategoriasFiltradas.length === 0}
                        required
                      >
                        <SelectTrigger className={!formData.subcategoria_id ? 'border-red-500' : ''}>
                          <SelectValue placeholder={!formData.categoria_id ? "Selecione categoria primeiro" : "Selecione uma subcategoria"} />
                        </SelectTrigger>
                        <SelectContent>
                          {subcategoriasFiltradas.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {!formData.subcategoria_id && <p className="text-xs text-red-500 mt-1">Campo obrigatório</p>}
                    </div>
                  </div>
                  <div className="form-grid">
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
                          {fornecedores.map(f => (
                            <SelectItem key={f.id} value={f.id} className="text-black">
                              {f.razao_social} - {f.cnpj}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="form-grid-2">
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
                  <div className="form-grid">
                    {!isEditing ? (
                      // NO CADASTRO: Mostra "Preço Inicial" editável
                      <div>
                        <Label>Preço Inicial (R$) *</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={formData.preco_inicial} 
                          onChange={(e) => handlePrecoInicialChange(e.target.value)} 
                          required 
                        />
                        <p className="text-xs text-gray-500 mt-1">Preço informado no cadastro</p>
                      </div>
                    ) : (
                      // NA EDIÇÃO: Mostra "Preço Última Compra" não editável
                      <div>
                        <Label>Preço Última Compra (R$)</Label>
                        <Input 
                          type="number" 
                          step="0.01" 
                          value={formData.preco_ultima_compra || formData.preco_inicial} 
                          readOnly 
                          className="bg-gray-100"
                        />
                        <p className="text-xs text-gray-500 mt-1">Nota fiscal mais recente</p>
                      </div>
                    )}
                    
                    <div>
                      <Label>Preço Médio (R$)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={formData.preco_medio || formData.preco_inicial} 
                        readOnly 
                        className="bg-gray-100"
                      />
                      <p className="text-xs text-gray-500 mt-1">Média ponderada das compras</p>
                    </div>
                    
                    <div>
                      <Label>Preço de Venda (R$) *</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={formData.preco_venda} 
                        onChange={(e) => handlePrecoVendaChange(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="form-grid-2">
                    <div>
                      <Label>Margem de Lucro (%)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={formData.margem_lucro} 
                        onChange={(e) => handleMargemChange(e.target.value)} 
                      />
                      <p className="text-xs text-gray-500 mt-1">Calculado sobre preço médio</p>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">Informações de Preço:</p>
                    <p className="text-sm text-blue-700">
                      Margem: {formData.margem_lucro}% | Lucro por unidade: {formatarMoeda(formData.preco_venda - (isEditing ? formData.preco_medio : formData.preco_inicial))}
                    </p>
                    {isEditing && formData.preco_ultima_compra && (
                      <p className="text-sm text-gray-600 mt-1">
                        Última compra: R$ {formData.preco_ultima_compra?.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <hr />
                  <h3 className="font-semibold">Preço Promocional</h3>
                  <div className="form-grid">
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

                {/* ABA IMAGENS */}
                <TabsContent value="imagens" className="space-y-4">
                  <div className="border rounded-lg p-6 bg-gray-50">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                      <ImageIcon size={20} />
                      Galeria de Imagens do Produto
                    </h3>
                    
                    {/* Preview de Imagens */}
                    {previewImages.length > 0 && (
                      <div className="mb-4 p-4 border rounded-lg bg-white">
                        <Label className="mb-2 block">Preview das Novas Imagens ({previewImages.length}):</Label>
                        <div className="grid grid-cols-3 gap-3 mb-3">
                          {previewImages.map((img, idx) => (
                            <div key={idx} className="relative">
                              <img 
                                src={img} 
                                alt={`Preview ${idx + 1}`}
                                className="w-full h-32 object-cover rounded border"
                              />
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-1 right-1"
                                onClick={() => setPreviewImages(previewImages.filter((_, i) => i !== idx))}
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            onClick={uploadImagesToProduct}
                            disabled={uploadingImage}
                          >
                            <Upload size={16} className="mr-2" />
                            {uploadingImage ? 'Enviando...' : `Confirmar Upload (${previewImages.length})`}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setPreviewImages([])}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Upload Input com Múltiplas Imagens */}
                    <div className="mb-4 p-4 border-2 border-dashed rounded-lg bg-white">
                      <Label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center py-4">
                        <Upload size={48} className="text-blue-500 mb-2" />
                        <span className="text-lg font-medium">Clique para selecionar imagens</span>
                        <span className="text-sm text-gray-500">ou arraste e solte aqui</span>
                      </Label>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        ✓ Múltiplas imagens  ✓ Compressão automática  ✓ Máx 500KB por imagem
                      </p>
                    </div>

                    {/* Galeria de Imagens Existentes com Drag & Drop */}
                    {formData.fotos && formData.fotos.length > 0 && (
                      <div>
                        <Label className="mb-3 block flex items-center justify-between">
                          <span>Galeria do Produto ({formData.fotos.length} imagens)</span>
                          <span className="text-xs text-gray-500">Arraste para reordenar</span>
                        </Label>
                        <ReactSortable
                          list={formData.fotos.map((foto, idx) => ({ id: idx, foto, originalIndex: idx }))}
                          setList={(newList) => handleReordenarImagens(newList)}
                          animation={200}
                          className="grid grid-cols-2 md:grid-cols-3 gap-4"
                        >
                          {formData.fotos.map((foto, index) => (
                            <div 
                              key={index} 
                              className="relative group border-2 rounded-lg overflow-hidden cursor-move hover:border-blue-400 transition-all"
                              style={{ borderColor: index === fotoPrincipalIndex ? '#3b82f6' : '#e5e7eb' }}
                            >
                              <img 
                                src={foto} 
                                alt={`Produto ${index + 1}`}
                                className="w-full h-48 object-cover"
                                onClick={() => setZoomImage(foto)}
                              />
                              
                              {/* Badge de Imagem Principal */}
                              {index === fotoPrincipalIndex && (
                                <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                                  <Star size={12} fill="white" />
                                  Principal
                                </div>
                              )}
                              
                              {/* Número da Imagem */}
                              <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded text-xs font-bold">
                                #{index + 1}
                              </div>

                              {/* Ações no Hover */}
                              <div className="absolute inset-0 bg-black bg-opacity-60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="bg-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setZoomImage(foto);
                                  }}
                                >
                                  <ZoomIn size={16} className="mr-1" />
                                  Ampliar
                                </Button>
                                {index !== fotoPrincipalIndex && (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="bg-blue-500 text-white hover:bg-blue-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      definirImagemPrincipal(index);
                                    }}
                                  >
                                    <Star size={16} className="mr-1" />
                                    Definir Principal
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeImage(index);
                                  }}
                                >
                                  <Trash2 size={16} className="mr-1" />
                                  Remover
                                </Button>
                              </div>
                            </div>
                          ))}
                        </ReactSortable>
                      </div>
                    )}

                    {(!formData.fotos || formData.fotos.length === 0) && previewImages.length === 0 && (
                      <div className="text-center py-12 text-gray-500">
                        <Package size={64} className="mx-auto mb-3 text-gray-300" />
                        <p className="text-lg font-medium">Nenhuma imagem cadastrada</p>
                        <p className="text-sm">Selecione imagens acima para começar</p>
                      </div>
                    )}
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

                {/* ABA ÚLTIMAS COMPRAS */}
                {isEditing && (
                  <TabsContent value="ultimas-compras" className="space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <History size={20} />
                        Histórico Completo de Compras
                      </h3>
                      {historicoCompras.total > 0 && (
                        <Badge variant="secondary">{historicoCompras.total} compras registradas</Badge>
                      )}
                    </div>

                    {historicoCompras.loading ? (
                      <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                        <span className="ml-3 text-gray-600">Carregando histórico...</span>
                      </div>
                    ) : historicoCompras.data.length === 0 ? (
                      <div className="text-center py-12">
                        <Package size={48} className="mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                          Nenhuma Compra Registrada
                        </h3>
                        <p className="text-gray-600">
                          Não foram realizadas compras deste produto.
                        </p>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {historicoCompras.data.map((compra, index) => (
                            <Card key={index} className="border border-gray-200 hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="form-grid">
                                  <div>
                                    <p className="text-xs text-gray-500">Data da Compra</p>
                                    <p className="font-semibold text-sm">
                                      {new Date(compra.data_emissao).toLocaleDateString('pt-BR')}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Nota Fiscal</p>
                                    <p className="font-semibold text-sm">
                                      NF {compra.numero_nf} / Série {compra.serie}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Fornecedor</p>
                                    <p className="font-semibold text-sm">{compra.fornecedor_nome}</p>
                                    {compra.fornecedor_cnpj && (
                                      <p className="text-xs text-gray-500">{compra.fornecedor_cnpj}</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Quantidade</p>
                                    <p className="font-semibold text-sm">{compra.quantidade} unidades</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Preço Unitário</p>
                                    <p className="font-semibold text-sm text-green-600">
                                      R$ {compra.preco_unitario.toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-gray-500">Subtotal</p>
                                    <p className="font-semibold text-sm text-blue-600">
                                      R$ {compra.subtotal.toFixed(2)}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Paginação */}
                        {historicoCompras.total_pages > 1 && (
                          <div className="flex justify-center items-center gap-2 mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fetchHistoricoCompras(editingId, historicoCompras.page - 1)}
                              disabled={historicoCompras.page === 1}
                            >
                              Anterior
                            </Button>
                            <span className="text-sm text-gray-600">
                              Página {historicoCompras.page} de {historicoCompras.total_pages}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fetchHistoricoCompras(editingId, historicoCompras.page + 1)}
                              disabled={historicoCompras.page >= historicoCompras.total_pages}
                            >
                              Próxima
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </TabsContent>
                )}
              </Tabs>
              
              <div className="mt-6 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button type="submit">{isEditing ? 'Atualizar' : 'Salvar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
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
          <div className="filters-grid">
            <div>
              <Label className="text-sm font-medium mb-2 block">Buscar</Label>
              <Input placeholder="Nome, SKU ou código de barras" value={filtros.termo} onChange={(e) => setFiltros({ ...filtros, termo: e.target.value })} />
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Marca</Label>
              <Select value={filtros.marca_id || 'todas'} onValueChange={(value) => setFiltros({ ...filtros, marca_id: value === 'todas' ? '' : value })}>
                <SelectTrigger><SelectValue placeholder="Todas as marcas" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Categoria</Label>
              <Select value={filtros.categoria_id || 'todas'} onValueChange={(value) => setFiltros({ ...filtros, categoria_id: value === 'todas' ? '' : value })}>
                <SelectTrigger><SelectValue placeholder="Todas as categorias" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Subcategoria</Label>
              <Select value={filtros.subcategoria_id || 'todas'} onValueChange={(value) => setFiltros({ ...filtros, subcategoria_id: value === 'todas' ? '' : value })}>
                <SelectTrigger><SelectValue placeholder="Todas as subcategorias" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  {subcategorias.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-sm font-medium mb-2 block">Status</Label>
              <Select value={filtros.ativo || 'todos'} onValueChange={(value) => setFiltros({ ...filtros, ativo: value === 'todos' ? '' : value })}>
                <SelectTrigger><SelectValue placeholder="Todos os status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="true">Apenas Ativos</SelectItem>
                  <SelectItem value="false">Apenas Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
      <div className="table-responsive">
        <table className="min-w-full">
          <thead>
            <tr>
              <th className="hidden sm:table-cell">Imagem</th>
              <th className="hidden md:table-cell">SKU</th>
              <th>Nome</th>
              <th className="hidden lg:table-cell">Marca</th>
              <th className="hidden xl:table-cell">Subcategoria</th>
              <th className="hidden xl:table-cell">Última Compra</th>
              <th className="hidden md:table-cell">Preço Médio</th>
              <th>Preço Venda</th>
              <th className="hidden lg:table-cell">Margem</th>
              <th className="hidden sm:table-cell">Estoque</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="13" className="text-center py-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600">Carregando produtos...</p>
                  </div>
                </td>
              </tr>
            ) : produtosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="13" className="text-center py-8 text-gray-500">
                  Nenhum produto encontrado
                </td>
              </tr>
            ) : (
              produtosFiltrados.map((p) => (
              <tr key={p.id}>
                <td className="w-20 hidden sm:table-cell">
                  {p.fotos && p.fotos.length > 0 ? (
                    <div className="relative">
                      <img 
                        src={p.fotos[p.foto_principal_index || 0]} 
                        alt={p.nome}
                        className="w-16 h-16 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setZoomImage(p.fotos[p.foto_principal_index || 0])}
                      />
                      {p.fotos.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                          {p.fotos.length}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="w-16 h-16 bg-gray-200 rounded border flex items-center justify-center">
                      <Package size={24} className="text-gray-400" />
                    </div>
                  )}
                </td>
                <td className="font-mono text-sm hidden md:table-cell">{p.sku}</td>
                <td className="font-medium">
                  {p.nome}
                  {p.em_destaque && <Badge variant="default" className="ml-2">Destaque</Badge>}
                  {p.tags && p.tags.map(tag => <Badge key={tag} variant="outline" className="ml-1">{tag}</Badge>)}
                </td>
                <td className="hidden lg:table-cell">{getMarcaNome(p.marca_id)}</td>
                <td className="hidden xl:table-cell">{getSubcategoriaNome(p.subcategoria_id)}</td>
                <td className="hidden xl:table-cell">
                  {p.preco_ultima_compra ? formatarMoeda(p.preco_ultima_compra) : '-'}
                </td>
                <td className="hidden md:table-cell font-semibold text-blue-600">
                  {formatarMoeda(p.preco_medio || p.preco_inicial || 0)}
                </td>
                <td>{formatarMoeda(p.preco_venda)}</td>
                <td className="text-green-600 font-semibold hidden lg:table-cell">{p.margem_lucro?.toFixed(2)}%</td>
                <td className="hidden sm:table-cell">
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
                  <div className="flex justify-end gap-1 sm:gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleVerHistorico(p.id)} title="Histórico de Preços" className="hidden sm:flex">
                      <History size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(p)} title="Editar">
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setToggleDialog({ open: true, id: p.id, nome: p.nome, ativo: p.ativo })} title={p.ativo ? 'Inativar' : 'Ativar'} className="hidden sm:flex">
                      <Power size={16} className={p.ativo ? 'text-orange-500' : 'text-green-500'} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, id: p.id, nome: p.nome })} title="Excluir" className="hidden sm:flex">
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
              ))
            )}
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

      {/* Modal de Zoom */}
      <Dialog open={!!zoomImage} onOpenChange={() => setZoomImage(null)}>
        <DialogContent className="dialog-responsive">
          <DialogHeader>
            <DialogTitle>Visualização da Imagem</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            <img 
              src={zoomImage} 
              alt="Zoom" 
              className="max-w-full max-h-[70vh] object-contain rounded"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Produtos;
