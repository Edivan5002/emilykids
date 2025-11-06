import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Power, Search } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Subcategorias = () => {
  const [subcategorias, setSubcategorias] = useState([]);
  const [filteredSubcategorias, setFilteredSubcategorias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('todas');
  const [marcaFilter, setMarcaFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '', categoria_id: '', ativo: true });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nome: '' });
  const [toggleDialog, setToggleDialog] = useState({ open: false, id: null, nome: '', ativo: false });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = subcategorias;

    // Filtro por busca (nome)
    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por categoria
    if (categoriaFilter !== 'todas') {
      filtered = filtered.filter(s => s.categoria_id === categoriaFilter);
    }

    // Filtro por marca (através da categoria)
    if (marcaFilter !== 'todas') {
      const categoriasFiltradasPorMarca = categorias
        .filter(c => c.marca_id === marcaFilter)
        .map(c => c.id);
      filtered = filtered.filter(s => categoriasFiltradasPorMarca.includes(s.categoria_id));
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(s => 
        statusFilter === 'ativo' ? s.ativo : !s.ativo
      );
    }

    setFilteredSubcategorias(filtered);
  }, [searchTerm, categoriaFilter, marcaFilter, statusFilter, subcategorias, categorias]);

  const fetchData = async () => {
    try {
      const [subRes, catRes, marcasRes] = await Promise.all([
        axios.get(`${API}/subcategorias?incluir_inativos=true`),
        axios.get(`${API}/categorias`),
        axios.get(`${API}/marcas`)
      ]);
      setSubcategorias(subRes.data);
      setFilteredSubcategorias(subRes.data);
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
      if (isEditing) {
        await axios.put(`${API}/subcategorias/${editingId}`, formData);
        toast.success('Subcategoria atualizada com sucesso!');
      } else {
        await axios.post(`${API}/subcategorias`, formData);
        toast.success('Subcategoria cadastrada com sucesso!');
      }
      fetchData();
      handleCloseDialog();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao salvar subcategoria';
      toast.error(errorMsg);
    }
  };

  const handleEdit = (subcategoria) => {
    setIsEditing(true);
    setEditingId(subcategoria.id);
    setFormData({
      nome: subcategoria.nome,
      descricao: subcategoria.descricao || '',
      categoria_id: subcategoria.categoria_id,
      ativo: subcategoria.ativo
    });
    setIsOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/subcategorias/${deleteDialog.id}`);
      toast.success('Subcategoria excluída com sucesso!');
      fetchData();
      setDeleteDialog({ open: false, id: null, nome: '' });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao excluir subcategoria';
      toast.error(errorMsg);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await axios.put(`${API}/subcategorias/${toggleDialog.id}/toggle-status`);
      toast.success(response.data.message);
      fetchData();
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
    setFormData({ nome: '', descricao: '', categoria_id: '', ativo: true });
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
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-subcategoria-btn"><Plus className="mr-2" size={18} />Nova Subcategoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Subcategoria' : 'Nova Subcategoria'}</DialogTitle>
            </DialogHeader>
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
              <Button type="submit" className="w-full" disabled={categorias.length === 0}>
                {isEditing ? 'Atualizar' : 'Salvar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {categorias.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={marcaFilter} onValueChange={setMarcaFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Marca" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as marcas</SelectItem>
            {marcas.map(m => (
              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      <div className="table-container overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Marca</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubcategorias.map((s) => (
              <tr key={s.id}>
                <td className="font-medium">{s.nome}</td>
                <td>{getCategoriaNome(s.categoria_id)}</td>
                <td>{getMarcaNome(s.categoria_id)}</td>
                <td>
                  <span className={`badge ${s.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {s.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(s)} title="Editar">
                      <Edit size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setToggleDialog({ open: true, id: s.id, nome: s.nome, ativo: s.ativo })}
                      title={s.ativo ? 'Inativar' : 'Ativar'}
                    >
                      <Power size={16} className={s.ativo ? 'text-orange-500' : 'text-green-500'} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, id: s.id, nome: s.nome })} title="Excluir">
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
              Tem certeza que deseja excluir a subcategoria <strong>{deleteDialog.nome}</strong>?
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
              Tem certeza que deseja {toggleDialog.ativo ? 'inativar' : 'ativar'} a subcategoria <strong>{toggleDialog.nome}</strong>?
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

export default Subcategorias;
