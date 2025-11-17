import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Check, RotateCcw, ClipboardList, Package, AlertCircle, DollarSign, Trash2, Search, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import AutorizacaoModal from '../components/AutorizacaoModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Orcamentos = () => {
  const { user } = useAuth();
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    cliente_id: '',
    desconto: 0,
    frete: 0
  });

  const [itensOrcamento, setItensOrcamento] = useState([]);
  const [novoItem, setNovoItem] = useState({
    produto_id: '',
    quantidade: 1,
    preco_unitario: 0
  });

  // Modal de Conversão em Venda
  const [modalConversao, setModalConversao] = useState({
    open: false,
    orcamento: null,
    itens: [],
    formaPagamento: '',
    desconto: 0,
    frete: 0,
    observacoes: ''
  });
  
  const [novoItemConversao, setNovoItemConversao] = useState({
    produto_id: '',
    quantidade: 1,
    preco_unitario: 0
  });

  // Filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    cliente: 'todos',
    status: 'todos',
    dataInicio: '',
    dataFim: ''
  });

  // Removed unused state variables

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Sempre carregar orçamentos
      const orcRes = await axios.get(`${API}/orcamentos?limit=0`);
      setOrcamentos(orcRes.data);
      
      // Tentar carregar clientes separadamente
      try {
        const cliRes = await axios.get(`${API}/clientes?limit=0`);
        setClientes(cliRes.data);
      } catch (err) {
        console.log('Sem permissão para clientes');
        setClientes([]);
      }
      
      // Tentar carregar produtos separadamente
      try {
        const prodRes = await axios.get(`${API}/produtos?limit=0`);
        setProdutos(prodRes.data);
      } catch (err) {
        console.log('Sem permissão para produtos');
        setProdutos([]);
      }
    } catch (error) {
      toast.error('Erro ao carregar orçamentos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!novoItem.produto_id || novoItem.quantidade <= 0) {
      toast.error('Selecione um produto e quantidade válida');
      return;
    }

    const produto = produtos.find(p => p.id === novoItem.produto_id);
    if (!produto) return;

    // VERIFICAÇÃO CRÍTICA DE ESTOQUE - com estoque reservado
    try {
      const checkResponse = await axios.post(`${API}/estoque/check-disponibilidade`, {
        produto_id: novoItem.produto_id,
        quantidade: novoItem.quantidade
      });

      if (!checkResponse.data.disponivel) {
        toast.error(checkResponse.data.mensagem, { duration: 5000 });
        return;
      }

      // Mostrar informação de estoque disponível
      toast.success(
        `${produto.nome}: ${checkResponse.data.estoque_disponivel} unidades disponíveis`,
        { duration: 3000 }
      );
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao verificar estoque');
      return;
    }

    const precoUnitario = novoItem.preco_unitario || produto.preco_venda;
    
    const itemCompleto = {
      produto_id: novoItem.produto_id,
      produto_nome: produto.nome,
      produto_sku: produto.sku,
      quantidade: novoItem.quantidade,
      preco_unitario: precoUnitario,
      subtotal: novoItem.quantidade * precoUnitario
    };

    setItensOrcamento([...itensOrcamento, itemCompleto]);
    
    setNovoItem({
      produto_id: '',
      quantidade: 1,
      preco_unitario: 0
    });

    toast.success('Item adicionado ao orçamento');
  };

  const handleRemoveItem = (index) => {
    const novosItens = itensOrcamento.filter((_, i) => i !== index);
    setItensOrcamento(novosItens);
    toast.success('Item removido');
  };

  const calcularTotal = () => {
    const subtotal = itensOrcamento.reduce((sum, item) => sum + item.subtotal, 0);
    return subtotal - formData.desconto + formData.frete;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (itensOrcamento.length === 0) {
      toast.error('Adicione pelo menos um item ao orçamento');
      return;
    }

    setLoading(true);
    try {
      const itensParaEnvio = itensOrcamento.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }));

      const payload = {
        cliente_id: formData.cliente_id,
        itens: itensParaEnvio,
        desconto: formData.desconto,
        frete: formData.frete
      };

      await axios.post(`${API}/orcamentos`, payload);
      toast.success('Orçamento criado com sucesso! Estoque reservado.');
      fetchData();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const handleConverterVenda = async (orcamentoId) => {
    // Buscar o orçamento completo
    const orcamento = orcamentos.find(o => o.id === orcamentoId);
    if (!orcamento) {
      toast.error('Orçamento não encontrado');
      return;
    }

    // Calcular subtotal para cada item se não existir
    const itensComSubtotal = orcamento.itens.map(item => ({
      ...item,
      subtotal: item.subtotal || (item.quantidade * item.preco_unitario)
    }));

    // Abrir modal de conversão com os dados do orçamento
    setModalConversao({
      open: true,
      orcamento: orcamento,
      itens: itensComSubtotal, // Itens com subtotal calculado
      formaPagamento: '',
      desconto: orcamento.desconto || 0,
      frete: orcamento.frete || 0,
      observacoes: ''
    });
  };

  const handleAdicionarItemConversao = () => {
    if (!novoItemConversao.produto_id || novoItemConversao.quantidade <= 0 || novoItemConversao.preco_unitario <= 0) {
      toast.error('Preencha todos os campos do item');
      return;
    }

    const produto = produtos.find(p => p.id === novoItemConversao.produto_id);
    if (!produto) {
      toast.error('Produto não encontrado');
      return;
    }

    const itemCompleto = {
      produto_id: novoItemConversao.produto_id,
      produto_nome: produto.nome,
      produto_sku: produto.sku,
      quantidade: novoItemConversao.quantidade,
      preco_unitario: novoItemConversao.preco_unitario,
      subtotal: parseFloat((novoItemConversao.quantidade * novoItemConversao.preco_unitario).toFixed(2))
    };

    setModalConversao({
      ...modalConversao,
      itens: [...modalConversao.itens, itemCompleto]
    });

    setNovoItemConversao({
      produto_id: '',
      quantidade: 1,
      preco_unitario: 0
    });

    toast.success('Item adicionado');
  };

  const handleRemoverItemConversao = (index) => {
    const novosItens = modalConversao.itens.filter((_, idx) => idx !== index);
    setModalConversao({
      ...modalConversao,
      itens: novosItens
    });
    toast.success('Item removido');
  };

  const handleEfetivarVenda = async () => {
    if (!modalConversao.formaPagamento) {
      toast.error('Selecione a forma de pagamento');
      return;
    }

    if (modalConversao.itens.length === 0) {
      toast.error('Adicione pelo menos um item');
      return;
    }

    setLoading(true);
    try {
      // Enviar conversão com os itens editados
      await axios.post(`${API}/orcamentos/${modalConversao.orcamento.id}/converter-venda`, {
        forma_pagamento: modalConversao.formaPagamento,
        desconto: modalConversao.desconto,
        frete: modalConversao.frete,
        observacoes: modalConversao.observacoes,
        itens: modalConversao.itens.map(item => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario
        }))
      });
      
      toast.success('Orçamento convertido em venda com sucesso!');
      setModalConversao({ open: false, orcamento: null, itens: [], formaPagamento: '', desconto: 0, frete: 0, observacoes: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao converter em venda');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelarConversao = () => {
    setModalConversao({ open: false, orcamento: null, itens: [], formaPagamento: '', desconto: 0, frete: 0, observacoes: '' });
    setNovoItemConversao({ produto_id: '', quantidade: 1, preco_unitario: 0 });
  };

  const handleDevolver = async (orcamentoId) => {
    if (!window.confirm('Tem certeza que deseja devolver os itens ao estoque?')) return;

    try {
      await axios.post(`${API}/orcamentos/${orcamentoId}/devolver`);
      toast.success('Itens devolvidos ao estoque!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao devolver');
    }
  };

  const handleAprovar = async (orcamentoId) => {
    // TODO: Implement approval logic
    console.log('Aprovar orçamento:', orcamentoId);
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({
      cliente_id: '',
      desconto: 0,
      frete: 0
    });
    setItensOrcamento([]);
    setNovoItem({
      produto_id: '',
      quantidade: 1,
      preco_unitario: 0
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'aberto': return 'bg-blue-100 text-blue-800';
      case 'vendido': return 'bg-green-100 text-green-800';
      case 'devolvido': return 'bg-orange-100 text-orange-800';
      case 'cancelado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClienteNome = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome || 'Cliente não encontrado';
  };

  const getProdutoNome = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto?.nome || 'Produto';
  };

  // FILTROS E CÁLCULOS
  const orcamentosFiltrados = orcamentos.filter(o => {
    // Busca
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      const cliente = clientes.find(c => c.id === o.cliente_id);
      if (!o.id.toLowerCase().includes(busca) && 
          !cliente?.nome.toLowerCase().includes(busca)) {
        return false;
      }
    }

    // Cliente
    if (filtros.cliente && filtros.cliente !== 'todos' && o.cliente_id !== filtros.cliente) {
      return false;
    }

    // Status
    if (filtros.status && filtros.status !== 'todos' && o.status !== filtros.status) {
      return false;
    }

    // Data início
    if (filtros.dataInicio) {
      const orcData = new Date(o.created_at);
      const dataInicio = new Date(filtros.dataInicio);
      if (orcData < dataInicio) return false;
    }

    // Data fim
    if (filtros.dataFim) {
      const orcData = new Date(o.created_at);
      const dataFim = new Date(filtros.dataFim);
      dataFim.setHours(23, 59, 59);
      if (orcData > dataFim) return false;
    }

    return true;
  });

  // Estatísticas (baseadas na lista filtrada)
  const orcamentosAbertos = orcamentosFiltrados.filter(o => o.status === 'aberto').length;
  const orcamentosVendidos = orcamentosFiltrados.filter(o => o.status === 'vendido').length;
  const orcamentosDevolvidos = orcamentosFiltrados.filter(o => o.status === 'devolvido').length;
  const valorTotalAberto = orcamentosFiltrados
    .filter(o => o.status === 'aberto')
    .reduce((sum, o) => sum + o.total, 0);

  return (
    <div className="page-container" data-testid="orcamentos-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Orçamentos</h1>
          <p className="text-gray-600">Gerencie orçamentos de venda</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-orcamento-btn" style={{backgroundColor: '#267698'}}>
              <Plus className="mr-2" size={18} />
              Novo Orçamento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Orçamento</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados do Orçamento</TabsTrigger>
                <TabsTrigger value="itens">Itens ({itensOrcamento.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4">
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <Label>Cliente *</Label>
                    <Select 
                      value={formData.cliente_id} 
                      onValueChange={(v) => setFormData({ ...formData, cliente_id: v })}
                      required
                    >
                      <SelectTrigger data-testid="orcamento-cliente-select">
                        <SelectValue placeholder="Selecione o cliente" />
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

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Desconto (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.desconto}
                        onChange={(e) => setFormData({ ...formData, desconto: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <Label>Frete (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.frete}
                        onChange={(e) => setFormData({ ...formData, frete: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Subtotal</p>
                        <p className="font-bold text-lg">R$ {itensOrcamento.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Desconto</p>
                        <p className="font-bold text-lg text-red-600">- R$ {formData.desconto.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Frete</p>
                        <p className="font-bold text-lg text-green-600">+ R$ {formData.frete.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-300">
                      <p className="text-gray-600 text-sm">TOTAL DO ORÇAMENTO</p>
                      <p className="font-bold text-2xl" style={{color: '#267698'}}>R$ {calcularTotal().toFixed(2)}</p>
                    </div>
                  </div>

                  {itensOrcamento.length === 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800 flex items-center gap-2">
                        <AlertCircle size={16} />
                        Adicione itens na aba "Itens" antes de criar o orçamento
                      </p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full"
                    style={{backgroundColor: '#2C9AA1'}}
                    disabled={loading || itensOrcamento.length === 0}
                    data-testid="orcamento-submit-btn"
                  >
                    {loading ? 'Criando...' : 'Criar Orçamento'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="itens" className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package size={18} />
                    Adicionar Item
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs">Produto *</Label>
                      <Select 
                        value={novoItem.produto_id} 
                        onValueChange={(v) => {
                          const produto = produtos.find(p => p.id === v);
                          setNovoItem({ 
                            ...novoItem, 
                            produto_id: v,
                            preco_unitario: produto?.preco_venda || 0
                          });
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione o produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {produtos.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome} - R$ {p.preco_venda.toFixed(2)} (Estoque: {p.estoque_atual})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Quantidade *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={novoItem.quantidade}
                          onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseInt(e.target.value) || 1 })}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Preço Unit. (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={novoItem.preco_unitario}
                          onChange={(e) => setNovoItem({ ...novoItem, preco_unitario: parseFloat(e.target.value) || 0 })}
                          className="h-9"
                        />
                      </div>
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
                  <h3 className="font-semibold mb-2">Itens do Orçamento ({itensOrcamento.length})</h3>
                  {itensOrcamento.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border rounded-lg">
                      Nenhum item adicionado
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itensOrcamento.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.produto_nome}</p>
                            <p className="text-xs text-gray-600">
                              SKU: {item.produto_sku} | {item.quantidade} x R$ {item.preco_unitario.toFixed(2)} = R$ {item.subtotal.toFixed(2)}
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
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500">
                <ClipboardList className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Abertos</p>
                <p className="text-2xl font-bold">{orcamentosAbertos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500">
                <Check className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Vendidos</p>
                <p className="text-2xl font-bold">{orcamentosVendidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-500">
                <RotateCcw className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Devolvidos</p>
                <p className="text-2xl font-bold">{orcamentosDevolvidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg" style={{backgroundColor: '#267698'}}>
                <DollarSign className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Valor em Aberto</p>
                <p className="text-xl font-bold">R$ {valorTotalAberto.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <Input
                  placeholder="ID ou Cliente"
                  className="pl-10"
                  value={filtros.busca}
                  onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                />
              </div>
            </div>
            <div>
              <Label>Cliente</Label>
              <Select value={filtros.cliente} onValueChange={(value) => setFiltros({...filtros, cliente: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} - {c.cpf_cnpj}
                    </SelectItem>
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
                  <SelectItem value="aberto">Aberto</SelectItem>
                  <SelectItem value="vendido">Vendido</SelectItem>
                  <SelectItem value="devolvido">Devolvido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtros.dataInicio}
                onChange={(e) => setFiltros({...filtros, dataInicio: e.target.value})}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtros.dataFim}
                onChange={(e) => setFiltros({...filtros, dataFim: e.target.value})}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Orçamentos */}
      <div className="space-y-4">
        {loading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-600">Carregando orçamentos...</p>
              </div>
            </CardContent>
          </Card>
        ) : orcamentosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Nenhum orçamento encontrado
            </CardContent>
          </Card>
        ) : (
          orcamentosFiltrados.map((orcamento) => (
          <Card key={orcamento.id} data-testid={`orcamento-${orcamento.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Orçamento #{orcamento.id.slice(0, 8)}
                </CardTitle>
                <span className={`badge ${getStatusColor(orcamento.status)}`}>
                  {orcamento.status.toUpperCase()}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-medium">{getClienteNome(orcamento.cliente_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-medium text-lg" style={{color: '#2C9AA1'}}>R$ {orcamento.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Desconto/Frete</p>
                  <p className="font-medium text-sm">
                    {orcamento.desconto > 0 && <span className="text-red-600">-R$ {orcamento.desconto.toFixed(2)}</span>}
                    {orcamento.desconto > 0 && orcamento.frete > 0 && ' / '}
                    {orcamento.frete > 0 && <span className="text-green-600">+R$ {orcamento.frete.toFixed(2)}</span>}
                    {orcamento.desconto === 0 && orcamento.frete === 0 && '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data</p>
                  <p className="font-medium text-sm">{new Date(orcamento.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Itens ({orcamento.itens.length}):</p>
                <div className="grid grid-cols-1 gap-2">
                  {orcamento.itens.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>{getProdutoNome(item.produto_id)} x{item.quantidade}</span>
                      <span className="font-medium">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Motivo do Cancelamento - se orçamento foi cancelado */}
              {orcamento.status === 'cancelado' && orcamento.motivo_cancelamento && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-semibold text-red-800 mb-1">Motivo do Cancelamento:</p>
                  <p className="text-sm text-red-700">{orcamento.motivo_cancelamento}</p>
                  {orcamento.data_cancelamento && (
                    <p className="text-xs text-red-600 mt-1">
                      Cancelado em: {new Date(orcamento.data_cancelamento).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {orcamento.status === 'aberto' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleConverterVenda(orcamento.id)}
                      style={{backgroundColor: '#2C9AA1'}}
                      data-testid={`converter-${orcamento.id}`}
                    >
                      <Check className="mr-2" size={16} />
                      Converter em Venda
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDevolver(orcamento.id)}
                      data-testid={`devolver-${orcamento.id}`}
                    >
                      <RotateCcw className="mr-2" size={16} />
                      Devolver ao Estoque
                    </Button>
                  </>
                )}
                {/* Excluir button removed */}
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>

      {/* Modal de Conversão em Venda */}
      <Dialog open={modalConversao.open} onOpenChange={(open) => !open && handleCancelarConversao()}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="text-green-600" size={24} />
              Converter Orçamento em Venda
            </DialogTitle>
          </DialogHeader>

          {modalConversao.orcamento && (
            <div className="space-y-6">
              {/* Informações do Orçamento */}
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Orçamento:</span>
                      <span className="ml-2 font-semibold">{modalConversao.orcamento.numero}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Cliente:</span>
                      <span className="ml-2 font-semibold">{getClienteNome(modalConversao.orcamento.cliente_id)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="itens">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="itens">
                    <Package size={16} className="mr-2" />
                    Itens da Venda
                  </TabsTrigger>
                  <TabsTrigger value="pagamento">
                    <DollarSign size={16} className="mr-2" />
                    Pagamento
                  </TabsTrigger>
                </TabsList>

                {/* ABA ITENS */}
                <TabsContent value="itens" className="space-y-4">
                  {/* Lista de Itens */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Itens do Orçamento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {modalConversao.itens.length > 0 ? (
                        <div className="space-y-2">
                          {modalConversao.itens.map((item, idx) => {
                            const subtotal = item.subtotal || (item.quantidade * item.preco_unitario);
                            return (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                              <div className="flex-1">
                                <p className="font-medium">{item.produto_nome || getProdutoNome(item.produto_id)}</p>
                                <p className="text-sm text-gray-600">
                                  Qtd: {item.quantidade} x R$ {(item.preco_unitario || 0).toFixed(2)} = 
                                  <span className="font-semibold ml-1">R$ {subtotal.toFixed(2)}</span>
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoverItemConversao(idx)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          <Package size={48} className="mx-auto mb-2 text-gray-300" />
                          <p>Nenhum item adicionado</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Adicionar Novo Item */}
                  <Card className="border-green-200">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Plus size={18} className="text-green-600" />
                        Adicionar Item
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-3">
                        <div className="col-span-2">
                          <Label>Produto</Label>
                          <Select 
                            value={novoItemConversao.produto_id} 
                            onValueChange={(v) => {
                              const prod = produtos.find(p => p.id === v);
                              setNovoItemConversao({ 
                                ...novoItemConversao, 
                                produto_id: v,
                                preco_unitario: prod?.preco_venda || 0
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o produto" />
                            </SelectTrigger>
                            <SelectContent>
                              {produtos.filter(p => p.ativo !== false).map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.nome} - R$ {p.preco_venda?.toFixed(2)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={novoItemConversao.quantidade}
                            onChange={(e) => setNovoItemConversao({ 
                              ...novoItemConversao, 
                              quantidade: parseInt(e.target.value) || 1 
                            })}
                          />
                        </div>
                        <div>
                          <Label>Preço Unit.</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={novoItemConversao.preco_unitario}
                            onChange={(e) => setNovoItemConversao({ 
                              ...novoItemConversao, 
                              preco_unitario: parseFloat(e.target.value) || 0 
                            })}
                          />
                        </div>
                      </div>
                      <Button 
                        onClick={handleAdicionarItemConversao}
                        className="w-full mt-3"
                        variant="outline"
                      >
                        <Plus size={16} className="mr-2" />
                        Adicionar Item
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Totais */}
                  <Card className="bg-gray-50">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span className="font-semibold">
                            R$ {modalConversao.itens.reduce((sum, item) => {
                              const subtotal = item.subtotal || (item.quantidade * item.preco_unitario);
                              return sum + subtotal;
                            }, 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Desconto:</span>
                          <span className="font-semibold text-red-600">
                            - R$ {(modalConversao.desconto || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Frete:</span>
                          <span className="font-semibold text-blue-600">
                            + R$ {(modalConversao.frete || 0).toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span>Total:</span>
                          <span className="text-green-600">
                            R$ {(
                              modalConversao.itens.reduce((sum, item) => {
                                const subtotal = item.subtotal || (item.quantidade * item.preco_unitario);
                                return sum + subtotal;
                              }, 0) 
                              - (modalConversao.desconto || 0) 
                              + (modalConversao.frete || 0)
                            ).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* ABA PAGAMENTO */}
                <TabsContent value="pagamento" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dados do Pagamento</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Forma de Pagamento *</Label>
                        <Select 
                          value={modalConversao.formaPagamento} 
                          onValueChange={(v) => setModalConversao({ ...modalConversao, formaPagamento: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a forma de pagamento" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="pix">PIX</SelectItem>
                            <SelectItem value="cartao">Cartão</SelectItem>
                            <SelectItem value="boleto">Boleto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Desconto (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={modalConversao.desconto}
                            onChange={(e) => setModalConversao({ 
                              ...modalConversao, 
                              desconto: parseFloat(e.target.value) || 0 
                            })}
                          />
                        </div>
                        <div>
                          <Label>Frete (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={modalConversao.frete}
                            onChange={(e) => setModalConversao({ 
                              ...modalConversao, 
                              frete: parseFloat(e.target.value) || 0 
                            })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label>Observações</Label>
                        <textarea
                          className="w-full p-2 border rounded-md"
                          rows="3"
                          value={modalConversao.observacoes}
                          onChange={(e) => setModalConversao({ 
                            ...modalConversao, 
                            observacoes: e.target.value 
                          })}
                          placeholder="Observações sobre a venda..."
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Botões de Ação */}
              <div className="flex gap-3 justify-end border-t pt-4">
                <Button
                  variant="outline"
                  onClick={handleCancelarConversao}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleEfetivarVenda}
                  disabled={loading || modalConversao.itens.length === 0 || !modalConversao.formaPagamento}
                  style={{backgroundColor: '#2C9AA1'}}
                >
                  {loading ? 'Processando...' : 'Efetivar Venda'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orcamentos;