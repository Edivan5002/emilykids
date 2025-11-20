import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShoppingCart, Plus, DollarSign, TrendingUp, Users, CreditCard, Search, Calendar, X, AlertCircle, Ban, Trash2, Shield, ChevronLeft, ChevronRight, Clock, CheckCircle, FileText, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Componente para exibir Contas a Receber vinculadas à venda
const ContasReceberVinculadas = ({ vendaId }) => {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    const fetchContas = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API}/vendas/${vendaId}/contas-receber`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContas(response.data);
      } catch (error) {
        console.error('Erro ao buscar contas a receber:', error);
        setErro(error.response?.data?.detail || 'Erro ao carregar contas a receber');
      } finally {
        setLoading(false);
      }
    };

    if (vendaId) {
      fetchContas();
    }
  }, [vendaId]);

  if (loading) {
    return (
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <p className="text-sm text-blue-700">Carregando contas a receber...</p>
        </div>
      </div>
    );
  }

  if (erro) {
    return null; // Não exibir erro se não houver permissão ou outro erro
  }

  if (!contas || contas.length === 0) {
    return null; // Não exibir nada se não houver contas vinculadas
  }

  // Calcular totais
  const totalValor = contas.reduce((sum, conta) => sum + conta.valor_total, 0);
  const totalPago = contas.reduce((sum, conta) => sum + (conta.valor_total - conta.valor_pendente), 0);
  const totalPendente = contas.reduce((sum, conta) => sum + conta.valor_pendente, 0);

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-300 rounded-lg">
      <div className="flex items-center gap-2 mb-3">
        <DollarSign size={20} className="text-green-700" />
        <h4 className="font-semibold text-green-900">Contas a Receber Vinculadas</h4>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white p-2 rounded border border-green-200">
          <p className="text-xs text-gray-600">Total</p>
          <p className="text-sm font-bold text-blue-700">R$ {totalValor.toFixed(2)}</p>
        </div>
        <div className="bg-white p-2 rounded border border-green-200">
          <p className="text-xs text-gray-600">Pago</p>
          <p className="text-sm font-bold text-green-600">R$ {totalPago.toFixed(2)}</p>
        </div>
        <div className="bg-white p-2 rounded border border-green-200">
          <p className="text-xs text-gray-600">Pendente</p>
          <p className="text-sm font-bold text-orange-600">R$ {totalPendente.toFixed(2)}</p>
        </div>
      </div>

      {/* Lista de parcelas */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700 mb-2">
          Parcelas ({contas.length})
        </p>
        {contas.map((conta, index) => {
          const parcela = conta.parcelas && conta.parcelas[0];
          const statusIcon = conta.status === 'cancelada' || parcela?.status === 'cancelada' ? 
            <Ban size={14} className="text-red-600" /> :
            parcela?.status === 'paga' ? 
            <CheckCircle size={14} className="text-green-600" /> : 
            <Clock size={14} className="text-orange-600" />;
          const statusLabel = conta.status === 'cancelada' || parcela?.status === 'cancelada' ? 'CANCELADA' :
            parcela?.status === 'paga' ? 'PAGA' : 'PENDENTE';
          const statusColor = conta.status === 'cancelada' || parcela?.status === 'cancelada' ? 'text-red-700 bg-red-100' :
            parcela?.status === 'paga' ? 'text-green-700 bg-green-100' : 'text-orange-700 bg-orange-100';
          
          return (
            <div key={conta.id} className="bg-white p-3 rounded-lg border border-green-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText size={14} className="text-gray-600" />
                    <p className="text-xs font-semibold text-gray-900">
                      {conta.numero || `Conta #${conta.id.slice(0, 8)}`}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded flex items-center gap-1 ${statusColor}`}>
                      {statusIcon}
                      {statusLabel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {conta.descricao}
                  </p>
                  {parcela && (
                    <p className="text-xs text-gray-500 mt-1">
                      Vencimento: {new Date(parcela.data_vencimento).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  {(conta.status === 'cancelada' || parcela?.status === 'cancelada') && conta.motivo_cancelamento && (
                    <p className="text-xs text-red-600 mt-1 italic">
                      Motivo: {conta.motivo_cancelamento}
                    </p>
                  )}
                </div>
                <div className="text-right ml-3">
                  <p className="text-sm font-bold text-gray-900">
                    R$ {conta.valor_total.toFixed(2)}
                  </p>
                  {conta.valor_pendente > 0 && (
                    <p className="text-xs text-orange-600">
                      Pendente: R$ {conta.valor_pendente.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-green-300">
        <p className="text-xs text-gray-600 italic">
          💡 Estas contas foram geradas automaticamente ao finalizar a venda
        </p>
      </div>
    </div>
  );
};

const Vendas = () => {
  const { user } = useAuth();
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cancelDialog, setCancelDialog] = useState({ open: false, vendaId: null, motivo: '' });
  
  // Estados para controle de expansão/colapso
  const [itensExpandidos, setItensExpandidos] = useState({});
  const [contasExpandidas, setContasExpandidas] = useState({});
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 20;

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
    forma_pagamento: 'cartao',
    tipo_pagamento: 'avista',
    numero_parcelas: 1,
    data_vencimento: ''
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

  // Resetar página ao mudar filtros
  useEffect(() => {
    setPaginaAtual(1);
  }, [filtros]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Sempre carregar vendas
      const vendasRes = await axios.get(`${API}/vendas?limit=0`);
      setVendas(vendasRes.data);
      
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
      
      // Tentar carregar marcas
      try {
        const marcasRes = await axios.get(`${API}/marcas?limit=0`);
        setMarcas(marcasRes.data);
      } catch (err) {
        console.log('Sem permissão para marcas');
        setMarcas([]);
      }
      
      // Tentar carregar categorias
      try {
        const catRes = await axios.get(`${API}/categorias?limit=0`);
        setCategorias(catRes.data);
      } catch (err) {
        console.log('Sem permissão para categorias');
        setCategorias([]);
      }
      
      // Tentar carregar subcategorias
      try {
        const subRes = await axios.get(`${API}/subcategorias?limit=0`);
        setSubcategorias(subRes.data);
      } catch (err) {
        console.log('Sem permissão para subcategorias');
        setSubcategorias([]);
      }
    } catch (error) {
      toast.error('Erro ao carregar vendas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // CRIAR VENDA
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
        forma_pagamento: formVenda.forma_pagamento,
        numero_parcelas: formVenda.tipo_pagamento === 'avista' ? 1 : formVenda.numero_parcelas
      };

      const token = localStorage.getItem('token');
      await axios.post(`${API}/vendas`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
      forma_pagamento: 'cartao',
      tipo_pagamento: 'avista',
      numero_parcelas: 1,
      data_vencimento: ''
    });
    setItensVenda([]);
    setNovoItem({
      produto_id: '',
      quantidade: 1,
      preco_unitario: 0
    });
  };

  // CANCELAR VENDA
  const handleCancelarVenda = async () => {
    if (!cancelDialog.motivo || cancelDialog.motivo.trim() === '') {
      toast.error('Motivo do cancelamento é obrigatório');
      return;
    }

    try {
      await axios.post(`${API}/vendas/${cancelDialog.vendaId}/cancelar`, { motivo: cancelDialog.motivo.trim() });
      toast.success('Venda cancelada e estoque devolvido com sucesso!');
      setCancelDialog({ open: false, vendaId: null, motivo: '' });
      fetchData();
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

  // Separar vendas efetivadas e canceladas
  const vendasEfetivadas = vendasFiltradas.filter(v => !v.cancelada && v.status_venda !== 'cancelada');
  const vendasCanceladas = vendasFiltradas.filter(v => v.cancelada || v.status_venda === 'cancelada');

  const estatisticas = {
    totalVendas: vendasFiltradas.length,
    vendasEfetivadas: vendasEfetivadas.length,
    vendasCanceladas: vendasCanceladas.length,
    faturamentoTotal: vendasEfetivadas.reduce((sum, v) => sum + v.total, 0), // Apenas efetivadas
    ticketMedio: vendasEfetivadas.length > 0 ? 
      vendasEfetivadas.reduce((sum, v) => sum + v.total, 0) / vendasEfetivadas.length : 0, // Apenas efetivadas
    vendasCartao: vendasEfetivadas.filter(v => v.forma_pagamento === 'cartao').length,
    vendasPix: vendasEfetivadas.filter(v => v.forma_pagamento === 'pix').length,
    vendasDinheiro: vendasEfetivadas.filter(v => v.forma_pagamento === 'dinheiro').length,
    vendasBoleto: vendasEfetivadas.filter(v => v.forma_pagamento === 'boleto').length
  };

  // Lógica de paginação
  const totalPaginas = Math.ceil(vendasFiltradas.length / ITENS_POR_PAGINA);
  const indiceInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFinal = indiceInicial + ITENS_POR_PAGINA;
  const vendasPaginadas = vendasFiltradas.slice(indiceInicial, indiceFinal);

  // Top produtos mais vendidos (apenas vendas efetivadas)
  const produtosMaisVendidos = () => {
    const produtosMap = {};
    vendasEfetivadas.forEach(venda => {
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
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-green-500">
                    <ShoppingCart className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vendas Efetivadas</p>
                    <p className="text-2xl font-bold">{estatisticas.vendasEfetivadas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg bg-red-500">
                    <Ban className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Vendas Canceladas</p>
                    <p className="text-2xl font-bold">{estatisticas.vendasCanceladas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-lg" style={{backgroundColor: '#2C9AA1'}}>
                    <DollarSign className="text-white" size={24} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Faturamento Total</p>
                    <p className="text-2xl font-bold">R$ {estatisticas.faturamentoTotal.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">Apenas efetivadas</p>
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
                    <p className="text-xs text-gray-500">Apenas efetivadas</p>
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
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                        <div className="flex-1">
                          <p className="font-medium text-blue-700">
                            {index + 1}. {getProdutoDescricaoCompleta(item.produto_id)}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            Faturamento: <span className="font-bold text-green-600">R$ {item.faturamento.toFixed(2)}</span>
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <span className="text-lg font-bold" style={{color: '#2C9AA1'}}>{item.quantidade}</span>
                          <p className="text-xs text-gray-500">unidades</p>
                        </div>
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
            {loading ? (
              <Card>
                <CardContent className="p-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600">Carregando vendas...</p>
                  </div>
                </CardContent>
              </Card>
            ) : vendasFiltradas.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  Nenhuma venda encontrada
                </CardContent>
              </Card>
            ) : (
              vendasPaginadas.map((venda) => (
              <Card key={venda.id} data-testid={`venda-${venda.id}`} className={venda.cancelada || venda.status_venda === 'cancelada' ? 'border-red-300 bg-red-50' : ''}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      Venda #{venda.id.slice(0, 8)}
                      {(venda.cancelada || venda.status_venda === 'cancelada') && (
                        <span className="badge badge-danger flex items-center gap-1">
                          <Ban size={14} />
                          CANCELADA
                        </span>
                      )}
                    </CardTitle>
                    {!venda.cancelada && venda.status_venda !== 'cancelada' && (
                      <span className={`badge ${getFormaPagamentoColor(venda.forma_pagamento)}`}>
                        {getFormaPagamentoLabel(venda.forma_pagamento)}
                      </span>
                    )}
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

                  {/* Informação de Orçamento Convertido */}
                  {venda.orcamento_id && venda.orcamento_id !== '' && venda.orcamento_id !== 'null' ? (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={18} className="text-blue-600" />
                        <div>
                          <p className="text-sm font-semibold text-blue-900">Convertido de Orçamento</p>
                          <p className="text-sm text-blue-700">ID: #{venda.orcamento_id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Itens - Colapsável */}
                  <div className="mb-4">
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded mb-2"
                      onClick={() => setItensExpandidos({...itensExpandidos, [venda.id]: !itensExpandidos[venda.id]})}
                    >
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Package size={16} className="text-blue-600" />
                        Itens ({venda.itens.length})
                      </p>
                      {itensExpandidos[venda.id] ? (
                        <ChevronUp size={20} className="text-gray-600" />
                      ) : (
                        <ChevronDown size={20} className="text-gray-600" />
                      )}
                    </div>
                    {itensExpandidos[venda.id] && (
                      <div className="grid grid-cols-1 gap-2">
                        {venda.itens.map((item, idx) => (
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

                  {/* Contas a Receber Vinculadas - Colapsável (Apenas para vendas não canceladas e parceladas) */}
                  {!venda.cancelada && venda.status_venda !== 'cancelada' && venda.numero_parcelas > 1 && (
                    <div className="mb-4">
                      <div 
                        className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded mb-2"
                        onClick={() => setContasExpandidas({...contasExpandidas, [venda.id]: !contasExpandidas[venda.id]})}
                      >
                        <p className="text-sm font-semibold flex items-center gap-2">
                          <DollarSign size={16} className="text-green-600" />
                          Contas a Receber Vinculadas
                        </p>
                        {contasExpandidas[venda.id] ? (
                          <ChevronUp size={20} className="text-gray-600" />
                        ) : (
                          <ChevronDown size={20} className="text-gray-600" />
                        )}
                      </div>
                      {contasExpandidas[venda.id] && (
                        <ContasReceberVinculadas vendaId={venda.id} />
                      )}
                    </div>
                  )}

                  {/* Motivo do Cancelamento */}
                  {(venda.cancelada || venda.status_venda === 'cancelada') && venda.motivo_cancelamento && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={18} className="text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-900">Motivo do Cancelamento:</p>
                          <p className="text-sm text-red-800">{venda.motivo_cancelamento}</p>
                          {venda.data_cancelamento && (
                            <p className="text-xs text-red-600 mt-1">
                              Cancelada em: {new Date(venda.data_cancelamento).toLocaleString('pt-BR')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Botão de Cancelar - apenas se não estiver cancelada */}
                  {!venda.cancelada && venda.status_venda !== 'cancelada' && (
                    <div className="flex gap-2 justify-end mt-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCancelDialog({ open: true, vendaId: venda.id, motivo: '' })}
                        data-testid={`cancelar-venda-${venda.id}`}
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                      >
                        <Ban className="mr-2" size={16} />
                        Cancelar Venda
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
              ))
            )}
          </div>

          {/* Controles de Paginação */}
          {vendasFiltradas.length > ITENS_POR_PAGINA && (
            <div className="mt-4 p-4 border rounded-lg bg-white">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Página {paginaAtual} de {totalPaginas} | Mostrando {indiceInicial + 1} a {Math.min(indiceFinal, vendasFiltradas.length)} de {vendasFiltradas.length} vendas
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
        <DialogContent className="dialog-responsive max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Venda</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="dados" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dados">Dados da Venda</TabsTrigger>
              <TabsTrigger value="pagamento">Pagamento</TabsTrigger>
              <TabsTrigger value="itens">Itens ({itensVenda.length})</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmitVenda} className="space-y-4">
              {/* ABA: DADOS DA VENDA */}
              <TabsContent value="dados" className="space-y-4">
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

                {itensVenda.length === 0 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Adicione itens e configure o pagamento antes de finalizar a venda
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* ABA: INFORMAÇÕES DE PAGAMENTO */}
              <TabsContent value="pagamento" className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <DollarSign size={18} />
                    Informações de Pagamento
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <Label>Forma de Pagamento *</Label>
                      <Select 
                        value={formVenda.forma_pagamento} 
                        onValueChange={(v) => setFormVenda({ ...formVenda, forma_pagamento: v })}
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

                    <div>
                      <Label>Tipo de Pagamento *</Label>
                      <Select 
                        value={formVenda.tipo_pagamento} 
                        onValueChange={(v) => setFormVenda({ ...formVenda, tipo_pagamento: v, numero_parcelas: v === 'avista' ? 1 : formVenda.numero_parcelas })}
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
                    {formVenda.tipo_pagamento === 'parcelado' && (
                      <div>
                        <Label>Número de Parcelas</Label>
                        <Input
                          type="number"
                          min="2"
                          max="12"
                          value={formVenda.numero_parcelas}
                          onChange={(e) => setFormVenda({ ...formVenda, numero_parcelas: parseInt(e.target.value) || 2 })}
                        />
                      </div>
                    )}
                    <div>
                      <Label>Data de Vencimento {formVenda.tipo_pagamento === 'parcelado' ? '(1ª Parcela)' : ''}</Label>
                      <Input
                        type="date"
                        value={formVenda.data_vencimento}
                        onChange={(e) => setFormVenda({ ...formVenda, data_vencimento: e.target.value })}
                        placeholder="Deixe vazio para 30 dias"
                      />
                      <p className="text-xs text-gray-500 mt-1">Deixe vazio para usar 30 dias após emissão</p>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* ABA: ITENS */}
              <TabsContent value="itens" className="space-y-4">

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
                        <SelectItem key={p.id} value={p.id} className="text-sm">
                          <div className="flex flex-col">
                            <span className="font-medium text-blue-700">{getProdutoDescricaoCompleta(p.id)}</span>
                            <span className="text-xs text-gray-600">R$ {p.preco_venda.toFixed(2)} | Estoque: {p.estoque_atual}</span>
                          </div>
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
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium text-blue-700">{getProdutoDescricaoCompleta(item.produto_id)}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Quantidade: <span className="font-semibold">{item.quantidade}</span> x R$ {item.preco_unitario.toFixed(2)} = <span className="font-bold text-green-600">R$ {item.subtotal.toFixed(2)}</span>
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
            </TabsContent>

              {/* Total e Botões - Fora das abas */}
              <div className="space-y-4 mt-4">
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
                  <Button 
                    type="submit" 
                    disabled={loading || itensVenda.length === 0}
                    style={{backgroundColor: '#2C9AA1'}}
                  >
                    {loading ? 'Criando...' : 'Finalizar Venda'}
                  </Button>
                </div>
              </div>
            </form>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Dialog de Cancelamento */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ ...cancelDialog, open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancelar Venda</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900">
                ⚠️ <strong>Atenção:</strong> Esta ação é irreversível!
              </p>
              <ul className="mt-2 text-sm text-red-800 list-disc list-inside">
                <li>A venda será cancelada</li>
                <li>O estoque será devolvido automaticamente</li>
                <li>Esta ação não pode ser desfeita</li>
              </ul>
            </div>
            <div>
              <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
              <textarea
                id="motivo"
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
                onClick={() => setCancelDialog({ open: false, vendaId: null, motivo: '' })}
              >
                Voltar
              </Button>
              <Button 
                variant="destructive"
                onClick={handleCancelarVenda}
                disabled={!cancelDialog.motivo.trim()}
              >
                Confirmar Cancelamento
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Vendas;
