import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Power, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Marcas = () => {
  const [marcas, setMarcas] = useState([]);
  const [filteredMarcas, setFilteredMarcas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', ativo: true });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nome: '' });
  const [toggleDialog, setToggleDialog] = useState({ open: false, id: null, nome: '', ativo: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMarcas();
  }, []);

  useEffect(() => {
    let filtered = marcas;

    // Filtro por busca (nome)
    if (searchTerm) {
      filtered = filtered.filter(m =>
        m.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(m => 
        statusFilter === 'ativo' ? m.ativo : !m.ativo
      );
    }

    setFilteredMarcas(filtered);
  }, [searchTerm, statusFilter, marcas]);

  const fetchMarcas = async () => {
    try {
      const response = await axios.get(`${API}/marcas?incluir_inativos=true`);
      setMarcas(response.data);
      setFilteredMarcas(response.data);
    } catch (error) {
      toast.error('Erro ao carregar marcas');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`${API}/marcas/${editingId}`, formData);
        toast.success('Marca atualizada com sucesso!');
      } else {
        await axios.post(`${API}/marcas`, formData);
        toast.success('Marca cadastrada com sucesso!');
      }
      fetchMarcas();
      handleCloseDialog();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao salvar marca';
      toast.error(errorMsg);
    }
  };

  const handleEdit = (marca) => {
    setIsEditing(true);
    setEditingId(marca.id);
    setFormData({ nome: marca.nome, ativo: marca.ativo });
    setIsOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/marcas/${deleteDialog.id}`);
      toast.success('Marca excluída com sucesso!');
      fetchMarcas();
      setDeleteDialog({ open: false, id: null, nome: '' });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao excluir marca';
      toast.error(errorMsg);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await axios.put(`${API}/marcas/${toggleDialog.id}/toggle-status`);
      toast.success(response.data.message);
      fetchMarcas();
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
    setFormData({ nome: '', ativo: true });
  };

  return (
    <div className="page-container" data-testid="marcas-page">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Marcas</h1>
          <p className="text-gray-600">Gerencie as marcas dos produtos</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-marca-btn"><Plus className="mr-2" size={18} />Nova Marca</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Marca' : 'Nova Marca'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
              <Button type="submit" className="w-full">{isEditing ? 'Atualizar' : 'Salvar'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="ativo">Apenas Ativos</SelectItem>
            <SelectItem value="inativo">Apenas Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredMarcas.map((m) => (
              <tr key={m.id}>
                <td className="font-medium">{m.nome}</td>
                <td>
                  <span className={`badge ${m.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {m.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(m)}
                      title="Editar"
                    >
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToggleDialog({ open: true, id: m.id, nome: m.nome, ativo: m.ativo })}
                      title={m.ativo ? 'Inativar' : 'Ativar'}
                    >
                      <Power size={16} className={m.ativo ? 'text-orange-500' : 'text-green-500'} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteDialog({ open: true, id: m.id, nome: m.nome })}
                      title="Excluir"
                    >
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
              Tem certeza que deseja excluir a marca <strong>{deleteDialog.nome}</strong>?
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
              Tem certeza que deseja {toggleDialog.ativo ? 'inativar' : 'ativar'} a marca <strong>{toggleDialog.nome}</strong>?
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

export default Marcas;