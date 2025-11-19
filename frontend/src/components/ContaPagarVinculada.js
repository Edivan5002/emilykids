import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { DollarSign, ExternalLink, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ContaPagarVinculada = ({ notaId }) => {
  const [loading, setLoading] = useState(true);
  const [conta, setConta] = useState(null);
  const navigate = useNavigate();

  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    if (notaId) {
      fetchContaPagar();
    }
  }, [notaId]);

  const fetchContaPagar = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get(
        `${backendUrl}/api/notas-fiscais/${notaId}/conta-pagar`,
        { headers }
      );

      setConta(response.data.conta_pagar);
    } catch (error) {
      console.error('Erro ao carregar conta a pagar:', error);
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
      'pendente': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'pago_parcial': { label: 'Pago Parcial', color: 'bg-blue-100 text-blue-800', icon: DollarSign },
      'pago_total': { label: 'Pago', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'vencido': { label: 'Vencido', color: 'bg-red-100 text-red-800', icon: AlertCircle },
      'cancelado': { label: 'Cancelado', color: 'bg-gray-100 text-gray-800', icon: AlertCircle }
    };

    const config = statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: DollarSign };
    const Icon = config.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm text-blue-700">Carregando informações de pagamento...</span>
        </div>
      </div>
    );
  }

  if (!conta) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-gray-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm">Nenhuma conta a pagar vinculada</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-blue-600" />
          <h4 className="font-semibold text-lg text-gray-800">Conta a Pagar Vinculada</h4>
        </div>
        <button
          onClick={() => navigate('/contas-pagar')}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline"
        >
          Ver no módulo
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
        <div>
          <span className="text-xs text-gray-600">Número</span>
          <div className="font-semibold font-mono text-gray-800">{conta.numero}</div>
        </div>
        <div>
          <span className="text-xs text-gray-600">Status</span>
          <div className="mt-1">
            {getStatusBadge(conta.status)}
          </div>
        </div>
        <div>
          <span className="text-xs text-gray-600">Forma de Pagamento</span>
          <div className="font-semibold text-gray-800 capitalize">
            {conta.forma_pagamento ? conta.forma_pagamento.replace('_', ' ') : 'Não informado'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded p-3 shadow-sm">
          <span className="text-xs text-gray-600">Valor Total</span>
          <div className="font-bold text-blue-600">{formatCurrency(conta.valor_total)}</div>
        </div>
        <div className="bg-white rounded p-3 shadow-sm">
          <span className="text-xs text-gray-600">Valor Pago</span>
          <div className="font-bold text-green-600">{formatCurrency(conta.valor_pago)}</div>
        </div>
        <div className="bg-white rounded p-3 shadow-sm">
          <span className="text-xs text-gray-600">Valor Pendente</span>
          <div className="font-bold text-yellow-600">{formatCurrency(conta.valor_pendente)}</div>
        </div>
      </div>

      {conta.parcelas && conta.parcelas.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">
            Parcelas ({conta.parcelas.length})
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {conta.parcelas.map((parcela, index) => (
              <div key={index} className="bg-white rounded p-2 shadow-sm flex justify-between items-center text-sm">
                <div>
                  <span className="font-semibold">Parcela {parcela.numero_parcela}</span>
                  <span className="text-gray-600 ml-2">Venc: {formatDate(parcela.data_vencimento)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatCurrency(parcela.valor)}</span>
                  {getStatusBadge(parcela.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {conta.observacao && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <span className="text-xs text-gray-600">Observação:</span>
          <div className="text-sm text-gray-700 mt-1">{conta.observacao}</div>
        </div>
      )}
    </div>
  );
};

export default ContaPagarVinculada;
