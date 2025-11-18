import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Power, Search, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import ClienteFinanceiro from '../components/ClienteFinanceiro';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    cpf_cnpj: '',
    telefone: '',
    email: '',
    observacoes: '',
    ativo: true
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nome: '' });
  const [toggleDialog, setToggleDialog] = useState({ open: false, id: null, nome: '', ativo: false });
  const [financeiroDialog, setFinanceiroDialog] = useState({ open: false, id: null, nome: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    let filtered = clientes;

    // Filtro por busca (nome ou CPF/CNPJ)
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cpf_cnpj.includes(searchTerm)
      );
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(c => 
        statusFilter === 'ativo' ? c.ativo : !c.ativo
      );
    }

    setFilteredClientes(filtered);
  }, [searchTerm, statusFilter, clientes]);

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/clientes?incluir_inativos=true&limit=0`);
      setClientes(response.data);
      setFilteredClientes(response.data);
    } catch (error) {
      toast.error('Erro ao carregar clientes. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Sanitizar dados: converter strings vazias para null
      const sanitizedData = {
        ...formData,
        telefone: formData.telefone?.trim() || null,
        email: formData.email?.trim() || null,
        observacoes: formData.observacoes?.trim() || null,
        endereco: formData.endereco && Object.values(formData.endereco).some(v => v?.trim()) 
          ? formData.endereco 
          : null
      };

      if (isEditing) {
        await axios.put(`${API}/clientes/${editingId}`, sanitizedData);
        toast.success('Cliente atualizado com sucesso!');
      } else {
        await axios.post(`${API}/clientes`, sanitizedData);
        toast.success('Cliente cadastrado com sucesso!');
      }
      fetchClientes();
      handleCloseDialog();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao salvar cliente';
      toast.error(errorMsg);
    }
  };

  const handleEdit = (cliente) => {
    setIsEditing(true);
    setEditingId(cliente.id);
    setFormData({
      nome: cliente.nome,
      cpf_cnpj: cliente.cpf_cnpj,
      telefone: cliente.telefone || '',
      email: cliente.email || '',
      observacoes: cliente.observacoes || '',
      ativo: cliente.ativo
    });
    setIsOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/clientes/${deleteDialog.id}`);
      toast.success('Cliente excluído com sucesso!');
      fetchClientes();
      setDeleteDialog({ open: false, id: null, nome: '' });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao excluir cliente';
      toast.error(errorMsg);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await axios.put(`${API}/clientes/${toggleDialog.id}/toggle-status`);
      toast.success(response.data.message);
      fetchClientes();
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
      cpf_cnpj: '',
      telefone: '',
      email: '',
      observacoes: '',
      ativo: true
    });
  };

  return (
    <div className="page-container" data-testid="clientes-page">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Clientes</h1>
          <p className="text-gray-600">Gerencie seus clientes</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-cliente-btn"><Plus className="mr-2" size={18} />Novo Cliente</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Nome *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} required />
              </div>
              <div>
                <Label>CPF/CNPJ *</Label>
                <Input value={formData.cpf_cnpj} onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })} required />
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
                <Label>Observações</Label>
                <Input value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} />
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
            placeholder="Buscar por nome ou CPF/CNPJ..."
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

      <div className="table-responsive">
        <table className="min-w-full">
          <thead>
            <tr>
              <th>Nome</th>
              <th className="hidden sm:table-cell">CPF/CNPJ</th>
              <th className="hidden md:table-cell">Telefone</th>
              <th className="hidden lg:table-cell">Email</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="text-center py-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600">Carregando clientes...</p>
                  </div>
                </td>
              </tr>
            ) : filteredClientes.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-500">
                  Nenhum cliente encontrado
                </td>
              </tr>
            ) : (
              filteredClientes.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.nome}</td>
                <td className="hidden sm:table-cell">{c.cpf_cnpj}</td>
                <td className="hidden md:table-cell">{c.telefone || '-'}</td>
                <td className="hidden lg:table-cell">{c.email || '-'}</td>
                <td>
                  <span className={`badge ${c.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1 sm:gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setFinanceiroDialog({ open: true, id: c.id, nome: c.nome })} 
                      title="Ver Dados Financeiros"
                      className="hidden md:flex"
                    >
                      <DollarSign size={16} className="text-green-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(c)} title="Editar">
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToggleDialog({ open: true, id: c.id, nome: c.nome, ativo: c.ativo })}
                      title={c.ativo ? 'Inativar' : 'Ativar'}
                      className="hidden sm:flex"
                    >
                      <Power size={16} className={c.ativo ? 'text-orange-500' : 'text-green-500'} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, id: c.id, nome: c.nome })} title="Excluir" className="hidden sm:flex">
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{deleteDialog.nome}</strong>?
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
              Tem certeza que deseja {toggleDialog.ativo ? 'inativar' : 'ativar'} o cliente <strong>{toggleDialog.nome}</strong>?
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

      {/* Dialog Financeiro */}
      <Dialog open={financeiroDialog.open} onOpenChange={(open) => setFinanceiroDialog({ ...financeiroDialog, open })}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Dados Financeiros - {financeiroDialog.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {financeiroDialog.id && (
              <ClienteFinanceiro 
                clienteId={financeiroDialog.id} 
                clienteNome={financeiroDialog.nome} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;