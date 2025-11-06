import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Plus, DollarSign, TrendingUp, Users, CreditCard, Search, Calendar, X, AlertCircle, Ban, Trash2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Vendas = () => {
  const { user } = useAuth();
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState({
    busca: '',
    cliente: 'todos',
    formaPagamento: 'todas',
    dataInicio: '',
    dataFim: ''
  });

  // Form para criar venda
  const [formVenda, setFormVenda] = useState({
    cliente_id: '',
    desconto: 0,
    frete: 0,
    forma_pagamento: 'cartao'
  });

  const [itensVenda, setItensVenda] = useState([]);
  const [novoItem, setNovoItem] = useState({
    produto_id: '',
    quantidade: 1,
    preco_unitario: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [vendasRes, cliRes, prodRes] = await Promise.all([
        axios.get(`${API}/vendas`),
        axios.get(`${API}/clientes`),
        axios.get(`${API}/produtos`)
      ]);
      setVendas(vendasRes.data);
      setClientes(cliRes.data);
      setProdutos(prodRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  // CRIAR VENDA
  const handleAddItem = async () => {
    if (!novoItem.produto_id || novoItem.quantidade <= 0) {
      toast.error('Selecione um produto e quantidade válida');
      return;
    }

    const produto = produtos.find(p => p.id === novoItem.produto_id);
    if (!produto) return;

    // Verificar estoque
    try {
      const checkResponse = await axios.post(`${API}/estoque/check-disponibilidade`, {
        produto_id: novoItem.produto_id,
        quantidade: novoItem.quantidade
      });

      if (!checkResponse.data.disponivel) {
        toast.error(checkResponse.data.mensagem, { duration: 5000 });
        return;
      }

      toast.success(`${produto.nome}: ${checkResponse.data.estoque_disponivel} unidades disponíveis`, { duration: 3000 });
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

    setItensVenda([...itensVenda, itemCompleto]);
    
    setNovoItem({
      produto_id: '',
      quantidade: 1,
      preco_unitario: 0
    });

    toast.success('Item adicionado à venda');
  };

  const handleRemoveItem = (index) => {
    const novosItens = itensVenda.filter((_, i) => i !== index);
    setItensVenda(novosItens);
    toast.success('Item removido');
  };

  const calcularTotal = () => {
    const subtotal = itensVenda.reduce((sum, item) => sum + item.subtotal, 0);
    return subtotal - formVenda.desconto + formVenda.frete;
  };

  const handleSubmitVenda = async (e) => {
    e.preventDefault();
    
    if (itensVenda.length === 0) {
      toast.error('Adicione pelo menos um item à venda');
      return;
    }

    if (!formVenda.cliente_id) {
      toast.error('Selecione um cliente');
      return;
    }

    setLoading(true);
    try {
      const itensParaEnvio = itensVenda.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }));

      const payload = {
        cliente_id: formVenda.cliente_id,
        itens: itensParaEnvio,
        desconto: formVenda.desconto,
        frete: formVenda.frete,
        forma_pagamento: formVenda.forma_pagamento
      };

      await axios.post(`${API}/vendas`, payload);
      toast.success('Venda criada com sucesso! Estoque atualizado.');
      fetchData();
      handleCloseCreate();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar venda');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setFormVenda({
      cliente_id: '',
      desconto: 0,
      frete: 0,
      forma_pagamento: 'cartao'
    });
    setItensVenda([]);
    setNovoItem({
      produto_id: '',
      quantidade: 1,
      preco_unitario: 0
    });
  };

  // CANCELAR VENDA
  const handleCancelarVenda = async (vendaId) => {
    const motivo = window.prompt(
      'Esta venda será cancelada e o estoque será devolvido.\n\nDigite o motivo do cancelamento:'
    );
    
    if (!motivo || motivo.trim() === '') {
      toast.error('Motivo do cancelamento é obrigatório');
      return;
    }

    try {
      await axios.post(`${API}/vendas/${vendaId}/cancelar`, { motivo: motivo.trim() });
      toast.success('Venda cancelada e estoque devolvido com sucesso!');
      fetchVendas();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar venda');
    }
  };

  // FILTROS E CÁLCULOS
  const vendasFiltradas = vendas.filter(v => {
    // Busca
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      const cliente = clientes.find(c => c.id === v.cliente_id);
      if (!v.id.toLowerCase().includes(busca) && 
          !cliente?.nome.toLowerCase().includes(busca)) {
        return false;
      }
    }

    // Cliente
    if (filtros.cliente && filtros.cliente !== 'todos' && v.cliente_id !== filtros.cliente) {
      return false;
    }

    // Forma de pagamento
    if (filtros.formaPagamento && filtros.formaPagamento !== 'todas' && v.forma_pagamento !== filtros.formaPagamento) {
      return false;
    }

    // Data início
    if (filtros.dataInicio) {
      const vendaData = new Date(v.created_at);
      const dataInicio = new Date(filtros.dataInicio);
      if (vendaData < dataInicio) return false;
    }

    // Data fim
    if (filtros.dataFim) {
      const vendaData = new Date(v.created_at);
      const dataFim = new Date(filtros.dataFim);
      dataFim.setHours(23, 59, 59);
      if (vendaData > dataFim) return false;
    }

    return true;
  });

  const estatisticas = {
    totalVendas: vendasFiltradas.length,
    faturamentoTotal: vendasFiltradas.reduce((sum, v) => sum + v.total, 0),
    ticketMedio: vendasFiltradas.length > 0 ? 
      vendasFiltradas.reduce((sum, v) => sum + v.total, 0) / vendasFiltradas.length : 0,
    vendasCartao: vendasFiltradas.filter(v => v.forma_pagamento === 'cartao').length,
    vendasPix: vendasFiltradas.filter(v => v.forma_pagamento === 'pix').length,
    vendasDinheiro: vendasFiltradas.filter(v => v.forma_pagamento === 'dinheiro').length,
    vendasBoleto: vendasFiltradas.filter(v => v.forma_pagamento === 'boleto').length
  };

  // Top produtos mais vendidos
  const produtosMaisVendidos = () => {
    const produtosMap = {};
    vendasFiltradas.forEach(venda => {
      venda.itens.forEach(item => {
        if (!produtosMap[item.produto_id]) {
          produtosMap[item.produto_id] = {
            produto_id: item.produto_id,
            quantidade: 0,
            faturamento: 0
          };
        }
        produtosMap[item.produto_id].quantidade += item.quantidade;
        produtosMap[item.produto_id].faturamento += item.quantidade * item.preco_unitario;
      });
    });

    return Object.values(produtosMap)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  };

  const getClienteNome = (clienteId) => {
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente?.nome || 'Cliente não encontrado';
  };

  const getFormaPagamentoColor = (forma) => {
    switch (forma) {
      case 'cartao': return 'bg-blue-100 text-blue-800';
      case 'pix': return 'bg-green-100 text-green-800';
      case 'boleto': return 'bg-orange-100 text-orange-800';
      case 'dinheiro': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFormaPagamentoLabel = (forma) => {
    const labels = {
      cartao: 'Cartão',
      pix: 'PIX',
      boleto: 'Boleto',
      dinheiro: 'Dinheiro'
    };
    return labels[forma] || forma;
  };

  return (
    <div className="page-container" data-testid="vendas-page">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Vendas</h1>
            <p className="text-gray-600">Gestão completa de vendas e faturamento</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} size="lg">
            <Plus className="mr-2" size={20} />
            Nova Venda
          </Button>
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">
            <TrendingUp className="mr-2" size={16} />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="lista">
            <ShoppingCart className="mr-2" size={16} />
            Lista de Vendas
          </TabsTrigger>
          <TabsTrigger value="analises">
            <DollarSign className="mr-2" size={16} />
            Análises
          </TabsTrigger>
        </TabsList>

        {/* TAB: DASHBOARD */}
        <TabsContent value="dashboard">
          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg" style={{backgroundColor: '#2C9AA1'}}>
                    <ShoppingCart className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Total de Vendas</p>
                    <p className="text-2xl font-bold">{estatisticas.totalVendas}</p>
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
                    <p className="text-sm text-gray-600">Faturamento Total</p>
                    <p className="text-2xl font-bold">R$ {estatisticas.faturamentoTotal.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-blue-500">
                    <TrendingUp className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ticket Médio</p>
                    <p className="text-2xl font-bold">R$ {estatisticas.ticketMedio.toFixed(2)}</p>
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
                    <p className="text-2xl font-bold">{new Set(vendasFiltradas.map(v => v.cliente_id)).size}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vendas por Forma de Pagamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Vendas por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard size={20} className="text-blue-600" />
                      <span className="font-medium">Cartão</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{estatisticas.vendasCartao}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign size={20} className="text-green-600" />
                      <span className="font-medium">PIX</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{estatisticas.vendasPix}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar size={20} className="text-orange-600" />
                      <span className="font-medium">Boleto</span>
                    </div>
                    <span className="text-lg font-bold text-orange-600">{estatisticas.vendasBoleto}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <DollarSign size={20} className="text-yellow-600" />
                      <span className="font-medium">Dinheiro</span>
                    </div>
                    <span className="text-lg font-bold text-yellow-600">{estatisticas.vendasDinheiro}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Produtos */}
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Produtos Mais Vendidos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {produtosMaisVendidos().map((item, index) => {
                    const produto = produtos.find(p => p.id === item.produto_id);
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{index + 1}. {produto?.nome || 'Produto'}</p>
                          <p className="text-sm text-gray-600">R$ {item.faturamento.toFixed(2)}</p>
                        </div>
                        <span className="text-lg font-bold" style={{color: '#2C9AA1'}}>{item.quantidade} un</span>
                      </div>
                    );
                  })}
                  {produtosMaisVendidos().length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Nenhuma venda registrada
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: LISTA DE VENDAS */}
        <TabsContent value="lista">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                  <Select value={filtros.cliente} onValueChange={(value) => setFiltros({...filtros, cliente: value === 'todos' ? 'todos' : value})}>
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
                  <Label>Forma de Pagamento</Label>
                  <Select value={filtros.formaPagamento} onValueChange={(value) => setFiltros({...filtros, formaPagamento: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
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

          <div className="mt-6 space-y-4">
            {vendasFiltradas.map((venda) => (
              <Card key={venda.id} data-testid={`venda-${venda.id}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      Venda #{venda.id.slice(0, 8)}
                    </CardTitle>
                    <span className={`badge ${getFormaPagamentoColor(venda.forma_pagamento)}`}>
                      {getFormaPagamentoLabel(venda.forma_pagamento)}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Cliente</p>
                      <p className="font-medium">{getClienteNome(venda.cliente_id)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total</p>
                      <p className="font-medium text-lg" style={{color: '#2C9AA1'}}>R$ {venda.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Data</p>
                      <p className="font-medium">{new Date(venda.created_at).toLocaleString('pt-BR')}</p>
                    </div>
                  </div>

                  {venda.desconto > 0 && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Desconto: <span className="font-medium text-red-600">- R$ {venda.desconto.toFixed(2)}</span></p>
                    </div>
                  )}

                  {venda.frete > 0 && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-600">Frete: <span className="font-medium text-green-600">+ R$ {venda.frete.toFixed(2)}</span></p>
                    </div>
                  )}

                  <div className="mb-4">
                    <p className="text-sm font-semibold mb-2">Itens:</p>
                    <div className="space-y-1">
                      {venda.itens.map((item, idx) => {
                        const produto = produtos.find(p => p.id === item.produto_id);
                        return (
                          <div key={idx} className="text-sm text-gray-600 flex justify-between">
                            <span>{produto?.nome || 'Produto'} x{item.quantidade}</span>
                            <span>R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelarVenda(venda.id)}
                      data-testid={`cancelar-venda-${venda.id}`}
                    >
                      <Ban className="mr-2 text-red-500" size={16} />
                      Cancelar Venda
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {vendasFiltradas.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center text-gray-500">
                  Nenhuma venda encontrada com os filtros selecionados
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: ANÁLISES */}
        <TabsContent value="analises">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Resumo Financeiro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Faturamento Bruto</span>
                    <span className="font-bold text-lg">R$ {(estatisticas.faturamentoTotal + vendasFiltradas.reduce((sum, v) => sum + v.desconto, 0) - vendasFiltradas.reduce((sum, v) => sum + v.frete, 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                    <span className="text-gray-600">Total Descontos</span>
                    <span className="font-bold text-lg text-red-600">- R$ {vendasFiltradas.reduce((sum, v) => sum + v.desconto, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-gray-600">Total Frete</span>
                    <span className="font-bold text-lg text-green-600">+ R$ {vendasFiltradas.reduce((sum, v) => sum + v.frete, 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg" style={{backgroundColor: '#2C9AA1', color: 'white'}}>
                    <span className="font-semibold">Faturamento Líquido</span>
                    <span className="font-bold text-2xl">R$ {estatisticas.faturamentoTotal.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Indicadores de Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Ticket Médio</p>
                    <p className="text-2xl font-bold" style={{color: '#2C9AA1'}}>R$ {estatisticas.ticketMedio.toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Itens por Venda (média)</p>
                    <p className="text-2xl font-bold" style={{color: '#2C9AA1'}}>
                      {vendasFiltradas.length > 0 ? 
                        (vendasFiltradas.reduce((sum, v) => sum + v.itens.length, 0) / vendasFiltradas.length).toFixed(1) : 
                        '0'}
                    </p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Taxa de Desconto Média</p>
                    <p className="text-2xl font-bold" style={{color: '#E76F51'}}>
                      {estatisticas.faturamentoTotal > 0 ? 
                        ((vendasFiltradas.reduce((sum, v) => sum + v.desconto, 0) / (estatisticas.faturamentoTotal + vendasFiltradas.reduce((sum, v) => sum + v.desconto, 0))) * 100).toFixed(1) : 
                        '0'}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog Criar Venda */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Venda</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitVenda} className="space-y-4">
            {/* Cliente e Forma de Pagamento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Cliente *</Label>
                <Select 
                  value={formVenda.cliente_id} 
                  onValueChange={(value) => setFormVenda({...formVenda, cliente_id: value})}
                  required
                >
                  <SelectTrigger>
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
              <div>
                <Label>Forma de Pagamento *</Label>
                <Select 
                  value={formVenda.forma_pagamento} 
                  onValueChange={(value) => setFormVenda({...formVenda, forma_pagamento: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Adicionar Itens */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <h3 className="font-semibold mb-3">Adicionar Produtos</h3>
              <div className="grid grid-cols-12 gap-2 mb-3">
                <div className="col-span-5">
                  <Label>Produto</Label>
                  <Select 
                    value={novoItem.produto_id} 
                    onValueChange={(value) => {
                      const produto = produtos.find(p => p.id === value);
                      setNovoItem({
                        ...novoItem, 
                        produto_id: value,
                        preco_unitario: produto?.preco_venda || 0
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
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
                <div className="col-span-2">
                  <Label>Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={novoItem.quantidade}
                    onChange={(e) => setNovoItem({...novoItem, quantidade: parseInt(e.target.value) || 1})}
                  />
                </div>
                <div className="col-span-3">
                  <Label>Preço Unitário</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={novoItem.preco_unitario}
                    onChange={(e) => setNovoItem({...novoItem, preco_unitario: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="col-span-2 flex items-end">
                  <Button type="button" onClick={handleAddItem} className="w-full">
                    <Plus size={16} />
                  </Button>
                </div>
              </div>

              {/* Lista de Itens */}
              {itensVenda.length > 0 && (
                <div className="space-y-2 mt-4">
                  {itensVenda.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium">{item.produto_nome}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantidade} x R$ {item.preco_unitario.toFixed(2)} = R$ {item.subtotal.toFixed(2)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <X size={16} className="text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Desconto e Frete */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Desconto (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formVenda.desconto}
                  onChange={(e) => setFormVenda({...formVenda, desconto: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div>
                <Label>Frete (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formVenda.frete}
                  onChange={(e) => setFormVenda({...formVenda, frete: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>

            {/* Total */}
            <div className="p-4 rounded-lg" style={{backgroundColor: '#2C9AA1', color: 'white'}}>
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total da Venda:</span>
                <span className="text-3xl font-bold">R$ {calcularTotal().toFixed(2)}</span>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleCloseCreate}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || itensVenda.length === 0}>
                {loading ? 'Criando...' : 'Finalizar Venda'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Vendas;
