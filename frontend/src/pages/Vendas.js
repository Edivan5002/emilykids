import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, ShoppingCart, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import AutorizacaoModal from '../components/AutorizacaoModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Vendas = () => {
  const { user } = useAuth();
  const [vendas, setVendas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [showAutorizacao, setShowAutorizacao] = useState(false);
  const [vendaParaExcluir, setVendaParaExcluir] = useState(null);

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

  const handleExcluirClick = (venda) => {
    // Se for admin ou gerente, pode excluir direto
    if (user?.papel === 'admin' || user?.papel === 'gerente') {
      handleExcluirDireto(venda.id);
    } else {
      // Vendedor precisa de autorização
      setVendaParaExcluir(venda);
      setShowAutorizacao(true);
    }
  };

  const handleExcluirDireto = async (vendaId) => {
    if (!window.confirm('Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.')) return;

    try {
      await axios.delete(`${API}/vendas/${vendaId}`);
      toast.success('Venda excluída com sucesso!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir venda');
    }
  };

  const handleAutorizacaoSucesso = async (autorizador) => {
    if (vendaParaExcluir) {
      try {
        await axios.delete(`${API}/vendas/${vendaParaExcluir.id}`);
        toast.success(`Venda excluída com autorização de ${autorizador.nome}!`);
        fetchData();
        setVendaParaExcluir(null);
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Erro ao excluir venda');
      }
    }
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

  return (
    <div className="page-container" data-testid="vendas-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Vendas</h1>
        <p className="text-gray-600">Registre e acompanhe as vendas</p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg" style={{backgroundColor: '#2C9AA1'}}>
                <ShoppingCart className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de Vendas</p>
                <p className="text-2xl font-bold">{vendas.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500">
                <ShoppingCart className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Faturamento Total</p>
                <p className="text-2xl font-bold">
                  R$ {vendas.reduce((acc, v) => acc + v.total, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500">
                <ShoppingCart className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Ticket Médio</p>
                <p className="text-2xl font-bold">
                  R$ {vendas.length > 0 ? (vendas.reduce((acc, v) => acc + v.total, 0) / vendas.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {vendas.map((venda) => (
          <Card key={venda.id} data-testid={`venda-${venda.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Venda #{venda.id.slice(0, 8)}
                </CardTitle>
                <span className={`badge ${getFormaPagamentoColor(venda.forma_pagamento)}`}>
                  {venda.forma_pagamento.toUpperCase()}
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
                  onClick={() => handleExcluirClick(venda)}
                  data-testid={`excluir-venda-${venda.id}`}
                >
                  <Trash2 className="mr-2 text-red-500" size={16} />
                  Excluir Venda
                  {user?.papel === 'vendedor' && <Shield className="ml-1" size={12} style={{color: '#E76F51'}} />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {vendas.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              Nenhuma venda registrada
            </CardContent>
          </Card>
        )}
      </div>

      <AutorizacaoModal
        isOpen={showAutorizacao}
        onClose={() => {
          setShowAutorizacao(false);
          setVendaParaExcluir(null);
        }}
        onAutorizado={handleAutorizacaoSucesso}
        acao="excluir esta venda"
      />
    </div>
  );
};

export default Vendas;