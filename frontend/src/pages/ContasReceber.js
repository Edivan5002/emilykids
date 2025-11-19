import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Plus, 
  Eye, 
  CheckCircle, 
  X,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ContasReceber = () => {
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [kpis, setKpis] = useState(null);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    cliente_id: '',
    status: '',
    data_inicio: '',
    data_fim: '',
    forma_pagamento: ''
  });

  // Modals
  const [modalNovaConta, setModalNovaConta] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState({ open: false, conta: null });
  const [modalReceber, setModalReceber] = useState({ open: false, conta: null, parcela: null });
  const [modalCancelar, setModalCancelar] = useState({ open: false, conta: null });

  // Form data
  const [formNovaConta, setFormNovaConta] = useState({
    cliente_id: '',
    descricao: '',
    categoria: 'venda_produto',
    valor_total: '',
    forma_pagamento: 'pix',
    tipo_pagamento: 'avista',
    numero_parcelas: 1,
    data_vencimento: '',
    parcelas: [],
    observacao: '',
    tags: [],
    centro_custo: '',
    projeto: ''
  });

  const [formReceber, setFormReceber] = useState({
    numero_parcela: 1,
    valor_recebido: '',
    data_recebimento: new Date().toISOString().split('T')[0],
    juros: 0,
    desconto: 0,
    forma_recebimento: '',
    comprovante: '',
    observacao: ''
  });

  const [motivoCancelamento, setMotivoCancelamento] = useState('');

  useEffect(() => {
    fetchData();
  }, [filtros]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Construir query params
      const params = new URLSearchParams();
      if (filtros.cliente_id) params.append('cliente_id', filtros.cliente_id);
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.forma_pagamento) params.append('forma_pagamento', filtros.forma_pagamento);

      const [contasResp, clientesResp, kpisResp] = await Promise.all([
        axios.get(`${API}/contas-receber?${params.toString()}`, { headers }),
        axios.get(`${API}/clientes?incluir_inativos=false`, { headers }),
        axios.get(`${API}/contas-receber/dashboard/kpis`, { headers })
      ]);

      setContas(contasResp.data.data || contasResp.data);
      setClientes(clientesResp.data);
      setKpis(kpisResp.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar contas a receber');
    } finally {
      setLoading(false);
    }
  };

  const handleCriarConta = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      // Preparar dados
      const dados = {
        ...formNovaConta,
        valor_total: parseFloat(formNovaConta.valor_total),
        numero_parcelas: parseInt(formNovaConta.numero_parcelas)
      };

      // Se for parcelado, gerar parcelas
      if (dados.tipo_pagamento === 'parcelado' && dados.numero_parcelas > 1) {
        const valorParcela = dados.valor_total / dados.numero_parcelas;
        const dataBase = new Date(dados.data_vencimento);
        
        dados.parcelas = Array.from({ length: dados.numero_parcelas }, (_, i) => {
          const dataVencimento = new Date(dataBase);
          dataVencimento.setMonth(dataVencimento.getMonth() + i);
          
          return {
            valor: valorParcela,
            data_vencimento: dataVencimento.toISOString().split('T')[0]
          };
        });
      }

      await axios.post(`${API}/contas-receber`, dados, { headers });
      
      toast.success('Conta a receber criada com sucesso!');
      setModalNovaConta(false);
      resetFormNovaConta();
      fetchData();
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast.error(error.response?.data?.detail || 'Erro ao criar conta');
    }
  };

  const handleReceberParcela = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const dados = {
        ...formReceber,
        valor_recebido: parseFloat(formReceber.valor_recebido),
        juros: parseFloat(formReceber.juros) || 0,
        desconto: parseFloat(formReceber.desconto) || 0
      };

      await axios.post(
        `${API}/contas-receber/${modalReceber.conta.id}/receber-parcela`,
        dados,
        { headers }
      );
      
      toast.success('Parcela recebida com sucesso!');
      setModalReceber({ open: false, conta: null, parcela: null });
      resetFormReceber();
      fetchData();
    } catch (error) {
      console.error('Erro ao receber parcela:', error);
      toast.error(error.response?.data?.detail || 'Erro ao receber parcela');
    }
  };

  const handleCancelarConta = async () => {
    if (!motivoCancelamento.trim()) {
      toast.error('Informe o motivo do cancelamento');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      await axios.delete(
        `${API}/contas-receber/${modalCancelar.conta.id}?motivo=${encodeURIComponent(motivoCancelamento)}`,
        { headers }
      );
      
      toast.success('Conta cancelada com sucesso!');
      setModalCancelar({ open: false, conta: null });
      setMotivoCancelamento('');
      fetchData();
    } catch (error) {
      console.error('Erro ao cancelar conta:', error);
      toast.error(error.response?.data?.detail || 'Erro ao cancelar conta');
    }
  };

  const resetFormNovaConta = () => {
    setFormNovaConta({
      cliente_id: '',
      descricao: '',
      categoria: 'venda_produto',
      valor_total: '',
      forma_pagamento: 'pix',
      tipo_pagamento: 'avista',
      numero_parcelas: 1,
      data_vencimento: '',
      parcelas: [],
      observacao: '',
      tags: [],
      centro_custo: '',
      projeto: ''
    });
  };

  const resetFormReceber = () => {
    setFormReceber({
      numero_parcela: 1,
      valor_recebido: '',
      data_recebimento: new Date().toISOString().split('T')[0],
      juros: 0,
      desconto: 0,
      forma_recebimento: '',
      comprovante: '',
      observacao: ''
    });
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'pendente': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      'recebido_parcial': { label: 'Recebido Parcial', color: 'bg-blue-100 text-blue-800' },
      'recebido_total': { label: 'Recebido', color: 'bg-green-100 text-green-800' },
      'vencido': { label: 'Vencido', color: 'bg-red-100 text-red-800' },
      'cancelado': { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded text-xs font-semibold ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-green-600" />
              Contas a Receber
            </h1>
            <p className="text-gray-600 mt-1">Gerencie suas contas a receber</p>
          </div>
          <Button onClick={() => setModalNovaConta(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Conta
          </Button>
        </div>

        {/* KPIs */}
        {kpis && kpis.resumo && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total a Receber</span>
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(kpis.resumo.total_receber)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {kpis.resumo.quantidade_contas} conta(s)
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Recebido</span>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(kpis.resumo.total_recebido)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Taxa: {kpis.resumo.taxa_recebimento?.toFixed(1) || 0}%
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Pendente</span>
                <TrendingDown className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(kpis.resumo.total_pendente)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {kpis.resumo.contas_recebidas} recebida(s)
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Vencido</span>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(kpis.resumo.total_vencido)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {kpis.resumo.contas_vencidas} vencida(s)
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-600" />
            <h3 className="font-semibold">Filtros</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <Label>Cliente</Label>
              <Select 
                value={filtros.cliente_id || "todos"} 
                onValueChange={(value) => setFiltros({...filtros, cliente_id: value === "todos" ? "" : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Status</Label>
              <Select 
                value={filtros.status || "todos"} 
                onValueChange={(value) => setFiltros({...filtros, status: value === "todos" ? "" : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="recebido_parcial">Recebido Parcial</SelectItem>
                  <SelectItem value="recebido_total">Recebido</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Forma de Pagamento</Label>
              <Select 
                value={filtros.forma_pagamento || "todas"} 
                onValueChange={(value) => setFiltros({...filtros, forma_pagamento: value === "todas" ? "" : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
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
              onClick={() => setFiltros({ cliente_id: '', status: '', data_inicio: '', data_fim: '', forma_pagamento: '' })}
            >
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Tabela de Contas */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Número</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Cliente</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Descrição</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Valor Total</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Recebido</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Pendente</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contas.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                      Nenhuma conta encontrada
                    </td>
                  </tr>
                ) : (
                  contas.map((conta) => (
                    <tr key={conta.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{conta.numero}</td>
                      <td className="px-4 py-3 text-sm">{conta.cliente_nome}</td>
                      <td className="px-4 py-3 text-sm">{conta.descricao}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {formatCurrency(conta.valor_total)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">
                        {formatCurrency(conta.valor_recebido)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-yellow-600 font-semibold">
                        {formatCurrency(conta.valor_pendente)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(conta.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setModalDetalhes({ open: true, conta })}
                            title="Ver Detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {!conta.cancelada && conta.status !== 'recebido_total' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const parcelaPendente = conta.parcelas.find(p => p.status === 'pendente');
                                  if (parcelaPendente) {
                                    setFormReceber({
                                      ...formReceber,
                                      numero_parcela: parcelaPendente.numero_parcela,
                                      valor_recebido: parcelaPendente.valor,
                                      forma_recebimento: conta.forma_pagamento
                                    });
                                    setModalReceber({ open: true, conta, parcela: parcelaPendente });
                                  }
                                }}
                                title="Receber Parcela"
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setModalCancelar({ open: true, conta })}
                                title="Cancelar"
                                className="text-red-600"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Nova Conta */}
        <Dialog open={modalNovaConta} onOpenChange={setModalNovaConta}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Conta a Receber</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCriarConta} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Cliente *</Label>
                  <Select 
                    value={formNovaConta.cliente_id} 
                    onValueChange={(value) => setFormNovaConta({...formNovaConta, cliente_id: value})}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <Label>Descrição *</Label>
                  <Input
                    value={formNovaConta.descricao}
                    onChange={(e) => setFormNovaConta({...formNovaConta, descricao: e.target.value})}
                    required
                    placeholder="Ex: Venda de produtos"
                  />
                </div>

                <div>
                  <Label>Valor Total *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formNovaConta.valor_total}
                    onChange={(e) => setFormNovaConta({...formNovaConta, valor_total: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Forma de Pagamento *</Label>
                  <Select 
                    value={formNovaConta.forma_pagamento} 
                    onValueChange={(value) => setFormNovaConta({...formNovaConta, forma_pagamento: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                      <SelectItem value="boleto">Boleto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Tipo de Pagamento *</Label>
                  <Select 
                    value={formNovaConta.tipo_pagamento} 
                    onValueChange={(value) => setFormNovaConta({...formNovaConta, tipo_pagamento: value})}
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

                {formNovaConta.tipo_pagamento === 'parcelado' && (
                  <div>
                    <Label>Número de Parcelas *</Label>
                    <Input
                      type="number"
                      min="2"
                      max="12"
                      value={formNovaConta.numero_parcelas}
                      onChange={(e) => setFormNovaConta({...formNovaConta, numero_parcelas: e.target.value})}
                      required
                    />
                  </div>
                )}

                <div>
                  <Label>Data de Vencimento {formNovaConta.tipo_pagamento === 'parcelado' ? '(1ª Parcela)' : ''} *</Label>
                  <Input
                    type="date"
                    value={formNovaConta.data_vencimento}
                    onChange={(e) => setFormNovaConta({...formNovaConta, data_vencimento: e.target.value})}
                    required
                  />
                </div>

                <div className="col-span-2">
                  <Label>Observação</Label>
                  <Input
                    value={formNovaConta.observacao}
                    onChange={(e) => setFormNovaConta({...formNovaConta, observacao: e.target.value})}
                    placeholder="Observações adicionais"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setModalNovaConta(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Criar Conta
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Detalhes */}
        {modalDetalhes.open && modalDetalhes.conta && (
          <ModalDetalhes 
            conta={modalDetalhes.conta} 
            onClose={() => setModalDetalhes({ open: false, conta: null })}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusBadge={getStatusBadge}
          />
        )}

        {/* Modal Receber Parcela */}
        <Dialog open={modalReceber.open} onOpenChange={(open) => !open && setModalReceber({ open: false, conta: null, parcela: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Receber Parcela</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleReceberParcela} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Parcela</Label>
                  <Input
                    value={`Parcela ${formReceber.numero_parcela} de ${modalReceber.conta?.numero_parcelas || 1}`}
                    disabled
                  />
                </div>

                <div>
                  <Label>Valor Recebido *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formReceber.valor_recebido}
                    onChange={(e) => setFormReceber({...formReceber, valor_recebido: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Data Recebimento *</Label>
                  <Input
                    type="date"
                    value={formReceber.data_recebimento}
                    onChange={(e) => setFormReceber({...formReceber, data_recebimento: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Juros (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formReceber.juros}
                    onChange={(e) => setFormReceber({...formReceber, juros: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Desconto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formReceber.desconto}
                    onChange={(e) => setFormReceber({...formReceber, desconto: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Forma de Recebimento</Label>
                  <Select 
                    value={formReceber.forma_recebimento || "mesma"} 
                    onValueChange={(value) => setFormReceber({...formReceber, forma_recebimento: value === "mesma" ? "" : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Mesma da conta" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mesma">Mesma da conta</SelectItem>
                      <SelectItem value="pix">Pix</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao_credito">Cartão Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão Débito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2 p-3 bg-gray-50 rounded">
                  <div className="text-sm font-semibold mb-1">Valor Final:</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      (parseFloat(formReceber.valor_recebido) || 0) +
                      (parseFloat(formReceber.juros) || 0) -
                      (parseFloat(formReceber.desconto) || 0)
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setModalReceber({ open: false, conta: null, parcela: null })}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Confirmar Recebimento
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal Cancelar */}
        <Dialog open={modalCancelar.open} onOpenChange={(open) => !open && setModalCancelar({ open: false, conta: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar Conta</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Tem certeza que deseja cancelar a conta <strong>{modalCancelar.conta?.numero}</strong>?
              </p>
              
              <div>
                <Label>Motivo do Cancelamento *</Label>
                <Input
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  placeholder="Informe o motivo..."
                  required
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setModalCancelar({ open: false, conta: null })}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleCancelarConta}>
                  Confirmar Cancelamento
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

// Componente Modal Detalhes
const ModalDetalhes = ({ conta, onClose, formatCurrency, formatDate, getStatusBadge }) => {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalhes da Conta - {conta.numero}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
            <div>
              <span className="text-sm text-gray-600">Cliente:</span>
              <div className="font-semibold">{conta.cliente_nome}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Status:</span>
              <div className="mt-1">{getStatusBadge(conta.status)}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Descrição:</span>
              <div className="font-semibold">{conta.descricao}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Categoria:</span>
              <div className="font-semibold capitalize">{conta.categoria.replace('_', ' ')}</div>
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded">
              <span className="text-sm text-gray-600">Valor Total</span>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(conta.valor_total)}</div>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <span className="text-sm text-gray-600">Recebido</span>
              <div className="text-xl font-bold text-green-600">{formatCurrency(conta.valor_recebido)}</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded">
              <span className="text-sm text-gray-600">Pendente</span>
              <div className="text-xl font-bold text-yellow-600">{formatCurrency(conta.valor_pendente)}</div>
            </div>
          </div>

          {/* Parcelas */}
          {conta.parcelas && conta.parcelas.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3">Parcelas ({conta.parcelas.length})</h4>
              <div className="space-y-2">
                {conta.parcelas.map((parcela, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold">Parcela {parcela.numero_parcela}</span>
                        <span className="text-sm text-gray-600 ml-2">
                          Venc: {formatDate(parcela.data_vencimento)}
                        </span>
                      </div>
                      {getStatusBadge(parcela.status)}
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2 text-sm">
                      <div>
                        <span className="text-gray-600">Valor:</span>
                        <div className="font-semibold">{formatCurrency(parcela.valor)}</div>
                      </div>
                      {parcela.status === 'recebido' && (
                        <>
                          <div>
                            <span className="text-gray-600">Recebido:</span>
                            <div className="font-semibold text-green-600">{formatCurrency(parcela.valor_recebido)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Data Rec:</span>
                            <div className="font-semibold">{formatDate(parcela.data_recebimento)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Valor Final:</span>
                            <div className="font-semibold">{formatCurrency(parcela.valor_final)}</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Informações Adicionais */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Forma de Pagamento:</span>
              <div className="font-semibold capitalize">{conta.forma_pagamento ? conta.forma_pagamento.replace('_', ' ') : 'Não informado'}</div>
            </div>
            <div>
              <span className="text-gray-600">Criado em:</span>
              <div className="font-semibold">{formatDate(conta.created_at)}</div>
            </div>
            <div>
              <span className="text-gray-600">Criado por:</span>
              <div className="font-semibold">{conta.created_by_name}</div>
            </div>
            {conta.observacao && (
              <div className="col-span-2">
                <span className="text-gray-600">Observação:</span>
                <div className="font-semibold">{conta.observacao}</div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContasReceber;
