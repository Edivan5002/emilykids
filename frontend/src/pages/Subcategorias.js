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
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ nome: '', descricao: '', categoria_id: '', ativo: true });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subRes, catRes] = await Promise.all([
        axios.get(`${API}/subcategorias`),
        axios.get(`${API}/categorias`)
      ]);
      setSubcategorias(subRes.data);
      setCategorias(catRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/subcategorias`, formData);
      toast.success('Subcategoria cadastrada!');
      fetchData();
      setIsOpen(false);
      setFormData({ nome: '', descricao: '', categoria_id: '', ativo: true });
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  return (
    <div className="page-container" data-testid="subcategorias-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Subcategorias</h1>
          <p className="text-gray-600">Gerencie as subcategorias de produtos</p>
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
                <Select value={formData.categoria_id} onValueChange={(v) => setFormData({ ...formData, categoria_id: v })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
              <div>
                <Label>Descrição</Label>
                <Input value={formData.descricao} onChange={(e) => setFormData({ ...formData, descricao: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Nome</th><th>Categoria</th><th>Status</th></tr>
          </thead>
          <tbody>
            {subcategorias.map((s) => {
              const cat = categorias.find(c => c.id === s.categoria_id);
              return (
                <tr key={s.id}>
                  <td className="font-medium">{s.nome}</td>
                  <td>{cat?.nome || '-'}</td>
                  <td><span className={`badge ${s.ativo ? 'badge-success' : 'badge-danger'}`}>{s.ativo ? 'Ativo' : 'Inativo'}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Subcategorias;