import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit, Trash2, Power, Search, DollarSign } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import FornecedorFinanceiro from '../components/FornecedorFinanceiro';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Fornecedores = () => {
  const [fornecedores, setFornecedores] = useState([]);
  const [filteredFornecedores, setFilteredFornecedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj: '',
    ie: '',
    telefone: '',
    email: '',
    endereco: {
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: ''
    },
    ativo: true
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nome: '' });
  const [toggleDialog, setToggleDialog] = useState({ open: false, id: null, nome: '', ativo: false });
  const [financeiroDialog, setFinanceiroDialog] = useState({ open: false, id: null, nome: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFornecedores();
  }, []);

  useEffect(() => {
    let filtered = fornecedores;

    // Filtro por busca (razão social ou CNPJ)
    if (searchTerm) {
      filtered = filtered.filter(f =>
        f.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.cnpj.includes(searchTerm)
      );
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(f => 
        statusFilter === 'ativo' ? f.ativo : !f.ativo
      );
    }

    setFilteredFornecedores(filtered);
  }, [searchTerm, statusFilter, fornecedores]);

  const fetchFornecedores = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/fornecedores?incluir_inativos=true&limit=0`);
      setFornecedores(response.data);
      setFilteredFornecedores(response.data);
    } catch (error) {
      toast.error('Erro ao carregar fornecedores. Por favor, tente novamente.');
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
        ie: formData.ie?.trim() || null,
        telefone: formData.telefone?.trim() || null,
        email: formData.email?.trim() || null,
        endereco: formData.endereco && Object.values(formData.endereco).some(v => v?.trim()) 
          ? formData.endereco 
          : null
      };

      if (isEditing) {
        await axios.put(`${API}/fornecedores/${editingId}`, sanitizedData);
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        await axios.post(`${API}/fornecedores`, sanitizedData);
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
      razao_social: fornecedor.razao_social,
      cnpj: fornecedor.cnpj,
      ie: fornecedor.ie || '',
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
      endereco: fornecedor.endereco || {
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: ''
      },
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
      razao_social: '',
      cnpj: '',
      ie: '',
      telefone: '',
      email: '',
      endereco: {
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: ''
      },
      ativo: true
    });
  };

  return (
    <div className="page-container" data-testid="fornecedores-page">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Fornecedores</h1>
          <p className="text-gray-600">Gerencie seus fornecedores</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-fornecedor-btn"><Plus className="mr-2" size={18} />Novo Fornecedor</Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pr-2">
              <div>
                <Label>Razão Social *</Label>
                <Input value={formData.razao_social} onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>CNPJ *</Label>
                  <Input value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} required />
                </div>
                <div>
                  <Label>Inscrição Estadual</Label>
                  <Input value={formData.ie} onChange={(e) => setFormData({ ...formData, ie: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Telefone</Label>
                  <Input value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold">Endereço</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Label>Logradouro</Label>
                    <Input 
                      value={formData.endereco.logradouro} 
                      onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, logradouro: e.target.value }})} 
                    />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input 
                      value={formData.endereco.numero} 
                      onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, numero: e.target.value }})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Complemento</Label>
                    <Input 
                      value={formData.endereco.complemento} 
                      onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, complemento: e.target.value }})} 
                    />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input 
                      value={formData.endereco.bairro} 
                      onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, bairro: e.target.value }})} 
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Cidade</Label>
                    <Input 
                      value={formData.endereco.cidade} 
                      onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, cidade: e.target.value }})} 
                    />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input 
                      value={formData.endereco.estado} 
                      onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, estado: e.target.value }})}
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <Label>CEP</Label>
                    <Input 
                      value={formData.endereco.cep} 
                      onChange={(e) => setFormData({ ...formData, endereco: { ...formData.endereco, cep: e.target.value }})} 
                    />
                  </div>
                </div>
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
            placeholder="Buscar por razão social ou CNPJ..."
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
              <th>Razão Social</th>
              <th className="hidden sm:table-cell">CNPJ</th>
              <th className="hidden md:table-cell">IE</th>
              <th className="hidden lg:table-cell">Telefone</th>
              <th className="hidden lg:table-cell">Email</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-8">
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    <p className="text-gray-600">Carregando fornecedores...</p>
                  </div>
                </td>
              </tr>
            ) : filteredFornecedores.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-8 text-gray-500">
                  Nenhum fornecedor encontrado
                </td>
              </tr>
            ) : (
              filteredFornecedores.map((f) => (
              <tr key={f.id}>
                <td className="font-medium">{f.razao_social}</td>
                <td className="hidden sm:table-cell">{f.cnpj}</td>
                <td className="hidden md:table-cell">{f.ie || '-'}</td>
                <td className="hidden lg:table-cell">{f.telefone || '-'}</td>
                <td className="hidden lg:table-cell">{f.email || '-'}</td>
                <td>
                  <span className={`badge ${f.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {f.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-1 sm:gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setFinanceiroDialog({ open: true, id: f.id, nome: f.razao_social })} 
                      title="Ver Dados Financeiros"
                      className="hidden md:flex"
                    >
                      <DollarSign size={16} className="text-green-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(f)} title="Editar">
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToggleDialog({ open: true, id: f.id, nome: f.razao_social, ativo: f.ativo })}
                      title={f.ativo ? 'Inativar' : 'Ativar'}
                      className="hidden sm:flex"
                    >
                      <Power size={16} className={f.ativo ? 'text-orange-500' : 'text-green-500'} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, id: f.id, nome: f.razao_social })} title="Excluir" className="hidden sm:flex">
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
              <FornecedorFinanceiro 
                fornecedorId={financeiroDialog.id} 
                fornecedorNome={financeiroDialog.nome} 
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fornecedores;