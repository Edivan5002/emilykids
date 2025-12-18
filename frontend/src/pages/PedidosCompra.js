import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ShoppingCart, 
  Plus, 
  Send, 
  Link2, 
  Trash2,
  Package,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CORES = {
  rascunho: 'bg-gray-100 text-gray-700',
  enviado: 'bg-blue-100 text-blue-700',
  parcial: 'bg-yellow-100 text-yellow-700',
  recebido: 'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700'
};

const PedidosCompra = () => {
  const [pedidos, setPedidos] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState({});
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [dialogNovo, setDialogNovo] = useState(false);
  const [dialogVincular, setDialogVincular] = useState({ open: false, pedido: null });
  const [formPedido, setFormPedido] = useState({
    fornecedor_id: '',
    itens: [],
    data_previsao_entrega: '',
    observacoes: ''
  });
  const [novoItem, setNovoItem] = useState({ produto_id: '', quantidade: 1, preco_unitario: 0 });

  useEffect(() => {
    fetchPedidos();
    fetchFornecedores();
    fetchProdutos();
  }, [paginaAtual]);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/pedidos-compra?page=${paginaAtual}&limit=20`);
      setPedidos(response.data.data || []);
      setMeta(response.data.meta || {});
    } catch (error) {
      toast.error('Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const fetchFornecedores = async () => {
    try {
      const response = await axios.get(`${API}/fornecedores?limit=0`);
      const data = response.data?.data || response.data || [];
      setFornecedores(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Erro ao carregar fornecedores');
    }
  };

  const fetchProdutos = async () => {
    try {
      const response = await axios.get(`${API}/produtos?limit=0`);
      const data = response.data?.data || response.data || [];
      setProdutos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.log('Erro ao carregar produtos');
    }
  };

  const adicionarItem = () => {
    if (!novoItem.produto_id || novoItem.quantidade <= 0) {
      toast.error('Selecione um produto e quantidade');
      return;
    }
    const produto = produtos.find(p => p.id === novoItem.produto_id);
    if (!produto) return;

    setFormPedido(prev => ({
      ...prev,
      itens: [...prev.itens, {
        produto_id: novoItem.produto_id,
        produto_nome: produto.nome,
        quantidade: novoItem.quantidade,
        preco_unitario: novoItem.preco_unitario || produto.preco_medio || 0
      }]
    }));
    setNovoItem({ produto_id: '', quantidade: 1, preco_unitario: 0 });
  };

  const removerItem = (index) => {
    setFormPedido(prev => ({
      ...prev,
      itens: prev.itens.filter((_, i) => i !== index)
    }));
  };

  const criarPedido = async () => {
    if (!formPedido.fornecedor_id || formPedido.itens.length === 0) {
      toast.error('Selecione fornecedor e adicione itens');
      return;
    }
    try {
      await axios.post(`${API}/pedidos-compra`, formPedido);
      toast.success('Pedido criado com sucesso!');
      setDialogNovo(false);
      setFormPedido({ fornecedor_id: '', itens: [], data_previsao_entrega: '', observacoes: '' });
      fetchPedidos();
    } catch (error) {
      toast.error('Erro ao criar pedido');
    }
  };

  const enviarPedido = async (pedidoId) => {
    try {
      await axios.put(`${API}/pedidos-compra/${pedidoId}/enviar`);
      toast.success('Pedido enviado ao fornecedor!');
      fetchPedidos();
    } catch (error) {
      toast.error('Erro ao enviar pedido');
    }
  };

  const getFornecedorNome = (id) => fornecedores.find(f => f.id === id)?.razao_social || 'N/A';

  const totalPedido = formPedido.itens.reduce((sum, item) => sum + (item.quantidade * item.preco_unitario), 0);

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="text-blue-600" />
          Pedidos de Compra
        </h1>
        <Button onClick={() => setDialogNovo(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {['rascunho', 'enviado', 'parcial', 'recebido'].map(status => (
          <Card key={status}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${STATUS_CORES[status].split(' ')[0]}`} />
                <div>
                  <p className="text-sm text-gray-600 capitalize">{status}</p>
                  <p className="text-xl font-bold">
                    {pedidos.filter(p => p.status === status).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left">Número</th>
                  <th className="p-3 text-left">Fornecedor</th>
                  <th className="p-3 text-left">Itens</th>
                  <th className="p-3 text-right">Valor Total</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-left">Data</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="p-8 text-center">Carregando...</td></tr>
                ) : pedidos.length === 0 ? (
                  <tr><td colSpan="7" className="p-8 text-center text-gray-500">Nenhum pedido encontrado</td></tr>
                ) : (
                  pedidos.map(p => (
                    <tr key={p.id} className="border-b hover:bg-gray-50">
                      <td className="p-3 font-medium">{p.numero}</td>
                      <td className="p-3">{p.fornecedor_nome || getFornecedorNome(p.fornecedor_id)}</td>
                      <td className="p-3">{p.itens?.length || 0} itens</td>
                      <td className="p-3 text-right">R$ {p.valor_total?.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${STATUS_CORES[p.status]}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-3">{new Date(p.created_at).toLocaleDateString()}</td>
                      <td className="p-3 text-center">
                        <div className="flex gap-1 justify-center">
                          {p.status === 'rascunho' && (
                            <Button variant="ghost" size="sm" onClick={() => enviarPedido(p.id)} title="Enviar">
                              <Send size={16} className="text-blue-600" />
                            </Button>
                          )}
                          {p.status === 'enviado' && (
                            <Button variant="ghost" size="sm" onClick={() => setDialogVincular({ open: true, pedido: p })} title="Vincular NF">
                              <Link2 size={16} className="text-green-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Paginação */}
      {meta.pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-gray-600">Página {paginaAtual} de {meta.pages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={paginaAtual === 1} onClick={() => setPaginaAtual(p => p - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <Button variant="outline" size="sm" disabled={paginaAtual === meta.pages} onClick={() => setPaginaAtual(p => p + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* Dialog Novo Pedido */}
      <Dialog open={dialogNovo} onOpenChange={setDialogNovo}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Pedido de Compra</DialogTitle>
          </DialogHeader>
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Fornecedor *</Label>
                <Select value={formPedido.fornecedor_id} onValueChange={(v) => setFormPedido({...formPedido, fornecedor_id: v})}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {fornecedores.map(f => (
                      <SelectItem key={f.id} value={f.id}>{f.razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Previsão de Entrega</Label>
                <Input type="date" value={formPedido.data_previsao_entrega} onChange={(e) => setFormPedido({...formPedido, data_previsao_entrega: e.target.value})} />
              </div>
            </div>

            {/* Adicionar Itens */}
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Package size={18} /> Itens do Pedido</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                <div className="md:col-span-2">
                  <Select value={novoItem.produto_id} onValueChange={(v) => {
                    const prod = produtos.find(p => p.id === v);
                    setNovoItem({...novoItem, produto_id: v, preco_unitario: prod?.preco_medio || 0});
                  }}>
                    <SelectTrigger><SelectValue placeholder="Selecione produto" /></SelectTrigger>
                    <SelectContent>
                      {produtos.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Input type="number" placeholder="Qtd" value={novoItem.quantidade} onChange={(e) => setNovoItem({...novoItem, quantidade: parseInt(e.target.value) || 0})} />
                <Button onClick={adicionarItem}><Plus size={16} className="mr-1" /> Adicionar</Button>
              </div>

              {/* Lista de Itens */}
              {formPedido.itens.length > 0 ? (
                <div className="space-y-2">
                  {formPedido.itens.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="font-medium">{item.produto_nome}</span>
                        <span className="text-gray-600 ml-2">{item.quantidade} un x R$ {item.preco_unitario.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">R$ {(item.quantidade * item.preco_unitario).toFixed(2)}</span>
                        <Button variant="ghost" size="sm" onClick={() => removerItem(idx)}>
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div className="text-right pt-2 border-t">
                    <span className="text-lg font-bold">Total: R$ {totalPedido.toFixed(2)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">Nenhum item adicionado</p>
              )}
            </div>

            <div>
              <Label>Observações</Label>
              <Input value={formPedido.observacoes} onChange={(e) => setFormPedido({...formPedido, observacoes: e.target.value})} placeholder="Observações do pedido" />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogNovo(false)}>Cancelar</Button>
              <Button onClick={criarPedido}>Criar Pedido</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PedidosCompra;
