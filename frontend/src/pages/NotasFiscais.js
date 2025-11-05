import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, FileText, Check, Trash2, Upload, AlertCircle, Package, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import AutorizacaoModal from '../components/AutorizacaoModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NotasFiscais = () => {
  const { user } = useAuth();
  const [notasFiscais, setNotasFiscais] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    numero: '',
    serie: '',
    fornecedor_id: '',
    data_emissao: '',
    valor_total: 0,
    xml: ''
  });
  
  const [itensNota, setItensNota] = useState([]);
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
      const [nfRes, fornRes, prodRes] = await Promise.all([
        axios.get(`${API}/notas-fiscais`),
        axios.get(`${API}/fornecedores`),
        axios.get(`${API}/produtos`)
      ]);
      setNotasFiscais(nfRes.data);
      setFornecedores(fornRes.data);
      setProdutos(prodRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const handleAddItem = () => {
    if (!novoItem.produto_id || novoItem.quantidade <= 0 || novoItem.preco_unitario <= 0) {
      toast.error('Preencha todos os campos do item');
      return;
    }

    const produto = produtos.find(p => p.id === novoItem.produto_id);
    if (!produto) return;

    const itemCompleto = {
      ...novoItem,
      produto_nome: produto.nome,
      subtotal: novoItem.quantidade * novoItem.preco_unitario
    };

    setItensNota([...itensNota, itemCompleto]);
    
    // Atualizar valor total
    const novoTotal = [...itensNota, itemCompleto].reduce((sum, item) => sum + item.subtotal, 0);
    setFormData({ ...formData, valor_total: novoTotal });

    // Limpar formulário de item
    setNovoItem({
      produto_id: '',
      quantidade: 1,
      preco_unitario: 0
    });

    toast.success('Item adicionado à nota');
  };

  const handleRemoveItem = (index) => {
    const novosItens = itensNota.filter((_, i) => i !== index);
    setItensNota(novosItens);
    
    // Atualizar valor total
    const novoTotal = novosItens.reduce((sum, item) => sum + item.subtotal, 0);
    setFormData({ ...formData, valor_total: novoTotal });
    
    toast.success('Item removido');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (itensNota.length === 0) {
      toast.error('Adicione pelo menos um item à nota fiscal');
      return;
    }

    setLoading(true);
    try {
      // Preparar itens sem informações extras
      const itensParaEnvio = itensNota.map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
      }));

      const payload = {
        ...formData,
        itens: itensParaEnvio
      };

      await axios.post(`${API}/notas-fiscais`, payload);
      toast.success('Nota fiscal cadastrada com sucesso!');
      fetchData();
      handleClose();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cadastrar nota fiscal');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async (notaId) => {
    if (!window.confirm('Confirmar entrada da nota fiscal? O estoque será atualizado.')) return;

    try {
      await axios.post(`${API}/notas-fiscais/${notaId}/confirmar`);
      toast.success('Nota fiscal confirmada e estoque atualizado!');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao confirmar nota');
    }
  };

  const handleCancelar = async (notaId, confirmada) => {
    const motivo = window.prompt(
      confirmada 
        ? 'Esta nota foi confirmada. Ao cancelar, o estoque será revertido.\n\nDigite o motivo do cancelamento:'
        : 'Digite o motivo do cancelamento:'
    );
    
    if (!motivo || motivo.trim() === '') {
      toast.error('Motivo do cancelamento é obrigatório');
      return;
    }

    try {
      await axios.post(`${API}/notas-fiscais/${notaId}/cancelar`, { motivo: motivo.trim() });
      toast.success(
        confirmada 
          ? 'Nota fiscal cancelada e estoque revertido com sucesso!' 
          : 'Nota fiscal cancelada com sucesso!'
      );
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar nota fiscal');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setFormData({
      numero: '',
      serie: '',
      fornecedor_id: '',
      data_emissao: '',
      valor_total: 0,
      xml: ''
    });
    setItensNota([]);
    setNovoItem({
      produto_id: '',
      quantidade: 1,
      preco_unitario: 0
    });
  };

  const getFornecedorNome = (fornecedorId) => {
    const fornecedor = fornecedores.find(f => f.id === fornecedorId);
    return fornecedor?.razao_social || 'Fornecedor não encontrado';
  };

  const getProdutoNome = (produtoId) => {
    const produto = produtos.find(p => p.id === produtoId);
    return produto?.nome || 'Produto';
  };

  // Estatísticas
  const notasConfirmadas = notasFiscais.filter(nf => nf.confirmado).length;
  const notasPendentes = notasFiscais.filter(nf => !nf.confirmado).length;
  const valorTotalConfirmado = notasFiscais
    .filter(nf => nf.confirmado)
    .reduce((sum, nf) => sum + nf.valor_total, 0);

  return (
    <div className="page-container" data-testid="notas-fiscais-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Notas Fiscais de Entrada</h1>
          <p className="text-gray-600">Controle de entrada de produtos por nota fiscal</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-nf-btn" style={{backgroundColor: '#267698'}}>
              <Plus className="mr-2" size={18} />
              Nova Nota Fiscal
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastrar Nota Fiscal de Entrada</DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="dados" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dados">Dados da NF</TabsTrigger>
                <TabsTrigger value="itens">Itens ({itensNota.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="dados" className="space-y-4">
                <form onSubmit={handleSubmit}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Número da NF *</Label>
                      <Input
                        data-testid="nf-numero-input"
                        value={formData.numero}
                        onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Série *</Label>
                      <Input
                        data-testid="nf-serie-input"
                        value={formData.serie}
                        onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label>Fornecedor *</Label>
                    <Select 
                      value={formData.fornecedor_id} 
                      onValueChange={(v) => setFormData({ ...formData, fornecedor_id: v })}
                      required
                    >
                      <SelectTrigger data-testid="nf-fornecedor-select">
                        <SelectValue placeholder="Selecione o fornecedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {fornecedores.map(f => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.razao_social} - {f.cnpj}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <Label>Data de Emissão *</Label>
                      <Input
                        type="date"
                        data-testid="nf-data-input"
                        value={formData.data_emissao}
                        onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Valor Total</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_total}
                        readOnly
                        className="bg-gray-100"
                      />
                    </div>
                  </div>

                  <div className="mb-4">
                    <Label>XML da NF-e (opcional)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".xml"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              setFormData({ ...formData, xml: event.target?.result });
                            };
                            reader.readAsText(file);
                            toast.success('XML carregado');
                          }
                        }}
                      />
                      <Upload size={20} className="text-gray-400" />
                    </div>
                  </div>

                  {itensNota.length === 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800 flex items-center gap-2">
                        <AlertCircle size={16} />
                        Adicione itens na aba "Itens" antes de cadastrar a nota fiscal
                      </p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full"
                    style={{backgroundColor: '#2C9AA1'}}
                    disabled={loading || itensNota.length === 0}
                    data-testid="nf-submit-btn"
                  >
                    {loading ? 'Cadastrando...' : 'Cadastrar Nota Fiscal'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="itens" className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Package size={18} />
                    Adicionar Item
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label className="text-xs">Produto</Label>
                      <Select 
                        value={novoItem.produto_id} 
                        onValueChange={(v) => setNovoItem({ ...novoItem, produto_id: v })}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {produtos.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.nome} - {p.sku}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min="1"
                        value={novoItem.quantidade}
                        onChange={(e) => setNovoItem({ ...novoItem, quantidade: parseInt(e.target.value) })}
                        className="h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Preço Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={novoItem.preco_unitario}
                        onChange={(e) => setNovoItem({ ...novoItem, preco_unitario: parseFloat(e.target.value) })}
                        className="h-9"
                      />
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
                  <h3 className="font-semibold mb-2">Itens Adicionados ({itensNota.length})</h3>
                  {itensNota.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border rounded-lg">
                      Nenhum item adicionado
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {itensNota.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.produto_nome}</p>
                            <p className="text-xs text-gray-600">
                              {item.quantidade} x R$ {item.preco_unitario.toFixed(2)} = R$ {item.subtotal.toFixed(2)}
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
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="font-bold text-right">
                          Total: R$ {itensNota.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total de NFs</p>
                <p className="text-2xl font-bold">{notasFiscais.length}</p>
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
                <p className="text-sm text-gray-600">Confirmadas</p>
                <p className="text-2xl font-bold">{notasConfirmadas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-500">
                <AlertCircle className="text-white" size={24} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendentes</p>
                <p className="text-2xl font-bold">{notasPendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Notas Fiscais */}
      <div className="space-y-4">
        {notasFiscais.map((nota) => (
          <Card key={nota.id} data-testid={`nf-${nota.id}`}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  NF-e {nota.numero} / Série {nota.serie}
                </CardTitle>
                <span className={`badge ${nota.confirmado ? 'badge-success' : 'badge-warning'}`}>
                  {nota.confirmado ? 'CONFIRMADA' : 'PENDENTE'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Fornecedor</p>
                  <p className="font-medium">{getFornecedorNome(nota.fornecedor_id)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data de Emissão</p>
                  <p className="font-medium">{new Date(nota.data_emissao).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Valor Total</p>
                  <p className="font-medium text-lg" style={{color: '#2C9AA1'}}>R$ {nota.valor_total.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Data de Cadastro</p>
                  <p className="font-medium text-sm">{new Date(nota.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold mb-2">Itens ({nota.itens.length}):</p>
                <div className="grid grid-cols-1 gap-2">
                  {nota.itens.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                      <span>{getProdutoNome(item.produto_id)} x{item.quantidade}</span>
                      <span className="font-medium">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {nota.status === 'cancelada' || nota.cancelada ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800 flex items-center gap-2">
                    <AlertCircle size={16} />
                    Nota fiscal cancelada
                    {nota.motivo_cancelamento && (
                      <span className="text-xs ml-2">- {nota.motivo_cancelamento}</span>
                    )}
                  </p>
                </div>
              ) : (
                <>
                  {!nota.confirmado && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConfirmar(nota.id)}
                        style={{backgroundColor: '#2C9AA1'}}
                        data-testid={`confirmar-nf-${nota.id}`}
                      >
                        <Check className="mr-2" size={16} />
                        Confirmar e Atualizar Estoque
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleCancelar(nota.id, nota.confirmado)}
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                        data-testid={`cancelar-nf-${nota.id}`}
                      >
                        <AlertCircle className="mr-2" size={16} />
                        Cancelar
                      </Button>
                    </div>
                  )}

                  {nota.confirmado && (
                    <div className="space-y-3">
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-800 flex items-center gap-2">
                          <Check size={16} />
                          Nota confirmada - Estoque atualizado
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => handleCancelar(nota.id, nota.confirmado)}
                        className="border-orange-500 text-orange-600 hover:bg-orange-50"
                        data-testid={`cancelar-nf-confirmada-${nota.id}`}
                      >
                        <AlertCircle className="mr-2" size={16} />
                        Cancelar Nota Fiscal (Reverter Estoque)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        ))}

        {notasFiscais.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <FileText size={48} className="mx-auto mb-4 text-gray-400" />
              <p>Nenhuma nota fiscal cadastrada</p>
              <p className="text-sm mt-2">Clique em "Nova Nota Fiscal" para cadastrar</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AutorizacaoModal
        isOpen={showAutorizacao}
        onClose={() => {
          setShowAutorizacao(false);
          setNotaParaExcluir(null);
        }}
        onAutorizado={handleAutorizacaoSucesso}
        acao="excluir esta nota fiscal"
      />
    </div>
  );
};

export default NotasFiscais;