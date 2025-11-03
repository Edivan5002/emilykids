import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Power } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Fornecedores = () => {
  const [fornecedores, setFornecedores] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    ativo: true
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nome: '' });
  const [toggleDialog, setToggleDialog] = useState({ open: false, id: null, nome: '', ativo: false });

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
      if (isEditing) {
        await axios.put(`${API}/fornecedores/${editingId}`, formData);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await axios.post(`${API}/fornecedores`, formData);
        toast.success('Fornecedor cadastrado com sucesso!');
      }
      fetchFornecedores();
      handleCloseDialog();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao salvar fornecedor';
      toast.error(errorMsg);
    }
  };

  const handleEdit = (fornecedor) => {
    setIsEditing(true);
    setEditingId(fornecedor.id);
    setFormData({
      nome: fornecedor.nome,
      cnpj: fornecedor.cnpj,
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
      endereco: fornecedor.endereco || '',
      ativo: fornecedor.ativo
    });
    setIsOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/fornecedores/${deleteDialog.id}`);
      toast.success('Fornecedor excluído com sucesso!');
      fetchFornecedores();
      setDeleteDialog({ open: false, id: null, nome: '' });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao excluir fornecedor';
      toast.error(errorMsg);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await axios.put(`${API}/fornecedores/${toggleDialog.id}/toggle-status`);
      toast.success(response.data.message);
      fetchFornecedores();
      setToggleDialog({ open: false, id: null, nome: '', ativo: false });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao alterar status';
      toast.error(errorMsg);
    }
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      nome: '',
      cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      ativo: true
    });
  };

  return (
    <div className="page-container" data-testid="fornecedores-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Fornecedores</h1>
          <p className="text-gray-600">Gerencie seus fornecedores</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-fornecedor-btn"><Plus className="mr-2" size={18} />Novo Fornecedor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
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
              <div>
                <Label>Endereço</Label>
                <Input value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">{isEditing ? 'Atualizar' : 'Salvar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CNPJ</th>
              <th>Telefone</th>
              <th>Email</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.map((f) => (
              <tr key={f.id}>
                <td className="font-medium">{f.nome}</td>
                <td>{f.cnpj}</td>
                <td>{f.telefone || '-'}</td>
                <td>{f.email || '-'}</td>
                <td>
                  <span className={`badge ${f.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {f.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(f)} title="Editar">
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToggleDialog({ open: true, id: f.id, nome: f.nome, ativo: f.ativo })}
                      title={f.ativo ? 'Inativar' : 'Ativar'}
                    >
                      <Power size={16} className={f.ativo ? 'text-orange-500' : 'text-green-500'} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, id: f.id, nome: f.nome })} title="Excluir">
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fornecedor <strong>{deleteDialog.nome}</strong>?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Status Dialog */}
      <AlertDialog open={toggleDialog.open} onOpenChange={(open) => setToggleDialog({ ...toggleDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alteração de Status</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {toggleDialog.ativo ? 'inativar' : 'ativar'} o fornecedor <strong>{toggleDialog.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Fornecedores;