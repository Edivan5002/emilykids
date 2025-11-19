import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Power, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Categorias = () => {
  const [categorias, setCategorias] = useState([]);
  const [filteredCategorias, setFilteredCategorias] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [marcaFilter, setMarcaFilter] = useState('todas');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ nome: '', descricao: '', marca_id: '', ativo: true });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nome: '' });
  const [toggleDialog, setToggleDialog] = useState({ open: false, id: null, nome: '', ativo: false });
  
  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 20;

  useEffect(() => {
    fetchCategorias();
    fetchMarcas();
  }, []);

  useEffect(() => {
    let filtered = categorias;

    // Filtro por busca (nome)
    if (searchTerm) {
      filtered = filtered.filter(c =>
        c.nome.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por marca
    if (marcaFilter !== 'todas') {
      filtered = filtered.filter(c => c.marca_id === marcaFilter);
    }

    // Filtro por status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(c => 
        statusFilter === 'ativo' ? c.ativo : !c.ativo
      );
    }

    setFilteredCategorias(filtered);
    setPaginaAtual(1); // Resetar página ao filtrar
  }, [searchTerm, marcaFilter, statusFilter, categorias]);

  const fetchCategorias = async () => {
    try {
      const response = await axios.get(`${API}/categorias?incluir_inativos=true`);
      setCategorias(response.data);
      setFilteredCategorias(response.data);
    } catch (error) {
      toast.error('Erro ao carregar categorias');
    }
  };

  const fetchMarcas = async () => {
    try {
      const response = await axios.get(`${API}/marcas`);
      setMarcas(response.data.filter(m => m.ativo));
    } catch (error) {
      toast.error('Erro ao carregar marcas');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.marca_id) {
      toast.error('Por favor, selecione uma marca');
      return;
    }
    
    try {
      if (isEditing) {
        await axios.put(`${API}/categorias/${editingId}`, formData);
        toast.success('Categoria atualizada com sucesso!');
      } else {
        await axios.post(`${API}/categorias`, formData);
        toast.success('Categoria cadastrada com sucesso!');
      }
      fetchCategorias();
      handleCloseDialog();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao salvar categoria';
      toast.error(errorMsg);
    }
  };

  const handleEdit = (categoria) => {
    setIsEditing(true);
    setEditingId(categoria.id);
    setFormData({ 
      nome: categoria.nome, 
      descricao: categoria.descricao || '', 
      marca_id: categoria.marca_id,
      ativo: categoria.ativo 
    });
    setIsOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/categorias/${deleteDialog.id}`);
      toast.success('Categoria excluída com sucesso!');
      fetchCategorias();
      setDeleteDialog({ open: false, id: null, nome: '' });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Erro ao excluir categoria';
      toast.error(errorMsg);
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await axios.put(`${API}/categorias/${toggleDialog.id}/toggle-status`);
      toast.success(response.data.message);
      fetchCategorias();
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
    setFormData({ nome: '', descricao: '', marca_id: '', ativo: true });
  };

  const getMarcaNome = (marca_id) => {
    const marca = marcas.find(m => m.id === marca_id);
    return marca ? marca.nome : '-';
  };

  // Lógica de paginação
  const totalPaginas = Math.ceil(filteredCategorias.length / ITENS_POR_PAGINA);
  const indiceInicial = (paginaAtual - 1) * ITENS_POR_PAGINA;
  const indiceFinal = indiceInicial + ITENS_POR_PAGINA;
  const categoriasPaginadas = filteredCategorias.slice(indiceInicial, indiceFinal);

  return (
    <div className="page-container" data-testid="categorias-page">
      <div className="flex justify-between items-center mb-6 sm:mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Categorias</h1>
          <p className="text-gray-600">Gerencie as categorias de produtos (vinculadas a marcas)</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-categoria-btn"><Plus className="mr-2" size={18} />Nova Categoria</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Marca *</Label>
                {marcas.length === 0 ? (
                  <p className="text-sm text-red-500 mt-2">⚠️ Nenhuma marca cadastrada. Por favor, cadastre uma marca primeiro.</p>
                ) : (
                  <Select value={formData.marca_id} onValueChange={(value) => setFormData({ ...formData, marca_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {marcas.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                      ))}
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
              <Button type="submit" className="w-full" disabled={marcas.length === 0}>
                {isEditing ? 'Atualizar' : 'Salvar'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtros */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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

      <div className="table-responsive">
        <table className="min-w-full">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Marca</th>
              <th>Descrição</th>
              <th>Status</th>
              <th className="text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {categoriasPaginadas.map((c) => (
              <tr key={c.id}>
                <td className="font-medium">{c.nome}</td>
                <td>{getMarcaNome(c.marca_id)}</td>
                <td>{c.descricao || '-'}</td>
                <td>
                  <span className={`badge ${c.ativo ? 'badge-success' : 'badge-danger'}`}>
                    {c.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(c)} title="Editar">
                      <Edit size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setToggleDialog({ open: true, id: c.id, nome: c.nome, ativo: c.ativo })} 
                      title={c.ativo ? 'Inativar' : 'Ativar'}
                    >
                      <Power size={16} className={c.ativo ? 'text-orange-500' : 'text-green-500'} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteDialog({ open: true, id: c.id, nome: c.nome })} title="Excluir">
                      <Trash2 size={16} className="text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Controles de Paginação */}
      {filteredCategorias.length > ITENS_POR_PAGINA && (
        <div className="mt-4 p-4 border rounded-lg bg-white">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {paginaAtual} de {totalPaginas} | Mostrando {indiceInicial + 1} a {Math.min(indiceFinal, filteredCategorias.length)} de {filteredCategorias.length} categorias
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
              >
                <ChevronLeft size={16} />
                Anterior
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                  <Button
                    key={pagina}
                    variant={paginaAtual === pagina ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaginaAtual(pagina)}
                    className={paginaAtual === pagina ? "bg-blue-600 text-white" : ""}
                  >
                    {pagina}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
              >
                Próxima
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria <strong>{deleteDialog.nome}</strong>?
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
              Tem certeza que deseja {toggleDialog.ativo ? 'inativar' : 'ativar'} a categoria <strong>{toggleDialog.nome}</strong>?
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

export default Categorias;