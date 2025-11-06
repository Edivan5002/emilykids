import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Check, RotateCcw, ClipboardList, Package, AlertCircle, DollarSign } from 'lucide-react';
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orcRes, cliRes, prodRes] = await Promise.all([
        axios.get(`${API}/orcamentos`),
        axios.get(`${API}/clientes`),
        axios.get(`${API}/produtos`)
      ]);
      setOrcamentos(orcRes.data);
      setClientes(cliRes.data);
      setProdutos(prodRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
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
    const formasPagamento = ['cartao', 'pix', 'boleto', 'dinheiro'];
    const forma = prompt(`Forma de pagamento:\n1 - Cartão\n2 - PIX\n3 - Boleto\n4 - Dinheiro\n\nDigite 1, 2, 3 ou 4:`);
    
    const formaMap = { '1': 'cartao', '2': 'pix', '3': 'boleto', '4': 'dinheiro' };
    const formaPagamento = formaMap[forma];
    
    if (!formaPagamento) {
      toast.error('Forma de pagamento inválida');
      return;
    }

    try {
      // Enviar como JSON no corpo da requisição
      await axios.post(`${API}/orcamentos/${orcamentoId}/converter-venda`, {
        forma_pagamento: formaPagamento,
        desconto: null,  // Mantém o desconto do orçamento
        frete: null,     // Mantém o frete do orçamento
        observacoes: null
      });
      toast.success('Orçamento convertido em venda com sucesso!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao converter');
    }
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

  // Estatísticas
  const orcamentosAbertos = orcamentos.filter(o => o.status === 'aberto').length;
  const orcamentosVendidos = orcamentos.filter(o => o.status === 'vendido').length;
  const orcamentosDevolvidos = orcamentos.filter(o => o.status === 'devolvido').length;
  const valorTotalAberto = orcamentos
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

      {/* Lista de Orçamentos */}
      <div className="space-y-4">
        {orcamentos.map((orcamento) => (
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExcluirClick(orcamento)}
                  data-testid={`excluir-${orcamento.id}`}
                >
                  <Trash2 className="mr-2 text-red-500" size={16} />
                  Excluir
                  {user?.papel === 'vendedor' && <Shield className="ml-1" size={12} style={{color: '#E76F51'}} />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {orcamentos.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <ClipboardList size={48} className="mx-auto mb-4 text-gray-400" />
              <p>Nenhum orçamento cadastrado</p>
              <p className="text-sm mt-2">Clique em "Novo Orçamento" para criar</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AutorizacaoModal
        isOpen={showAutorizacao}
        onClose={() => {
          setShowAutorizacao(false);
          setOrcamentoParaExcluir(null);
        }}
        onAutorizado={handleAutorizacaoSucesso}
        acao="excluir este orçamento"
      />
    </div>
  );
};

export default Orcamentos;