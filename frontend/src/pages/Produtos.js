import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Produtos = () => {
  const [produtos, setProdutos] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [subcategorias, setSubcategorias] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [formData, setFormData] = useState({
    sku: '', nome: '', marca_id: '', categoria_id: '', subcategoria_id: '',
    unidade: 'UN', preco_custo: 0, preco_venda: 0, estoque_minimo: 0, estoque_maximo: 0,
    descricao: '', ativo: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, marcaRes, catRes, subRes] = await Promise.all([
        axios.get(`${API}/produtos`),
        axios.get(`${API}/marcas`),
        axios.get(`${API}/categorias`),
        axios.get(`${API}/subcategorias`)
      ]);
      setProdutos(prodRes.data);
      setMarcas(marcaRes.data);
      setCategorias(catRes.data);
      setSubcategorias(subRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingProduto) {
        await axios.put(`${API}/produtos/${editingProduto.id}`, formData);
        toast.success('Produto atualizado!');
      } else {
        await axios.post(`${API}/produtos`, formData);
        toast.success('Produto cadastrado!');
      }
      fetchData();
      handleClose();
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const handleEdit = (produto) => {
    setEditingProduto(produto);
    setFormData({
      sku: produto.sku,
      nome: produto.nome,
      marca_id: produto.marca_id || '',
      categoria_id: produto.categoria_id || '',
      subcategoria_id: produto.subcategoria_id || '',
      unidade: produto.unidade,
      preco_custo: produto.preco_custo,
      preco_venda: produto.preco_venda,
      estoque_minimo: produto.estoque_minimo,
      estoque_maximo: produto.estoque_maximo,
      descricao: produto.descricao || '',
      ativo: produto.ativo
    });
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setEditingProduto(null);
    setFormData({
      sku: '', nome: '', marca_id: '', categoria_id: '', subcategoria_id: '',
      unidade: 'UN', preco_custo: 0, preco_venda: 0, estoque_minimo: 0, estoque_maximo: 0,
      descricao: '', ativo: true
    });
  };

  return (
    <div className="page-container" data-testid="produtos-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Produtos</h1>
          <p className="text-gray-600">Gerencie o catálogo de produtos</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-produto-btn" onClick={() => setEditingProduto(null)}><Plus className="mr-2" size={18} />Novo Produto</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingProduto ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>SKU *</Label>
                  <Input value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} required />
                </div>
                <div>
                  <Label>Unidade</Label>
                  <Input value={formData.unidade} onChange={(e) => setFormData({ ...formData, unidade: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Marca</Label>
                  <Select value={formData.marca_id} onValueChange={(v) => setFormData({ ...formData, marca_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {marcas.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Categoria</Label>
                  <Select value={formData.categoria_id} onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subcategoria</Label>
                  <Select value={formData.subcategoria_id} onValueChange={(v) => setFormData({ ...formData, subcategoria_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {subcategorias.filter(s => s.categoria_id === formData.categoria_id).map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Preço de Custo *</Label>
                  <Input type="number" step="0.01" value={formData.preco_custo} onChange={(e) => setFormData({ ...formData, preco_custo: parseFloat(e.target.value) })} required />
                </div>
                <div>
                  <Label>Preço de Venda *</Label>
                  <Input type="number" step="0.01" value={formData.preco_venda} onChange={(e) => setFormData({ ...formData, preco_venda: parseFloat(e.target.value) })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Estoque Mínimo</Label>
                  <Input type="number" value={formData.estoque_minimo} onChange={(e) => setFormData({ ...formData, estoque_minimo: parseInt(e.target.value) })} />
                </div>
                <div>
                  <Label>Estoque Máximo</Label>
                  <Input type="number" value={formData.estoque_maximo} onChange={(e) => setFormData({ ...formData, estoque_maximo: parseInt(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">Salvar</Button>
                <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>SKU</th><th>Nome</th><th>Preço Venda</th><th>Estoque</th><th>Status</th><th className="text-right">Ações</th></tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id}>
                <td>{p.sku}</td>
                <td className="font-medium">{p.nome}</td>
                <td>R$ {p.preco_venda.toFixed(2)}</td>
                <td><span className={`badge ${p.estoque_atual <= p.estoque_minimo ? 'badge-danger' : 'badge-success'}`}>{p.estoque_atual}</span></td>
                <td><span className={`badge ${p.ativo ? 'badge-success' : 'badge-danger'}`}>{p.ativo ? 'Ativo' : 'Inativo'}</span></td>
                <td className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(p)}><Edit size={16} /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Produtos;