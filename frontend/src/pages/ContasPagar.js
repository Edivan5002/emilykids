import React, { useState, useEffect, useRef } from 'react';
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
import { unwrapList, generateIdempotencyKey, parseError, ERROR_CODES } from '../lib/api';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ContasPagar = () => {
  const [loading, setLoading] = useState(true);
  const [contas, setContas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [kpis, setKpis] = useState(null);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    fornecedor_id: '',
    status: '',
    data_inicio: '',
    data_fim: '',
    forma_pagamento: '',
    categoria: '',
    prioridade: ''
  });

  // Modals
  const [modalNovaConta, setModalNovaConta] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState({ open: false, conta: null });
  const [modalPagar, setModalPagar] = useState({ open: false, conta: null, parcela: null });
  const [modalCancelar, setModalCancelar] = useState({ open: false, conta: null });
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 20;

  // Form data
  const [formNovaConta, setFormNovaConta] = useState({
    fornecedor_id: '',
    descricao: '',
    categoria: 'despesa_operacional',
    subcategoria: '',
    valor_total: '',
    forma_pagamento: 'pix',
    tipo_pagamento: 'avista',
    numero_parcelas: 1,
    data_vencimento: '',
    parcelas: [],
    observacao: '',
    tags: [],
    centro_custo: '',
    projeto: '',
    prioridade: 'normal'
  });

  const [formPagar, setFormPagar] = useState({
    numero_parcela: 1,
    valor_pago: '',
    data_pagamento: new Date().toISOString().split('T')[0],
    juros: 0,
    multa: 0,
    desconto: 0,
    forma_pagamento: '',
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
      if (filtros.fornecedor_id) params.append('fornecedor_id', filtros.fornecedor_id);
      if (filtros.status) params.append('status', filtros.status);
      if (filtros.data_inicio) params.append('data_inicio', filtros.data_inicio);
      if (filtros.data_fim) params.append('data_fim', filtros.data_fim);
      if (filtros.forma_pagamento) params.append('forma_pagamento', filtros.forma_pagamento);
      if (filtros.categoria) params.append('categoria', filtros.categoria);
      if (filtros.prioridade) params.append('prioridade', filtros.prioridade);

      const [contasResp, fornecedoresResp, kpisResp] = await Promise.all([
        axios.get(`${API}/contas-pagar?${params.toString()}`, { headers }),
        axios.get(`${API}/fornecedores?incluir_inativos=false`, { headers }),
        axios.get(`${API}/contas-pagar/dashboard/kpis`, { headers })
      ]);

      setContas(contasResp.data.data || contasResp.data);
      setFornecedores(fornecedoresResp.data);
      setKpis(kpisResp.data);
      setPaginaAtual(1); // Resetar página ao buscar/filtrar
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar contas a pagar');
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

      await axios.post(`${API}/contas-pagar`, dados, { headers });
      
      toast.success('Conta a pagar criada com sucesso!');
      setModalNovaConta(false);
      resetFormNovaConta();
      fetchData();
    } catch (error) {
      console.error('Erro ao criar conta:', error);
      toast.error(error.response?.data?.detail || 'Erro ao criar conta');
    }
  };

  const handlePagarParcela = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const dados = {
        ...formPagar,
        valor_pago: parseFloat(formPagar.valor_pago),
        juros: parseFloat(formPagar.juros) || 0,
        multa: parseFloat(formPagar.multa) || 0,
        desconto: parseFloat(formPagar.desconto) || 0
      };

      await axios.post(
        `${API}/contas-pagar/${modalPagar.conta.id}/liquidar-parcela`,
        dados,
        { headers }
      );
      
      toast.success('Parcela paga com sucesso!');
      setModalPagar({ open: false, conta: null, parcela: null });
      resetFormPagar();
      fetchData();
    } catch (error) {
      console.error('Erro ao pagar parcela:', error);
      toast.error(error.response?.data?.detail || 'Erro ao pagar parcela');
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
        `${API}/contas-pagar/${modalCancelar.conta.id}?motivo=${encodeURIComponent(motivoCancelamento)}`,
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
      fornecedor_id: '',
      descricao: '',
      categoria: 'despesa_operacional',
      subcategoria: '',
      valor_total: '',
      forma_pagamento: 'pix',
      tipo_pagamento: 'avista',
      numero_parcelas: 1,
      data_vencimento: '',
      parcelas: [],
      observacao: '',
      tags: [],
      centro_custo: '',
      projeto: '',
      prioridade: 'normal'
    });
  };

  const resetFormPagar = () => {
    setFormPagar({
      numero_parcela: 1,
      valor_pago: '',
      data_pagamento: new Date().toISOString().split('T')[0],
      juros: 0,
      multa: 0,
      desconto: 0,
      forma_pagamento: '',
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
      'pago_parcial': { label: 'Pago Parcial', color: 'bg-blue-100 text-blue-800' },
      'pago_total': { label: 'Pago', color: 'bg-green-100 text-green-800' },
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

  const getPrioridadeBadge = (prioridade) => {
    const prioridadeConfig = {
      'baixa': { label: 'Baixa', color: 'bg-gray-100 text-gray-800' },
      'normal': { label: 'Normal', color: 'bg-blue-100 text-blue-800' },
      'alta': { label: 'Alta', color: 'bg-orange-100 text-orange-800' },
      'urgente': { label: 'Urgente', color: 'bg-red-100 text-red-800' }
    };

    const config = prioridadeConfig[prioridade] || { label: prioridade, color: 'bg-gray-100 text-gray-800' };
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

  // Lógica de paginação
  const totalPaginas = Math.ceil(contas.length / ITENS_POR_PAGINA);
  const indiceInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFinal = indiceInicial + ITENS_POR_PAGINA;
  const contasPaginadas = contas.slice(indiceInicial, indiceFinal);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <TrendingDown className="w-8 h-8 text-red-600" />
              Contas a Pagar
            </h1>
            <p className="text-gray-600 mt-1">Gerencie suas contas a pagar</p>
          </div>
          <Button onClick={() => setModalNovaConta(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Nova Conta
          </Button>
        </div>

        {/* KPIs */}
        {kpis && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total a Pagar</span>
                <DollarSign className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(kpis.total_pagar)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {kpis.quantidade_contas} conta(s)
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Pago</span>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(kpis.total_pago)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Taxa: {kpis.taxa_pagamento?.toFixed(1) || 0}%
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Pendente</span>
                <TrendingDown className="w-5 h-5 text-yellow-500" />
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(kpis.total_pendente)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {kpis.contas_pagas} paga(s)
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Vencido</span>
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(kpis.total_vencido)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {kpis.contas_vencidas} vencida(s)
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Fornecedor</Label>
              <Select 
                value={filtros.fornecedor_id || "todos"} 
                onValueChange={(value) => setFiltros({...filtros, fornecedor_id: value === "todos" ? "" : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {fornecedores.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.razao_social || f.nome}</SelectItem>
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
                  <SelectItem value="pago_parcial">Pago Parcial</SelectItem>
                  <SelectItem value="pago_total">Pago</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select 
                value={filtros.prioridade || "todas"} 
                onValueChange={(value) => setFiltros({...filtros, prioridade: value === "todas" ? "" : value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
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
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
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
              onClick={() => setFiltros({ fornecedor_id: '', status: '', data_inicio: '', data_fim: '', forma_pagamento: '', categoria: '', prioridade: '' })}
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
                  <th className="px-4 py-3 text-left text-sm font-semibold">Fornecedor</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Descrição</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Valor Total</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Pago</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold">Pendente</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Prioridade</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {contas.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                      Nenhuma conta encontrada
                    </td>
                  </tr>
                ) : (
                  contasPaginadas.map((conta) => (
                    <tr key={conta.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono">{conta.numero}</td>
                      <td className="px-4 py-3 text-sm">{conta.fornecedor_nome || '-'}</td>
                      <td className="px-4 py-3 text-sm">{conta.descricao}</td>
                      <td className="px-4 py-3 text-sm text-right font-semibold">
                        {formatCurrency(conta.valor_total)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-semibold">
                        {formatCurrency(conta.valor_pago)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-yellow-600 font-semibold">
                        {formatCurrency(conta.valor_pendente)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getPrioridadeBadge(conta.prioridade)}
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
                          {!conta.cancelada && conta.status !== 'pago_total' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const parcelaPendente = conta.parcelas.find(p => p.status === 'pendente');
                                  if (parcelaPendente) {
                                    setFormPagar({
                                      ...formPagar,
                                      numero_parcela: parcelaPendente.numero_parcela,
                                      valor_pago: parcelaPendente.valor,
                                      forma_pagamento: conta.forma_pagamento
                                    });
                                    setModalPagar({ open: true, conta, parcela: parcelaPendente });
                                  }
                                }}
                                title="Pagar Parcela"
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

          {/* Controles de Paginação */}
          {contas.length > ITENS_POR_PAGINA && (
            <div className="mt-4 p-4 border rounded-lg bg-white">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Página {paginaAtual} de {totalPaginas} | Mostrando {indiceInicial + 1} a {Math.min(indiceFinal, contas.length)} de {contas.length} contas
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
        </div>

        {/* Modal Nova Conta */}
        <Dialog open={modalNovaConta} onOpenChange={setModalNovaConta}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Conta a Pagar</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCriarConta} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Fornecedor</Label>
                  <Select 
                    value={formNovaConta.fornecedor_id || "sem_fornecedor"} 
                    onValueChange={(value) => setFormNovaConta({...formNovaConta, fornecedor_id: value === "sem_fornecedor" ? "" : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sem_fornecedor">Sem fornecedor</SelectItem>
                      {fornecedores.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.razao_social || f.nome}</SelectItem>
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
                    placeholder="Ex: Aluguel da loja - Janeiro 2025"
                  />
                </div>

                <div>
                  <Label>Categoria *</Label>
                  <Select 
                    value={formNovaConta.categoria} 
                    onValueChange={(value) => setFormNovaConta({...formNovaConta, categoria: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="despesa_operacional">Despesa Operacional</SelectItem>
                      <SelectItem value="aluguel">Aluguel</SelectItem>
                      <SelectItem value="salario">Salário</SelectItem>
                      <SelectItem value="fornecedor">Fornecedor</SelectItem>
                      <SelectItem value="outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Prioridade *</Label>
                  <Select 
                    value={formNovaConta.prioridade} 
                    onValueChange={(value) => setFormNovaConta({...formNovaConta, prioridade: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baixa">Baixa</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="urgente">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="boleto">Boleto</SelectItem>
                      <SelectItem value="transferencia">Transferência</SelectItem>
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
            getPrioridadeBadge={getPrioridadeBadge}
          />
        )}

        {/* Modal Pagar Parcela */}
        <Dialog open={modalPagar.open} onOpenChange={(open) => !open && setModalPagar({ open: false, conta: null, parcela: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Pagar Parcela</DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePagarParcela} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Parcela</Label>
                  <Input
                    value={`Parcela ${formPagar.numero_parcela} de ${modalPagar.conta?.numero_parcelas || 1}`}
                    disabled
                  />
                </div>

                <div>
                  <Label>Valor Pago *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPagar.valor_pago}
                    onChange={(e) => setFormPagar({...formPagar, valor_pago: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Data Pagamento *</Label>
                  <Input
                    type="date"
                    value={formPagar.data_pagamento}
                    onChange={(e) => setFormPagar({...formPagar, data_pagamento: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <Label>Juros (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPagar.juros}
                    onChange={(e) => setFormPagar({...formPagar, juros: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Multa (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPagar.multa}
                    onChange={(e) => setFormPagar({...formPagar, multa: e.target.value})}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Desconto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPagar.desconto}
                    onChange={(e) => setFormPagar({...formPagar, desconto: e.target.value})}
                  />
                </div>

                <div className="col-span-2 p-3 bg-gray-50 rounded">
                  <div className="text-sm font-semibold mb-1">Valor Final:</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      (parseFloat(formPagar.valor_pago) || 0) +
                      (parseFloat(formPagar.juros) || 0) +
                      (parseFloat(formPagar.multa) || 0) -
                      (parseFloat(formPagar.desconto) || 0)
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setModalPagar({ open: false, conta: null, parcela: null })}>
                  Cancelar
                </Button>
                <Button type="submit">
                  Confirmar Pagamento
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
const ModalDetalhes = ({ conta, onClose, formatCurrency, formatDate, getStatusBadge, getPrioridadeBadge }) => {
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
              <span className="text-sm text-gray-600">Fornecedor:</span>
              <div className="font-semibold">{conta.fornecedor_nome || 'Não informado'}</div>
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
              <span className="text-sm text-gray-600">Prioridade:</span>
              <div className="mt-1">{getPrioridadeBadge(conta.prioridade)}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Categoria:</span>
              <div className="font-semibold capitalize">{conta.categoria ? conta.categoria.replace('_', ' ') : 'Não informado'}</div>
            </div>
            <div>
              <span className="text-sm text-gray-600">Forma de Pagamento:</span>
              <div className="font-semibold capitalize">{conta.forma_pagamento ? conta.forma_pagamento.replace('_', ' ') : 'Não informado'}</div>
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded">
              <span className="text-sm text-gray-600">Valor Total</span>
              <div className="text-xl font-bold text-blue-600">{formatCurrency(conta.valor_total)}</div>
            </div>
            <div className="p-4 bg-green-50 rounded">
              <span className="text-sm text-gray-600">Pago</span>
              <div className="text-xl font-bold text-green-600">{formatCurrency(conta.valor_pago)}</div>
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
                      {parcela.status === 'pago' && (
                        <>
                          <div>
                            <span className="text-gray-600">Pago:</span>
                            <div className="font-semibold text-green-600">{formatCurrency(parcela.valor_pago)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Data Pag:</span>
                            <div className="font-semibold">{formatDate(parcela.data_pagamento)}</div>
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

export default ContasPagar;
