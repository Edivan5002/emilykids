import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, Check, RotateCcw, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import AutorizacaoModal from '../components/AutorizacaoModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Orcamentos = () => {
  const { user } = useAuth();
  const [orcamentos, setOrcamentos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [showAutorizacao, setShowAutorizacao] = useState(false);
  const [orcamentoParaExcluir, setOrcamentoParaExcluir] = useState(null);

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

  const handleConverterVenda = async (orcamentoId) => {
    const formaPagamento = prompt('Forma de pagamento (cartao/pix/boleto/dinheiro):');
    if (!formaPagamento) return;

    try {
      await axios.post(`${API}/orcamentos/${orcamentoId}/converter-venda?forma_pagamento=${formaPagamento}`);
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

  const handleExcluirClick = (orcamento) => {
    // Se for admin ou gerente, pode excluir direto
    if (user?.papel === 'admin' || user?.papel === 'gerente') {
      handleExcluirDireto(orcamento.id);
    } else {
      // Vendedor precisa de autorização
      setOrcamentoParaExcluir(orcamento);
      setShowAutorizacao(true);
    }
  };

  const handleExcluirDireto = async (orcamentoId) => {
    if (!window.confirm('Tem certeza que deseja excluir este orçamento?')) return;

    try {
      await axios.delete(`${API}/orcamentos/${orcamentoId}`);
      toast.success('Orçamento excluído com sucesso!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir');
    }
  };

  const handleAutorizacaoSucesso = async (autorizador) => {
    if (orcamentoParaExcluir) {
      try {
        await axios.delete(`${API}/orcamentos/${orcamentoParaExcluir.id}`);
        toast.success(`Orçamento excluído com autorização de ${autorizador.nome}!`);
        fetchData();
        setOrcamentoParaExcluir(null);
      } catch (error) {
        toast.error(error.response?.data?.detail || 'Erro ao excluir');
      }
    }
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

  return (
    <div className="page-container" data-testid="orcamentos-page">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Orçamentos</h1>
        <p className="text-gray-600">Gerencie orçamentos de venda</p>
      </div>

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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Cliente</p>
                  <p className="font-medium">{getClienteNome(orcamento.cliente_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="font-medium text-lg">R$ {orcamento.total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data</p>
                  <p className="font-medium">{new Date(orcamento.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Itens:</p>
                <div className="space-y-1">
                  {orcamento.itens.map((item, idx) => {
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

              <div className="flex gap-2">
                {orcamento.status === 'aberto' && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleConverterVenda(orcamento.id)}
                      style={{ backgroundColor: '#2C9AA1' }}
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
                  {user?.papel === 'vendedor' && <Shield className="ml-1" size={12} />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {orcamentos.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              Nenhum orçamento cadastrado
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