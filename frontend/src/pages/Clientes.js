import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Edit, Trash2, Power, Search, DollarSign, ChevronLeft, ChevronRight, 
  CreditCard, Gift, Wallet, User, Building2, MapPin, Phone, Mail, FileText,
  CheckCircle, XCircle, AlertCircle, Loader2, Globe
} from 'lucide-react';
import { toast } from 'sonner';
import ClienteFinanceiro from '../components/ClienteFinanceiro';
import {
  maskCPFCNPJ, maskPhone, maskCEP, maskDate,
  validateCPFCNPJ, validateEmail, validatePhone, validateCEP,
  fetchAddressByCEP, unmask, formatCPFCNPJ, formatPhone,
  ESTADOS_BR, TIPO_PESSOA, detectTipoPessoa
} from '../utils/masks';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  const [filteredClientes, setFilteredClientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('dados');
  const [loadingCEP, setLoadingCEP] = useState(false);
  
  const initialFormData = {
    nome: '',
    cpf_cnpj: '',
    rg_ie: '',
    tipo_pessoa: 'fisica',
    data_nascimento: '',
    telefone: '',
    celular: '',
    email: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: ''
    },
    observacoes: '',
    limite_credito: '',
    ativo: true
  };
  
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nome: '' });
  const [toggleDialog, setToggleDialog] = useState({ open: false, id: null, nome: '', ativo: false });
  const [financeiroDialog, setFinanceiroDialog] = useState({ open: false, id: null, nome: '' });
  const [creditoDialog, setCreditoDialog] = useState({ open: false, cliente: null, limiteCredito: null, creditos: [] });
  const [novoLimite, setNovoLimite] = useState('');
  const [novoCreditoForm, setNovoCreditoForm] = useState({ valor: '', descricao: '', origem: 'manual' });
  const [loading, setLoading] = useState(false);
  
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 20;

  useEffect(() => { fetchClientes(); }, []);

  useEffect(() => {
    let filtered = clientes;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.nome?.toLowerCase().includes(term) ||
        c.cpf_cnpj?.includes(searchTerm.replace(/\D/g, '')) ||
        c.email?.toLowerCase().includes(term) ||
        c.telefone?.includes(searchTerm.replace(/\D/g, ''))
      );
    }
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(c => statusFilter === 'ativo' ? c.ativo : !c.ativo);
    }
    setFilteredClientes(filtered);
    setPaginaAtual(1);
  }, [searchTerm, statusFilter, clientes]);

  const extractData = (response) => {
    const data = response?.data;
    if (data && data.ok !== undefined && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  };

  const fetchClientes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/clientes?incluir_inativos=true&limit=0`);
      const clientesData = extractData(response);
      setClientes(clientesData);
      setFilteredClientes(clientesData);
    } catch (error) {
      toast.error('Erro ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  // === VALIDAÇÃO ===
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome?.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.cpf_cnpj?.trim()) {
      newErrors.cpf_cnpj = 'CPF/CNPJ é obrigatório';
    } else if (!validateCPFCNPJ(formData.cpf_cnpj)) {
      newErrors.cpf_cnpj = 'CPF/CNPJ inválido';
    }
    if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }
    if (formData.telefone && !validatePhone(formData.telefone)) {
      newErrors.telefone = 'Telefone inválido';
    }
    if (formData.celular && !validatePhone(formData.celular)) {
      newErrors.celular = 'Celular inválido';
    }
    if (formData.endereco?.cep && !validateCEP(formData.endereco.cep)) {
      newErrors.cep = 'CEP inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // === BUSCA CEP ===
  const handleCEPSearch = useCallback(async (cep) => {
    if (!cep || unmask(cep).length !== 8) return;
    
    setLoadingCEP(true);
    const address = await fetchAddressByCEP(cep);
    setLoadingCEP(false);
    
    if (address) {
      setFormData(prev => ({
        ...prev,
        endereco: {
          ...prev.endereco,
          logradouro: address.logradouro,
          bairro: address.bairro,
          cidade: address.cidade,
          estado: address.estado,
          complemento: address.complemento || prev.endereco.complemento
        }
      }));
      toast.success('Endereço encontrado!');
    } else {
      toast.error('CEP não encontrado');
    }
  }, []);

  // === HANDLERS DE INPUT COM MÁSCARA ===
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleMaskedInput = (field, value, maskFn) => {
    const masked = maskFn(value);
    handleInputChange(field, masked);
    
    // Detectar tipo de pessoa automaticamente
    if (field === 'cpf_cnpj') {
      const tipo = detectTipoPessoa(value);
      if (tipo) setFormData(prev => ({ ...prev, tipo_pessoa: tipo }));
    }
  };

  const handleEnderecoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      endereco: { ...prev.endereco, [field]: value }
    }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  // === SUBMIT ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('Corrija os erros antes de salvar');
      return;
    }
    
    try {
      const sanitizedData = {
        nome: formData.nome.trim(),
        cpf_cnpj: unmask(formData.cpf_cnpj),
        rg_ie: formData.rg_ie?.trim() || null,
        tipo_pessoa: formData.tipo_pessoa,
        data_nascimento: formData.data_nascimento || null,
        telefone: unmask(formData.telefone) || null,
        celular: unmask(formData.celular) || null,
        email: formData.email?.trim().toLowerCase() || null,
        endereco: formData.endereco?.cep ? {
          cep: unmask(formData.endereco.cep),
          logradouro: formData.endereco.logradouro?.trim() || null,
          numero: formData.endereco.numero?.trim() || null,
          complemento: formData.endereco.complemento?.trim() || null,
          bairro: formData.endereco.bairro?.trim() || null,
          cidade: formData.endereco.cidade?.trim() || null,
          estado: formData.endereco.estado || null
        } : null,
        observacoes: formData.observacoes?.trim() || null,
        limite_credito: formData.limite_credito ? parseFloat(formData.limite_credito) : null,
        ativo: formData.ativo
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
      nome: cliente.nome || '',
      cpf_cnpj: maskCPFCNPJ(cliente.cpf_cnpj || ''),
      rg_ie: cliente.rg_ie || '',
      tipo_pessoa: cliente.tipo_pessoa || detectTipoPessoa(cliente.cpf_cnpj) || 'fisica',
      data_nascimento: cliente.data_nascimento || '',
      telefone: maskPhone(cliente.telefone || ''),
      celular: maskPhone(cliente.celular || ''),
      email: cliente.email || '',
      endereco: {
        cep: maskCEP(cliente.endereco?.cep || ''),
        logradouro: cliente.endereco?.logradouro || '',
        numero: cliente.endereco?.numero || '',
        complemento: cliente.endereco?.complemento || '',
        bairro: cliente.endereco?.bairro || '',
        cidade: cliente.endereco?.cidade || '',
        estado: cliente.endereco?.estado || ''
      },
      observacoes: cliente.observacoes || '',
      limite_credito: cliente.limite_credito || '',
      ativo: cliente.ativo
    });
    setActiveTab('dados');
    setErrors({});
    setIsOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/clientes/${deleteDialog.id}`);
      toast.success('Cliente excluído com sucesso!');
      fetchClientes();
      setDeleteDialog({ open: false, id: null, nome: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir cliente');
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await axios.put(`${API}/clientes/${toggleDialog.id}/toggle-status`);
      toast.success(response.data.message);
      fetchClientes();
      setToggleDialog({ open: false, id: null, nome: '', ativo: false });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao alterar status');
    }
  };

  const handleCloseDialog = () => {
    setIsOpen(false);
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialFormData);
    setErrors({});
    setActiveTab('dados');
  };

  const handleOpenCredito = async (cliente) => {
    try {
      const [limiteRes, creditosRes] = await Promise.all([
        axios.get(`${API}/clientes/${cliente.id}/limite-credito`),
        axios.get(`${API}/clientes/${cliente.id}/creditos`)
      ]);
      setCreditoDialog({ open: true, cliente, limiteCredito: limiteRes.data, creditos: creditosRes.data.creditos || [] });
      setNovoLimite(limiteRes.data.limite_credito || '');
    } catch (error) {
      toast.error('Erro ao carregar dados de crédito');
    }
  };

  const handleAtualizarLimite = async () => {
    try {
      await axios.post(`${API}/clientes/${creditoDialog.cliente.id}/credito`, {
        limite_credito: parseFloat(novoLimite) || 0
      });
      toast.success('Limite de crédito atualizado!');
      handleOpenCredito(creditoDialog.cliente);
      fetchClientes();
    } catch (error) {
      toast.error('Erro ao atualizar limite');
    }
  };

  const handleAdicionarCredito = async () => {
    if (!novoCreditoForm.valor || parseFloat(novoCreditoForm.valor) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }
    try {
      await axios.post(`${API}/clientes/${creditoDialog.cliente.id}/adicionar-credito`, {
        valor: parseFloat(novoCreditoForm.valor),
        descricao: novoCreditoForm.descricao || 'Crédito manual',
        origem: novoCreditoForm.origem
      });
      toast.success('Crédito adicionado!');
      setNovoCreditoForm({ valor: '', descricao: '', origem: 'manual' });
      handleOpenCredito(creditoDialog.cliente);
      fetchClientes();
    } catch (error) {
      toast.error('Erro ao adicionar crédito');
    }
  };

  // Paginação
  const totalPaginas = Math.ceil(filteredClientes.length / ITENS_POR_PAGINA);
  const clientesPaginados = filteredClientes.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

  // Estatísticas
  const stats = {
    total: clientes.length,
    ativos: clientes.filter(c => c.ativo).length,
    inativos: clientes.filter(c => !c.ativo).length,
    pf: clientes.filter(c => unmask(c.cpf_cnpj).length <= 11).length,
    pj: clientes.filter(c => unmask(c.cpf_cnpj).length > 11).length
  };

  // Input com erro
  const InputField = ({ label, field, icon: Icon, mask, required, type = 'text', placeholder, onBlur }) => (
    <div>
      <Label className="flex items-center gap-1">
        {Icon && <Icon size={14} />}
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="relative">
        <Input
          type={type}
          value={formData[field] || ''}
          onChange={(e) => mask ? handleMaskedInput(field, e.target.value, mask) : handleInputChange(field, e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={errors[field] ? 'border-red-500' : ''}
        />
        {errors[field] && (
          <div className="flex items-center gap-1 text-red-500 text-xs mt-1">
            <AlertCircle size={12} />
            {errors[field]}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Gestão completa de clientes</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" style={{backgroundColor: '#2C9AA1'}}>
              <Plus size={20} />Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <User size={20} />
                {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="dados"><User size={14} className="mr-1" />Dados Pessoais</TabsTrigger>
                  <TabsTrigger value="endereco"><MapPin size={14} className="mr-1" />Endereço</TabsTrigger>
                  <TabsTrigger value="outros"><FileText size={14} className="mr-1" />Outros</TabsTrigger>
                </TabsList>

                {/* ABA: DADOS PESSOAIS */}
                <TabsContent value="dados" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <InputField label="Nome Completo / Razão Social" field="nome" icon={User} required placeholder="Digite o nome completo" />
                    </div>
                    
                    <div>
                      <Label className="flex items-center gap-1"><FileText size={14} />Tipo de Pessoa</Label>
                      <Select value={formData.tipo_pessoa} onValueChange={(v) => handleInputChange('tipo_pessoa', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fisica"><User size={14} className="inline mr-1" />Pessoa Física</SelectItem>
                          <SelectItem value="juridica"><Building2 size={14} className="inline mr-1" />Pessoa Jurídica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="flex items-center gap-1">
                        <FileText size={14} />
                        {formData.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'} <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <Input
                          value={formData.cpf_cnpj}
                          onChange={(e) => handleMaskedInput('cpf_cnpj', e.target.value, maskCPFCNPJ)}
                          placeholder={formData.tipo_pessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                          className={errors.cpf_cnpj ? 'border-red-500 pr-8' : 'pr-8'}
                        />
                        {formData.cpf_cnpj && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2">
                            {validateCPFCNPJ(formData.cpf_cnpj) ? 
                              <CheckCircle size={16} className="text-green-500" /> : 
                              <XCircle size={16} className="text-red-500" />}
                          </span>
                        )}
                      </div>
                      {errors.cpf_cnpj && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.cpf_cnpj}</p>}
                    </div>
                    
                    <InputField 
                      label={formData.tipo_pessoa === 'juridica' ? 'Inscrição Estadual' : 'RG'} 
                      field="rg_ie" 
                      placeholder={formData.tipo_pessoa === 'juridica' ? 'Inscrição Estadual' : 'Número do RG'}
                    />
                    
                    {formData.tipo_pessoa === 'fisica' && (
                      <div>
                        <Label>Data de Nascimento</Label>
                        <Input
                          type="date"
                          value={formData.data_nascimento}
                          onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                        />
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><Phone size={16} />Contato</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="flex items-center gap-1"><Phone size={14} />Telefone Fixo</Label>
                        <Input
                          value={formData.telefone}
                          onChange={(e) => handleMaskedInput('telefone', e.target.value, maskPhone)}
                          placeholder="(00) 0000-0000"
                          className={errors.telefone ? 'border-red-500' : ''}
                        />
                        {errors.telefone && <p className="text-red-500 text-xs mt-1">{errors.telefone}</p>}
                      </div>
                      <div>
                        <Label className="flex items-center gap-1"><Phone size={14} />Celular</Label>
                        <Input
                          value={formData.celular}
                          onChange={(e) => handleMaskedInput('celular', e.target.value, maskPhone)}
                          placeholder="(00) 00000-0000"
                          className={errors.celular ? 'border-red-500' : ''}
                        />
                        {errors.celular && <p className="text-red-500 text-xs mt-1">{errors.celular}</p>}
                      </div>
                      <div>
                        <Label className="flex items-center gap-1"><Mail size={14} />E-mail</Label>
                        <Input
                          type="email"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          placeholder="email@exemplo.com"
                          className={errors.email ? 'border-red-500' : ''}
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ABA: ENDEREÇO */}
                <TabsContent value="endereco" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="flex items-center gap-1"><MapPin size={14} />CEP</Label>
                      <div className="flex gap-2">
                        <Input
                          value={formData.endereco?.cep || ''}
                          onChange={(e) => {
                            const masked = maskCEP(e.target.value);
                            handleEnderecoChange('cep', masked);
                          }}
                          onBlur={() => handleCEPSearch(formData.endereco?.cep)}
                          placeholder="00000-000"
                          className={errors.cep ? 'border-red-500' : ''}
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => handleCEPSearch(formData.endereco?.cep)} disabled={loadingCEP}>
                          {loadingCEP ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                        </Button>
                      </div>
                      {errors.cep && <p className="text-red-500 text-xs mt-1">{errors.cep}</p>}
                    </div>
                    <div className="md:col-span-2">
                      <Label>Logradouro</Label>
                      <Input
                        value={formData.endereco?.logradouro || ''}
                        onChange={(e) => handleEnderecoChange('logradouro', e.target.value)}
                        placeholder="Rua, Avenida, etc."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label>Número</Label>
                      <Input
                        value={formData.endereco?.numero || ''}
                        onChange={(e) => handleEnderecoChange('numero', e.target.value)}
                        placeholder="Nº"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label>Complemento</Label>
                      <Input
                        value={formData.endereco?.complemento || ''}
                        onChange={(e) => handleEnderecoChange('complemento', e.target.value)}
                        placeholder="Apto, Sala, etc."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Bairro</Label>
                      <Input
                        value={formData.endereco?.bairro || ''}
                        onChange={(e) => handleEnderecoChange('bairro', e.target.value)}
                        placeholder="Bairro"
                      />
                    </div>
                    <div>
                      <Label>Cidade</Label>
                      <Input
                        value={formData.endereco?.cidade || ''}
                        onChange={(e) => handleEnderecoChange('cidade', e.target.value)}
                        placeholder="Cidade"
                      />
                    </div>
                    <div>
                      <Label>Estado</Label>
                      <Select value={formData.endereco?.estado || ''} onValueChange={(v) => handleEnderecoChange('estado', v)}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {ESTADOS_BR.map(e => <SelectItem key={e.sigla} value={e.sigla}>{e.sigla} - {e.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </TabsContent>

                {/* ABA: OUTROS */}
                <TabsContent value="outros" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-1"><CreditCard size={14} />Limite de Crédito (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.limite_credito}
                        onChange={(e) => handleInputChange('limite_credito', e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="ativo"
                          checked={formData.ativo}
                          onChange={(e) => handleInputChange('ativo', e.target.checked)}
                          className="w-4 h-4"
                        />
                        <Label htmlFor="ativo">Cliente Ativo</Label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) => handleInputChange('observacoes', e.target.value)}
                      placeholder="Observações sobre o cliente..."
                      rows={4}
                    />
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button>
                <Button type="submit" style={{backgroundColor: '#2C9AA1'}}>{isEditing ? 'Atualizar' : 'Cadastrar'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Ativos</p>
          <p className="text-2xl font-bold text-green-600">{stats.ativos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Inativos</p>
          <p className="text-2xl font-bold text-red-600">{stats.inativos}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Pessoa Física</p>
          <p className="text-2xl font-bold text-blue-600">{stats.pf}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-xs text-gray-500">Pessoa Jurídica</p>
          <p className="text-2xl font-bold text-purple-600">{stats.pj}</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Buscar por nome, CPF/CNPJ, e-mail ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3 hidden md:table-cell">CPF/CNPJ</th>
                  <th className="text-left p-3 hidden lg:table-cell">Contato</th>
                  <th className="text-left p-3 hidden xl:table-cell">Cidade/UF</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3 min-w-[180px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />Carregando...
                  </td></tr>
                ) : clientesPaginados.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-500">Nenhum cliente encontrado</td></tr>
                ) : clientesPaginados.map((cliente) => (
                  <tr key={cliente.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {unmask(cliente.cpf_cnpj).length > 11 ? 
                          <Building2 size={16} className="text-purple-500" /> : 
                          <User size={16} className="text-blue-500" />}
                        <div>
                          <p className="font-medium">{cliente.nome}</p>
                          <p className="text-xs text-gray-500 md:hidden">{formatCPFCNPJ(cliente.cpf_cnpj)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell font-mono text-sm">{formatCPFCNPJ(cliente.cpf_cnpj)}</td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="text-sm">
                        {cliente.celular || cliente.telefone ? formatPhone(cliente.celular || cliente.telefone) : '-'}
                        {cliente.email && <p className="text-xs text-gray-500">{cliente.email}</p>}
                      </div>
                    </td>
                    <td className="p-3 hidden xl:table-cell text-sm">
                      {cliente.endereco?.cidade ? `${cliente.endereco.cidade}/${cliente.endereco.estado}` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={cliente.ativo ? 'default' : 'secondary'} className={cliente.ativo ? 'bg-green-500' : ''}>
                        {cliente.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(cliente)} title="Editar">
                          <Edit size={14} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleOpenCredito(cliente)} title="Crédito">
                          <CreditCard size={14} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setFinanceiroDialog({ open: true, id: cliente.id, nome: cliente.nome })} title="Financeiro">
                          <DollarSign size={14} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setToggleDialog({ open: true, id: cliente.id, nome: cliente.nome, ativo: cliente.ativo })} title={cliente.ativo ? 'Desativar' : 'Ativar'}>
                          <Power size={14} />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => setDeleteDialog({ open: true, id: cliente.id, nome: cliente.nome })} title="Excluir">
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <span className="text-sm text-gray-600">
                Mostrando {((paginaAtual - 1) * ITENS_POR_PAGINA) + 1} - {Math.min(paginaAtual * ITENS_POR_PAGINA, filteredClientes.length)} de {filteredClientes.length}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setPaginaAtual(p => p - 1)} disabled={paginaAtual === 1}>
                  <ChevronLeft size={16} />
                </Button>
                <span className="px-3 py-1 text-sm">{paginaAtual} / {totalPaginas}</span>
                <Button size="sm" variant="outline" onClick={() => setPaginaAtual(p => p + 1)} disabled={paginaAtual === totalPaginas}>
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir o cliente <strong>{deleteDialog.nome}</strong>? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={toggleDialog.open} onOpenChange={(open) => setToggleDialog({ ...toggleDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toggleDialog.ativo ? 'Desativar' : 'Ativar'} Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleDialog.ativo ? `Deseja desativar o cliente ${toggleDialog.nome}?` : `Deseja reativar o cliente ${toggleDialog.nome}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>{toggleDialog.ativo ? 'Desativar' : 'Ativar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Crédito */}
      <Dialog open={creditoDialog.open} onOpenChange={(open) => setCreditoDialog({ ...creditoDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CreditCard />Gestão de Crédito - {creditoDialog.cliente?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-xs text-gray-600">Limite de Crédito</p>
                <p className="text-xl font-bold text-blue-600">R$ {(creditoDialog.limiteCredito?.limite_credito || 0).toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-3 rounded">
                <p className="text-xs text-gray-600">Saldo Disponível</p>
                <p className="text-xl font-bold text-green-600">R$ {(creditoDialog.limiteCredito?.saldo_credito || 0).toFixed(2)}</p>
              </div>
            </div>
            <div className="border-t pt-4">
              <Label>Alterar Limite de Crédito</Label>
              <div className="flex gap-2">
                <Input type="number" value={novoLimite} onChange={(e) => setNovoLimite(e.target.value)} placeholder="Novo limite" />
                <Button onClick={handleAtualizarLimite}>Atualizar</Button>
              </div>
            </div>
            <div className="border-t pt-4">
              <Label>Adicionar Crédito Manual</Label>
              <div className="space-y-2">
                <Input type="number" value={novoCreditoForm.valor} onChange={(e) => setNovoCreditoForm({...novoCreditoForm, valor: e.target.value})} placeholder="Valor" />
                <Input value={novoCreditoForm.descricao} onChange={(e) => setNovoCreditoForm({...novoCreditoForm, descricao: e.target.value})} placeholder="Descrição" />
                <Button onClick={handleAdicionarCredito} className="w-full"><Gift className="mr-2" size={16} />Adicionar Crédito</Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Financeiro */}
      <Dialog open={financeiroDialog.open} onOpenChange={(open) => setFinanceiroDialog({ ...financeiroDialog, open })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle><DollarSign className="inline mr-2" />Financeiro - {financeiroDialog.nome}</DialogTitle></DialogHeader>
          {financeiroDialog.id && <ClienteFinanceiro clienteId={financeiroDialog.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Clientes;
