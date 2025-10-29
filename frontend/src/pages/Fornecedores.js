import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Fornecedores = () => {
  const [fornecedores, setFornecedores] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ razao_social: '', cnpj: '', telefone: '', email: '' });

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    try {
      const response = await axios.get(`${API}/fornecedores`);
      setFornecedores(response.data);
    } catch (error) {
      toast.error('Erro ao carregar fornecedores');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/fornecedores`, formData);
      toast.success('Fornecedor cadastrado!');
      fetchFornecedores();
      setIsOpen(false);
      setFormData({ razao_social: '', cnpj: '', telefone: '', email: '' });
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  return (
    <div className="page-container" data-testid="fornecedores-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Fornecedores</h1>
          <p className="text-gray-600">Gerencie seus fornecedores</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-fornecedor-btn"><Plus className="mr-2" size={18} />Novo Fornecedor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Fornecedor</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Razão Social *</Label>
                <Input value={formData.razao_social} onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} required />
              </div>
              <div>
                <Label>CNPJ *</Label>
                <Input value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} required />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr><th>Razão Social</th><th>CNPJ</th><th>Telefone</th><th>Email</th></tr>
          </thead>
          <tbody>
            {fornecedores.map((f) => (
              <tr key={f.id}>
                <td className="font-medium">{f.razao_social}</td>
                <td>{f.cnpj}</td>
                <td>{f.telefone || '-'}</td>
                <td>{f.email || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Fornecedores;