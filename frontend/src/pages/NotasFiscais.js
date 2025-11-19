import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Check, Upload, AlertCircle, Package, Trash2, X, DollarSign, ChevronDown, ChevronUp, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import ContaPagarVinculada from '../components/ContaPagarVinculada';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NotasFiscais = () => {
  const { user } = useAuth();
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelDialog, setCancelDialog] = useState({ open: false, notaId: null, confirmada: false, motivo: '' });
  
  // Estados para controle de expansão/colapso
  const [itensExpandidos, setItensExpandidos] = useState({});
  const [contasExpandidas, setContasExpandidas] = useState({});
  
  // Estados para filtros
  const [filtros, setFiltros] = useState({
    numero: '',
    fornecedor_id: '',
    data_inicio: '',
    data_fim: '',
    status: ''
  });
  const [historicoDialog, setHistoricoDialog] = useState({ open: false, produtoId: null, produtoNome: '', historico: [], loading: false });
  
  // Estado para paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 20;
  
  const [formData, setFormData] = useState({
    numero: '',
    serie: '',
    fornecedor_id: '',
    data_emissao: '',
    valor_total: 0,
    xml: '',
    forma_pagamento: 'boleto',
    tipo_pagamento: 'avista',
    numero_parcelas: 1,
    data_vencimento: ''
  });
  
  const [itensNota, setItensNota] = useState([]);
  const [novoItem, setNovoItem] = useState({
    produto_id: '',
    quantidade: 1,
    preco_unitario: 0
  });

  useEffect(() => {
    fetchData();
  }, [filtros]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Carregar notas fiscais com filtros
      const params = new URLSearchParams();
      if (filtros.numero) params.append('numero', filtros.numero);
      if (filtros.fornecedor_id) params.append('fornecedor_id', filtros.fornecedor_id);
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.status) params.append('status', filtros.status);
      
      const nfRes = await axios.get(`${API}/notas-fiscais?${params.toString()}`);
      const notasFiscaisData = nfRes.data?.data || nfRes.data || [];
      setNotasFiscais(notasFiscaisData);
      
      // Tentar carregar fornecedores
      try {
        const fornRes = await axios.get(`${API}/fornecedores?limit=0`);
        const fornecedoresData = fornRes.data?.data || fornRes.data || [];
        setFornecedores(fornecedoresData);
      } catch (err) {
        console.log('Sem permissão para fornecedores');
        setFornecedores([]);
      }
      
      // Tentar carregar produtos
      try {
        const prodRes = await axios.get(`${API}/produtos?limit=0`);
        const produtosData = prodRes.data?.data || prodRes.data || [];
        setProdutos(produtosData);
      } catch (err) {
        console.log('Sem permissão para produtos');
        setProdutos([]);
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
    } catch (error) {
      console.error('Erro ao carregar notas fiscais:', error);
      toast.error('Erro ao carregar notas fiscais');
    } finally {
      setLoading(false);
    }
  };

  // Função para obter descrição completa do produto
  const getProdutoDescricaoCompleta = (produto_id) => {
    const produto = produtos.find(p => p.id === produto_id);
    if (!produto) return 'Produto não encontrado';
    
    const marca = marcas.find(m => m.id === produto.marca_id);
    const categoria = categorias.find(c => c.id === produto.categoria_id);
    const subcategoria = subcategorias.find(s => s.id === produto.subcategoria_id);
    
    const marcaNome = marca?.nome || 'N/A';
    const categoriaNome = categoria?.nome || 'N/A';
    const subcategoriaNome = subcategoria?.nome || 'N/A';
    
    return `${marcaNome} | ${categoriaNome} | ${subcategoriaNome} | ${produto.nome}`;
  };


  const fetchHistoricoCompras = async (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    if (!produto) {
      toast.error('Produto não encontrado');
      return;
    }

    setHistoricoDialog({ 
      open: true, 
      produtoId, 
      produtoNome: produto.nome, 
      historico: [], 
      loading: true 
    });

    try {
      const response = await axios.get(`${API}/produtos/${produtoId}/historico-compras`);
      setHistoricoDialog(prev => ({ 
        ...prev, 
        historico: response.data, 
        loading: false 
      }));
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      toast.error('Erro ao buscar histórico de compras');
      setHistoricoDialog(prev => ({ ...prev, loading: false }));
    }
  };


  const handleAddItem = () => {
    // Validações detalhadas
    if (!novoItem.produto_id) {
      toast.error('Selecione um produto');
      return;
    }
    
    if (!novoItem.quantidade || novoItem.quantidade <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }
    
    if (!novoItem.preco_unitario || novoItem.preco_unitario <= 0) {
      toast.error('Preço unitário deve ser maior que zero');
      return;
    }

    const produto = produtos.find(p => p.id === novoItem.produto_id);
    if (!produto) {
      toast.error('Produto não encontrado');
      return;
    }

    const itemCompleto = {
      ...novoItem,
      produto_nome: produto.nome,
      produto_sku: produto.sku,
      subtotal: parseFloat((novoItem.quantidade * novoItem.preco_unitario).toFixed(2))
    };

    setItensNota([...itensNota, itemCompleto]);
    
    // Atualizar valor total
    const novoTotal = parseFloat([...itensNota, itemCompleto].reduce((sum, item) => sum + item.subtotal, 0).toFixed(2));
    setFormData({ ...formData, valor_total: novoTotal });

    // Limpar formulário de item
    setNovoItem({
      produto_id: '',
      quantidade: 1,
      preco_unitario: 0
    });

    toast.success(`Item adicionado: ${produto.nome}`);
  };

  const handleRemoveItem = (index) => {
    const novosItens = itensNota.filter((_, i) => i !== index);
    setItensNota(novosItens);
    
    // Atualizar valor total
    const novoTotal = novosItens.reduce((sum, item) => sum + item.subtotal, 0);
    setFormData({ ...formData, valor_total: novoTotal });
    
    toast.success('Item removido');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (itensNota.length === 0) {
      toast.error('Adicione pelo menos um item à nota fiscal');
      return;
    }

    setLoading(true);
    try {
      // Preparar itens sem informações extras
      const itensParaEnvio = itensNota.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }));

      const payload = {
        ...formData,
        itens: itensParaEnvio
      };

      await axios.post(`${API}/notas-fiscais`, payload);
      toast.success('Nota fiscal cadastrada com sucesso!');
      fetchData();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar nota fiscal');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async (notaId) => {
    if (!window.confirm('Confirmar entrada da nota fiscal? O estoque será atualizado.')) return;

    try {
      await axios.post(`${API}/notas-fiscais/${notaId}/confirmar`);
      toast.success('Nota fiscal confirmada e estoque atualizado!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao confirmar nota');
    }
  };

  const handleCancelar = async () => {
    if (!cancelDialog.motivo || cancelDialog.motivo.trim() === '') {
      toast.error('Motivo do cancelamento é obrigatório');
      return;
    }

    try {
      await axios.post(`${API}/notas-fiscais/${cancelDialog.notaId}/cancelar`, { motivo: cancelDialog.motivo.trim() });
      toast.success(
        cancelDialog.confirmada 
          ? 'Nota fiscal cancelada e estoque revertido com sucesso!' 
          : 'Nota fiscal cancelada com sucesso!'
      );
      setCancelDialog({ open: false, notaId: null, confirmada: false, motivo: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar nota fiscal');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({
      numero: '',
      serie: '',
      fornecedor_id: '',
      data_emissao: '',
      valor_total: 0,
      xml: '',
      forma_pagamento: 'boleto',
      tipo_pagamento: 'avista',
      numero_parcelas: 1,
      data_vencimento: ''
    });
    setItensNota([]);
    setNovoItem({
      produto_id: '',
      quantidade: 1,
      preco_unitario: 0
    });
  };

  const getFornecedorNome = (fornecedorId) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    if (!fornecedor) return 'Fornecedor não encontrado';
    const nome = fornecedor.razao_social || fornecedor.nome || 'N/A';
    const cnpj = fornecedor.cnpj || 'N/A';
    return `${nome} - CNPJ: ${cnpj}`;
  };

  const getProdutoNome = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto?.nome || 'Produto';
  };

  const getProdutoDetalhado = (produto) => {
    if (!produto) return '';
    
    // Buscar marca
    const marca = marcas.find(m => m.id === produto.marca_id);
    const marcaNome = marca?.nome || 'Sem Marca';
    
    // Buscar categoria
    const categoria = categorias.find(c => c.id === produto.categoria_id);
    const categoriaNome = categoria?.nome || 'Sem Categoria';
    
    // Buscar subcategoria
    const subcategoria = subcategorias.find(s => s.id === produto.subcategoria_id);
    const subcategoriaNome = subcategoria?.nome || 'Sem Subcategoria';
    
    // Montar texto: Marca | Categoria | Subcategoria | Nome do Produto | SKU
    return `${marcaNome} | ${categoriaNome} | ${subcategoriaNome} | ${produto.nome} | SKU: ${produto.sku || 'N/A'}`;
  };

  // Estatísticas
  const notasConfirmadas = notasFiscais.filter(nf => nf.confirmado && !nf.cancelada && nf.status !== 'cancelada').length;
  const notasPendentes = notasFiscais.filter(nf => !nf.confirmado && !nf.cancelada && nf.status !== 'cancelada').length;
  const notasCanceladas = notasFiscais.filter(nf => nf.cancelada || nf.status === 'cancelada').length;
  const valorTotalConfirmado = notasFiscais
    .filter(nf => nf.confirmado && !nf.cancelada && nf.status !== 'cancelada')
    .reduce((sum, nf) => sum + nf.valor_total, 0);

  // Lógica de paginação
  const totalPaginas = Math.ceil(notasFiscais.length / ITENS_POR_PAGINA);
  const indiceInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFinal = indiceInicial + ITENS_POR_PAGINA;
  const notasFiscaisPaginadas = notasFiscais.slice(indiceInicial, indiceFinal);

  // Resetar página quando filtros mudarem
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtros]);

  return (
    <div className="page-container" data-testid="notas-fiscais-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Notas Fiscais de Entrada</h1>
          <p className="text-gray-600">Controle de entrada de produtos por nota fiscal</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-nf-btn" style={{backgroundColor: '#267698'}}>
              <Plus className="mr-2" size={18} />
              Nova Nota Fiscal
            </Button>
          </DialogTrigger>
          <DialogContent className="dialog-responsive max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Nota Fiscal de Entrada</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados da NF</TabsTrigger>
                <TabsTrigger value="itens">Itens ({itensNota.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4">
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Número da NF *</Label>
                      <Input
                        data-testid="nf-numero-input"
                        value={formData.numero}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Série *</Label>
                      <Input
                        data-testid="nf-serie-input"
                        value={formData.serie}
                        onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label>Fornecedor *</Label>
                    <Select 
                      value={formData.fornecedor_id} 
                      onValueChange={(v) => setFormData({ ...formData, fornecedor_id: v })}
                      required
                    >
                      <SelectTrigger data-testid="nf-fornecedor-select">
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {fornecedores.map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.razao_social} - {f.cnpj}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Data de Emissão *</Label>
                      <Input
                        type="date"
                        data-testid="nf-data-input"
                        value={formData.data_emissao}
                        onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Valor Total</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_total}
                        readOnly
                        className="bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label>XML da NF-e (opcional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".xml"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setFormData({ ...formData, xml: event.target?.result });
                            };
                            reader.readAsText(file);
                            toast.success('XML carregado');
                          }
                        }}
                      />
                      <Upload size={20} className="text-gray-400" />
                    </div>
                  </div>

                  {/* Seção de Pagamento */}
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <DollarSign size={18} />
                      Informações de Pagamento
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <Label>Forma de Pagamento *</Label>
                        <Select 
                          value={formData.forma_pagamento} 
                          onValueChange={(v) => setFormData({ ...formData, forma_pagamento: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="boleto">Boleto</SelectItem>
                            <SelectItem value="pix">Pix</SelectItem>
                            <SelectItem value="transferencia">Transferência</SelectItem>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Tipo de Pagamento *</Label>
                        <Select 
                          value={formData.tipo_pagamento} 
                          onValueChange={(v) => setFormData({ ...formData, tipo_pagamento: v })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="avista">À Vista</SelectItem>
                            <SelectItem value="parcelado">Parcelado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {formData.tipo_pagamento === 'parcelado' && (
                        <div>
                          <Label>Número de Parcelas</Label>
                          <Input
                            type="number"
                            min="2"
                            max="12"
                            value={formData.numero_parcelas}
                            onChange={(e) => setFormData({ ...formData, numero_parcelas: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      )}
                      <div>
                        <Label>Data de Vencimento {formData.tipo_pagamento === 'parcelado' ? '(1ª Parcela)' : ''}</Label>
                        <Input
                          type="date"
                          value={formData.data_vencimento}
                          onChange={(e) => setFormData({ ...formData, data_vencimento: e.target.value })}
                          placeholder="Deixe vazio para 30 dias"
                        />
                        <p className="text-xs text-gray-500 mt-1">Deixe vazio para usar 30 dias após emissão</p>
                      </div>
                    </div>
                  </div>

                  {itensNota.length === 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800 flex items-center gap-2">
                        <AlertCircle size={16} />
                        Adicione itens na aba "Itens" antes de cadastrar a nota fiscal
                      </p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full"
                    style={{backgroundColor: '#2C9AA1'}}
                    disabled={loading || itensNota.length === 0}
                    data-testid="nf-submit-btn"
                  >
                    {loading ? 'Cadastrando...' : 'Cadastrar Nota Fiscal'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="itens" className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package size={18} />
                    Adicionar Item
                  </h3>
                  
                  {produtos.length === 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                      <p className="text-sm text-yellow-800">
                        {loading ? 'Carregando produtos...' : 'Nenhum produto cadastrado no sistema'}
                      </p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Produto</Label>
                      <div className="flex gap-2">
                        <Select 
                          value={novoItem.produto_id} 
                          onValueChange={(v) => {
                            setNovoItem({ ...novoItem, produto_id: v });
                            fetchHistoricoCompras(v);
                          }}
                          disabled={produtos.length === 0}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={produtos.length === 0 ? "Sem produtos" : "Selecione"} />
                          </SelectTrigger>
                          <SelectContent>
                            {produtos.filter(p => p.ativo !== false).map(p => (
                              <SelectItem key={p.id} value={p.id} className="text-sm">
                                {getProdutoDetalhado(p)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={novoItem.quantidade}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          setNovoItem({ ...novoItem, quantidade: val });
                        }}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Preço Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={novoItem.preco_unitario}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setNovoItem({ ...novoItem, preco_unitario: val });
                        }}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddItem}
                    className="w-full mt-3"
                    style={{backgroundColor: '#267698'}}
                  >
                    <Plus size={14} className="mr-1" />
                    Adicionar Item
                  </Button>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Itens Adicionados ({itensNota.length})</h3>
                  {itensNota.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border rounded-lg">
                      Nenhum item adicionado
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itensNota.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                          <div className="flex-1">
                            <p className="font-medium text-sm text-blue-700">
                              {getProdutoDescricaoCompleta(item.produto_id)}
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              Quantidade: <span className="font-semibold">{item.quantidade}</span> x R$ {item.preco_unitario.toFixed(2)} = <span className="font-bold text-green-600">R$ {item.subtotal.toFixed(2)}</span>
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(index)}
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-bold text-right">
                          Total: R$ {itensNota.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros Avançados */}
      <Card className="mb-4 sm:mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-blue-600" />
            <h3 className="font-semibold">Filtros de Pesquisa</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label>Número da NF</Label>
              <Input
                placeholder="Ex: 123"
                value={filtros.numero}
                onChange={(e) => setFiltros({...filtros, numero: e.target.value})}
              />
            </div>
            <div>
              <Label>Fornecedor</Label>
              <Select
                value={filtros.fornecedor_id || "todos"}
                onValueChange={(v) => setFiltros({...filtros, fornecedor_id: v === "todos" ? "" : v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.razao_social || f.nome} - CNPJ: {f.cnpj || 'N/A'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={filtros.status || "todas"}
                onValueChange={(v) => setFiltros({...filtros, status: v === "todas" ? "" : v})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="confirmada">Confirmadas</SelectItem>
                  <SelectItem value="cancelada">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
          </div>
          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFiltros({ numero: '', fornecedor_id: '', data_inicio: '', data_fim: '', status: '' })}
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estatísticas */}
      <div className="filters-grid-4 mb-4 sm:mb-6">
        <Card>
          <CardContent className="card-content-responsive">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de NFs</p>
                <p className="text-2xl font-bold">{notasFiscais.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="card-content-responsive">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500">
                <Check className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold">{notasConfirmadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="card-content-responsive">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-500">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold">{notasPendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="card-content-responsive">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Canceladas</p>
                <p className="text-2xl font-bold">{notasCanceladas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Notas Fiscais */}
      <div className="space-y-4">
        {notasFiscaisPaginadas.map((nota) => (
          <Card key={nota.id} data-testid={`nf-${nota.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  NF-e {nota.numero} / Série {nota.serie}
                </CardTitle>
                <span className={`badge ${
                  nota.status === 'cancelada' || nota.cancelada 
                    ? 'badge-danger' 
                    : nota.confirmado 
                      ? 'badge-success' 
                      : 'badge-warning'
                }`}>
                  {nota.status === 'cancelada' || nota.cancelada 
                    ? 'CANCELADA' 
                    : nota.confirmado 
                      ? 'CONFIRMADA' 
                      : 'PENDENTE'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Fornecedor</p>
                  <p className="font-medium">{getFornecedorNome(nota.fornecedor_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data de Emissão</p>
                  <p className="font-medium">{new Date(nota.data_emissao).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="font-medium text-lg" style={{color: '#2C9AA1'}}>R$ {nota.valor_total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data de Cadastro</p>
                  <p className="font-medium text-sm">{new Date(nota.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="mb-4">
                <div 
                  className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded mb-2"
                  onClick={() => setItensExpandidos({...itensExpandidos, [nota.id]: !itensExpandidos[nota.id]})}
                >
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Package size={16} className="text-blue-600" />
                    Itens ({nota.itens.length})
                  </p>
                  {itensExpandidos[nota.id] ? (
                    <ChevronUp size={20} className="text-gray-600" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-600" />
                  )}
                </div>
                {itensExpandidos[nota.id] && (
                  <div className="grid grid-cols-1 gap-2">
                    {nota.itens.map((item, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-700">
                            {getProdutoDescricaoCompleta(item.produto_id)}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">
                            Quantidade: <span className="font-semibold">{item.quantidade}</span> x R$ {item.preco_unitario.toFixed(2)}
                          </p>
                        </div>
                        <span className="font-bold text-green-600 ml-2">
                          R$ {(item.quantidade * item.preco_unitario).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                  </div>
                )}
              </div>

              {/* Conta a Pagar Vinculada - Colapsável */}
              {nota.confirmado && !nota.cancelada && (
                <div className="mb-4">
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded mb-2"
                    onClick={() => setContasExpandidas({...contasExpandidas, [nota.id]: !contasExpandidas[nota.id]})}
                  >
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <DollarSign size={16} className="text-green-600" />
                      Conta a Pagar Vinculada
                    </p>
                    {contasExpandidas[nota.id] ? (
                      <ChevronUp size={20} className="text-gray-600" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-600" />
                    )}
                  </div>
                  {contasExpandidas[nota.id] && (
                    <ContaPagarVinculada notaId={nota.id} />
                  )}
                </div>
              )}

              {nota.status === 'cancelada' || nota.cancelada ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Nota fiscal cancelada
                    {nota.motivo_cancelamento && (
                      <span className="text-xs ml-2">- {nota.motivo_cancelamento}</span>
                    )}
                  </p>
                </div>
              ) : (
                <>
                  {!nota.confirmado && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConfirmar(nota.id)}
                        style={{backgroundColor: '#2C9AA1'}}
                        data-testid={`confirmar-nf-${nota.id}`}
                      >
                        <Check className="mr-2" size={16} />
                        Confirmar e Atualizar Estoque
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setCancelDialog({ open: true, notaId: nota.id, confirmada: nota.confirmado, motivo: '' })}
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                        data-testid={`cancelar-nf-${nota.id}`}
                      >
                        <AlertCircle className="mr-2" size={16} />
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {nota.confirmado && (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <Check size={16} />
                          Nota confirmada - Estoque atualizado
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setCancelDialog({ open: true, notaId: nota.id, confirmada: nota.confirmado, motivo: '' })}
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                        data-testid={`cancelar-nf-confirmada-${nota.id}`}
                      >
                        <AlertCircle className="mr-2" size={16} />
                        Cancelar Nota Fiscal (Reverter Estoque)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}

        {notasFiscais.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-400" />
              <p>Nenhuma nota fiscal cadastrada</p>
              <p className="text-sm mt-2">Clique em "Nova Nota Fiscal" para cadastrar</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Controles de Paginação */}
      {notasFiscais.length > ITENS_POR_PAGINA && (
        <Card className="mt-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {indiceInicial + 1} a {Math.min(indiceFinal, notasFiscais.length)} de {notasFiscais.length} notas fiscais
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
          </CardContent>
        </Card>
      )}
      {/* Dialog de Cancelamento */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancelar Nota Fiscal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">
                ⚠️ <strong>Atenção:</strong> Esta ação é irreversível!
              </p>
              <ul className="mt-2 text-sm text-red-800 list-disc list-inside">
                <li>A nota fiscal será cancelada</li>
                {cancelDialog.confirmada && <li>O estoque será revertido automaticamente</li>}
                <li>Esta ação não pode ser desfeita</li>
              </ul>
            </div>
            <div>
              <Label htmlFor="motivo-nf">Motivo do Cancelamento *</Label>
              <textarea
                id="motivo-nf"
                className="w-full mt-1 p-2 border rounded-md"
                rows="3"
                placeholder="Digite o motivo do cancelamento..."
                value={cancelDialog.motivo}
                onChange={(e) => setCancelDialog({ ...cancelDialog, motivo: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => setCancelDialog({ open: false, notaId: null, confirmada: false, motivo: '' })}
              >
                Voltar
              </Button>
              <Button 
                variant="destructive"
                onClick={handleCancelar}
                disabled={!cancelDialog.motivo.trim()}
              >
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Histórico de Compras */}
      <Dialog open={historicoDialog.open} onOpenChange={(open) => setHistoricoDialog({ ...historicoDialog, open })}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Compras - {historicoDialog.produtoNome}</DialogTitle>
          </DialogHeader>

          {historicoDialog.loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-3 text-gray-600">Carregando histórico...</span>
            </div>
          ) : historicoDialog.historico.length === 0 ? (
            <div className="p-8 text-center">
              <Package size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                Nenhum Histórico Encontrado
              </h3>
              <p className="text-gray-600">
                Este produto não possui histórico de compras. Esta é a primeira compra deste produto.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Últimas {historicoDialog.historico.length} compras deste produto:
              </p>
              {historicoDialog.historico.map((compra, index) => (
                <Card key={index} className="border border-gray-200">
                  <CardContent className="card-content-responsive">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Data da Compra</p>
                        <p className="font-semibold text-sm">
                          {new Date(compra.data_emissao).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Nota Fiscal</p>
                        <p className="font-semibold text-sm">
                          {compra.numero_nf} / Série {compra.serie}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Fornecedor</p>
                        <p className="font-semibold text-sm">{compra.fornecedor_nome}</p>
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
          )}

          <div className="mt-4">
            <Button
              className="w-full"
              onClick={() => setHistoricoDialog({ open: false, produtoId: null, produtoNome: '', historico: [], loading: false })}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default NotasFiscais;