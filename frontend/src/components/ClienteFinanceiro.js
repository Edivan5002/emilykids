import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, TrendingUp, TrendingDown, AlertCircle, Calendar, CreditCard, Activity, X } from 'lucide-react';

const ClienteFinanceiro = ({ clienteId, clienteNome }) => {
  const [loading, setLoading] = useState(true);
  const [dadosFinanceiros, setDadosFinanceiros] = useState(null);
  const [contas, setContas] = useState([]);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    if (clienteId) {
      fetchDadosFinanceiros();
    }
  }, [clienteId]);

  const fetchDadosFinanceiros = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [financeiro Response, contasResponse] = await Promise.all([
        axios.get(`${backendUrl}/api/clientes/${clienteId}/financeiro`, { headers }),
        axios.get(`${backendUrl}/api/clientes/${clienteId}/contas-receber`, { headers })
      ]);

      setDadosFinanceiros(financeiroResponse.data);
      setContas(contasResponse.data.contas);
    } catch (error) {
      console.error('Erro ao carregar dados financeiros:', error);
    } finally {
      setLoading(false);
    }
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
      'recebido_total': { label: 'Pago', color: 'bg-green-100 text-green-800' },
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
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!dadosFinanceiros) {
    return (
      <div className="text-center py-12 text-gray-500">
        Erro ao carregar dados financeiros
      </div>
    );
  }

  const { resumo, score, metricas, formas_pagamento, historico } = dadosFinanceiros;

  return (
    <div className="space-y-6">
      {/* Score de Crédito */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Score de Crédito</h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="#E5E7EB"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke={score.cor}
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${(score.valor / 100) * 352} 352`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold" style={{ color: score.cor }}>
                {score.valor}
              </span>
              <span className="text-xs text-gray-500">de 100</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="mb-3">
              <span className="text-2xl font-bold" style={{ color: score.cor }}>
                {score.classificacao}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Taxa de Pagamento:</span>
                <span className="font-semibold">{metricas.taxa_pagamento}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Taxa de Inadimplência:</span>
                <span className="font-semibold text-red-600">{metricas.taxa_inadimplencia}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Média Dias Pagamento:</span>
                <span className="font-semibold">{metricas.media_dias_pagamento} dias</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Faturado</span>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(resumo.total_faturado)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {resumo.total_contas} conta(s)
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Recebido</span>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(resumo.total_recebido)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {resumo.contas_pagas} conta(s) pagas
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Pendente</span>
            <TrendingDown className="w-5 h-5 text-yellow-500" />
          </div>
          <div className="text-2xl font-bold text-yellow-600">
            {formatCurrency(resumo.total_pendente)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {resumo.contas_pendentes} conta(s)
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Total Vencido</span>
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(resumo.total_vencido)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {resumo.contas_vencidas} conta(s) vencidas
          </div>
        </div>
      </div>

      {/* Formas de Pagamento */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Formas de Pagamento Preferidas</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(formas_pagamento).map(([forma, quantidade]) => (
            <div key={forma} className="text-center p-3 bg-gray-50 rounded">
              <CreditCard className="w-6 h-6 mx-auto mb-2 text-gray-600" />
              <div className="font-semibold text-sm capitalize">{forma}</div>
              <div className="text-xs text-gray-500">{quantidade}x</div>
            </div>
          ))}
        </div>
      </div>

      {/* Histórico Recente */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Histórico Recente</h3>
          <button
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
            className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
          >
            {mostrarHistorico ? 'Ocultar' : 'Ver Todas'}
          </button>
        </div>

        <div className="space-y-3">
          {(mostrarHistorico ? contas : historico).slice(0, mostrarHistorico ? undefined : 5).map((conta) => (
            <div key={conta.id} className="border rounded p-3 hover:bg-gray-50">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-semibold">{conta.numero}</div>
                  <div className="text-sm text-gray-600">{conta.descricao}</div>
                </div>
                {getStatusBadge(conta.status)}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Valor:</span>
                  <div className="font-semibold">{formatCurrency(conta.valor_total)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Recebido:</span>
                  <div className="font-semibold text-green-600">{formatCurrency(conta.valor_recebido)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Pendente:</span>
                  <div className="font-semibold text-yellow-600">{formatCurrency(conta.valor_pendente)}</div>
                </div>
                <div>
                  <span className="text-gray-500">Data:</span>
                  <div className="font-semibold">{formatDate(conta.created_at)}</div>
                </div>
              </div>
              {conta.parcelas && conta.parcelas.length > 1 && (
                <div className="mt-2 pt-2 border-t">
                  <div className="text-xs text-gray-500">
                    {conta.parcelas.filter(p => p.status === 'recebido').length} de {conta.parcelas.length} parcelas pagas
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {contas.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conta a receber encontrada</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClienteFinanceiro;
