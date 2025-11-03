import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Subcategorias = () => {
  const [subcategorias, setSubcategorias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', descricao: '', categoria_id: '', ativo: true });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subRes, catRes, marcasRes] = await Promise.all([
        axios.get(`${API}/subcategorias`),
        axios.get(`${API}/categorias`),
        axios.get(`${API}/marcas`)
      ]);
      setSubcategorias(subRes.data);
      setCategorias(catRes.data.filter(c => c.ativo));
      setMarcas(marcasRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.categoria_id) {
      toast.error('Por favor, selecione uma categoria');
      return;
    }
    
    try {
      await axios.post(`${API}/subcategorias`, formData);
      toast.success('Subcategoria cadastrada!');
      fetchData();
      setIsOpen(false);
      setFormData({ nome: '', descricao: '', categoria_id: '', ativo: true });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao salvar subcategoria';
      toast.error(errorMsg);
    }
  };

  const getCategoriaNome = (categoria_id) => {
    const categoria = categorias.find(c => c.id === categoria_id);
    return categoria ? categoria.nome : '-';
  };

  const getMarcaNome = (categoria_id) => {
    const categoria = categorias.find(c => c.id === categoria_id);
    if (!categoria) return '-';
    const marca = marcas.find(m => m.id === categoria.marca_id);
    return marca ? marca.nome : '-';
  };

  return (
    <div className="page-container" data-testid="subcategorias-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Subcategorias</h1>
          <p className="text-gray-600">Gerencie as subcategorias de produtos (vinculadas a categorias)</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-subcategoria-btn"><Plus className="mr-2" size={18} />Nova Subcategoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Subcategoria</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Categoria *</Label>
                {categorias.length === 0 ? (
                  <p className="text-sm text-red-500 mt-2">⚠️ Nenhuma categoria cadastrada. Por favor, cadastre uma categoria primeiro.</p>
                ) : (
                  <Select value={formData.categoria_id} onValueChange={(v) => setFormData({ ...formData, categoria_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {categorias.map(c => {
                        const marca = marcas.find(m => m.id === c.marca_id);
                        return (
                          <SelectItem key={c.id} value={c.id}>
                            {c.nome} {marca && `(${marca.nome})`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={categorias.length === 0}>Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Nome</th><th>Categoria</th><th>Marca</th><th>Status</th></tr>
          </thead>
          <tbody>
            {subcategorias.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.nome}</td>
                <td>{getCategoriaNome(s.categoria_id)}</td>
                <td>{getMarcaNome(s.categoria_id)}</td>
                <td><span className={`badge ${s.ativo ? 'badge-success' : 'badge-danger'}`}>{s.ativo ? 'Ativo' : 'Inativo'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Subcategorias;