import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, Edit, Trash2, Power, Search, DollarSign, ChevronLeft, ChevronRight, 
  Building2, MapPin, Phone, Mail, FileText, Globe, User, Truck,
  CheckCircle, XCircle, AlertCircle, Loader2, CreditCard, Briefcase
} from 'lucide-react';
import { toast } from 'sonner';
import FornecedorFinanceiro from '../components/FornecedorFinanceiro';
import {
  maskCNPJ, maskCPFCNPJ, maskPhone, maskCEP, maskIE,
  validateCNPJ, validateCPFCNPJ, validateEmail, validatePhone, validateCEP,
  fetchAddressByCEP, unmask, formatCPFCNPJ, formatPhone, formatCEP,
  ESTADOS_BR, detectTipoPessoa
} from '../utils/masks';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Fornecedores = () => {
  const [fornecedores, setFornecedores] = useState([]);
  const [filteredFornecedores, setFilteredFornecedores] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('dados');
  const [loadingCEP, setLoadingCEP] = useState(false);
  
  const initialFormData = {
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    ie: '',
    tipo_pessoa: 'juridica',
    telefone: '',
    celular: '',
    email: '',
    site: '',
    contato_nome: '',
    contato_cargo: '',
    endereco: {
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: ''
    },
    dados_bancarios: {
      banco: '',
      agencia: '',
      conta: '',
      tipo_conta: 'corrente',
      pix: ''
    },
    prazo_entrega: '',
    condicoes_pagamento: '',
    observacoes: '',
    ativo: true
  };
  
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nome: '' });
  const [toggleDialog, setToggleDialog] = useState({ open: false, id: null, nome: '', ativo: false });
  const [financeiroDialog, setFinanceiroDialog] = useState({ open: false, id: null, nome: '' });
  const [loading, setLoading] = useState(false);
  
  const [paginaAtual, setPaginaAtual] = useState(1);
  const ITENS_POR_PAGINA = 20;

  useEffect(() => { fetchFornecedores(); }, []);

  useEffect(() => {
    let filtered = fornecedores;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(f =>
        f.razao_social?.toLowerCase().includes(term) ||
        f.nome_fantasia?.toLowerCase().includes(term) ||
        f.cnpj?.includes(searchTerm.replace(/\D/g, '')) ||
        f.email?.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(f => statusFilter === 'ativo' ? f.ativo : !f.ativo);
    }
    setFilteredFornecedores(filtered);
    setPaginaAtual(1);
  }, [searchTerm, statusFilter, fornecedores]);

  const extractData = (response) => {
    const data = response?.data;
    if (data && data.ok !== undefined && Array.isArray(data.data)) return data.data;
    if (data && Array.isArray(data.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  };

  const fetchFornecedores = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/fornecedores?incluir_inativos=true&limit=0`);
      const fornecedoresData = extractData(response);
      setFornecedores(fornecedoresData);
      setFilteredFornecedores(fornecedoresData);
    } catch (error) {
      toast.error('Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  // === VALIDAÇÃO ===
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.razao_social?.trim()) newErrors.razao_social = 'Razão Social é obrigatória';
    if (!formData.cnpj?.trim()) {
      newErrors.cnpj = 'CNPJ é obrigatório';
    } else if (!validateCPFCNPJ(formData.cnpj)) {
      newErrors.cnpj = 'CNPJ/CPF inválido';
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

  // === HANDLERS DE INPUT ===
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
  };

  const handleMaskedInput = (field, value, maskFn) => {
    const masked = maskFn(value);
    handleInputChange(field, masked);
    
    if (field === 'cnpj') {
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

  const handleBancarioChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      dados_bancarios: { ...prev.dados_bancarios, [field]: value }
    }));
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
        razao_social: formData.razao_social.trim(),
        nome_fantasia: formData.nome_fantasia?.trim() || null,
        cnpj: unmask(formData.cnpj),
        ie: formData.ie?.trim() || null,
        tipo_pessoa: formData.tipo_pessoa,
        telefone: unmask(formData.telefone) || null,
        celular: unmask(formData.celular) || null,
        email: formData.email?.trim().toLowerCase() || null,
        site: formData.site?.trim() || null,
        contato_nome: formData.contato_nome?.trim() || null,
        contato_cargo: formData.contato_cargo?.trim() || null,
        endereco: formData.endereco?.cep ? {
          cep: unmask(formData.endereco.cep),
          logradouro: formData.endereco.logradouro?.trim() || null,
          numero: formData.endereco.numero?.trim() || null,
          complemento: formData.endereco.complemento?.trim() || null,
          bairro: formData.endereco.bairro?.trim() || null,
          cidade: formData.endereco.cidade?.trim() || null,
          estado: formData.endereco.estado || null
        } : null,
        dados_bancarios: formData.dados_bancarios?.banco ? {
          banco: formData.dados_bancarios.banco?.trim() || null,
          agencia: formData.dados_bancarios.agencia?.trim() || null,
          conta: formData.dados_bancarios.conta?.trim() || null,
          tipo_conta: formData.dados_bancarios.tipo_conta || 'corrente',
          pix: formData.dados_bancarios.pix?.trim() || null
        } : null,
        prazo_entrega: formData.prazo_entrega ? parseInt(formData.prazo_entrega) : null,
        condicoes_pagamento: formData.condicoes_pagamento?.trim() || null,
        observacoes: formData.observacoes?.trim() || null,
        ativo: formData.ativo
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
      razao_social: fornecedor.razao_social || '',
      nome_fantasia: fornecedor.nome_fantasia || '',
      cnpj: maskCPFCNPJ(fornecedor.cnpj || ''),
      ie: fornecedor.ie || '',
      tipo_pessoa: fornecedor.tipo_pessoa || detectTipoPessoa(fornecedor.cnpj) || 'juridica',
      telefone: maskPhone(fornecedor.telefone || ''),
      celular: maskPhone(fornecedor.celular || ''),
      email: fornecedor.email || '',
      site: fornecedor.site || '',
      contato_nome: fornecedor.contato_nome || '',
      contato_cargo: fornecedor.contato_cargo || '',
      endereco: {
        cep: maskCEP(fornecedor.endereco?.cep || ''),
        logradouro: fornecedor.endereco?.logradouro || '',
        numero: fornecedor.endereco?.numero || '',
        complemento: fornecedor.endereco?.complemento || '',
        bairro: fornecedor.endereco?.bairro || '',
        cidade: fornecedor.endereco?.cidade || '',
        estado: fornecedor.endereco?.estado || ''
      },
      dados_bancarios: {
        banco: fornecedor.dados_bancarios?.banco || '',
        agencia: fornecedor.dados_bancarios?.agencia || '',
        conta: fornecedor.dados_bancarios?.conta || '',
        tipo_conta: fornecedor.dados_bancarios?.tipo_conta || 'corrente',
        pix: fornecedor.dados_bancarios?.pix || ''
      },
      prazo_entrega: fornecedor.prazo_entrega || '',
      condicoes_pagamento: fornecedor.condicoes_pagamento || '',
      observacoes: fornecedor.observacoes || '',
      ativo: fornecedor.ativo
    });
    setActiveTab('dados');
    setErrors({});
    setIsOpen(true);
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/fornecedores/${deleteDialog.id}`);
      toast.success('Fornecedor excluído com sucesso!');
      fetchFornecedores();
      setDeleteDialog({ open: false, id: null, nome: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir fornecedor');
    }
  };

  const handleToggleStatus = async () => {
    try {
      const response = await axios.put(`${API}/fornecedores/${toggleDialog.id}/toggle-status`);
      toast.success(response.data.message);
      fetchFornecedores();
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

  // Paginação
  const totalPaginas = Math.ceil(filteredFornecedores.length / ITENS_POR_PAGINA);
  const fornecedoresPaginados = filteredFornecedores.slice((paginaAtual - 1) * ITENS_POR_PAGINA, paginaAtual * ITENS_POR_PAGINA);

  // Estatísticas
  const stats = {
    total: fornecedores.length,
    ativos: fornecedores.filter(f => f.ativo).length,
    inativos: fornecedores.filter(f => !f.ativo).length
  };

  return (
    <div className="page-container">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fornecedores</h1>
          <p className="text-gray-600">Gestão completa de fornecedores</p>
        </div>
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); else setIsOpen(true); }}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2" style={{backgroundColor: '#2C9AA1'}}>
              <Plus size={20} />Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 size={20} />
                {isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4 mb-4">
                  <TabsTrigger value="dados"><Building2 size={14} className="mr-1" />Dados</TabsTrigger>
                  <TabsTrigger value="contato"><Phone size={14} className="mr-1" />Contato</TabsTrigger>
                  <TabsTrigger value="endereco"><MapPin size={14} className="mr-1" />Endereço</TabsTrigger>
                  <TabsTrigger value="financeiro"><CreditCard size={14} className="mr-1" />Financeiro</TabsTrigger>
                </TabsList>

                {/* ABA: DADOS */}
                <TabsContent value="dados" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="flex items-center gap-1"><Building2 size={14} />Razão Social <span className="text-red-500">*</span></Label>
                      <Input
                        value={formData.razao_social}
                        onChange={(e) => handleInputChange('razao_social', e.target.value)}
                        placeholder="Razão Social da empresa"
                        className={errors.razao_social ? 'border-red-500' : ''}
                      />
                      {errors.razao_social && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.razao_social}</p>}
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label>Nome Fantasia</Label>
                      <Input
                        value={formData.nome_fantasia}
                        onChange={(e) => handleInputChange('nome_fantasia', e.target.value)}
                        placeholder="Nome Fantasia (opcional)"
                      />
                    </div>
                    
                    <div>
                      <Label className="flex items-center gap-1"><FileText size={14} />Tipo</Label>
                      <Select value={formData.tipo_pessoa} onValueChange={(v) => handleInputChange('tipo_pessoa', v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="juridica"><Building2 size={14} className="inline mr-1" />Pessoa Jurídica</SelectItem>
                          <SelectItem value="fisica"><User size={14} className="inline mr-1" />Pessoa Física</SelectItem>
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
                          value={formData.cnpj}
                          onChange={(e) => handleMaskedInput('cnpj', e.target.value, maskCPFCNPJ)}
                          placeholder={formData.tipo_pessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                          className={errors.cnpj ? 'border-red-500 pr-8' : 'pr-8'}
                        />
                        {formData.cnpj && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2">
                            {validateCPFCNPJ(formData.cnpj) ? 
                              <CheckCircle size={16} className="text-green-500" /> : 
                              <XCircle size={16} className="text-red-500" />}
                          </span>
                        )}
                      </div>
                      {errors.cnpj && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.cnpj}</p>}
                    </div>
                    
                    <div>
                      <Label>Inscrição Estadual</Label>
                      <Input
                        value={formData.ie}
                        onChange={(e) => handleInputChange('ie', maskIE(e.target.value))}
                        placeholder="Inscrição Estadual"
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
                        <Label htmlFor="ativo">Fornecedor Ativo</Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* ABA: CONTATO */}
                <TabsContent value="contato" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="flex items-center gap-1"><Phone size={14} />Telefone</Label>
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
                        placeholder="email@empresa.com"
                        className={errors.email ? 'border-red-500' : ''}
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <Label className="flex items-center gap-1"><Globe size={14} />Site</Label>
                      <Input
                        value={formData.site}
                        onChange={(e) => handleInputChange('site', e.target.value)}
                        placeholder="www.empresa.com.br"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><User size={16} />Pessoa de Contato</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Nome do Contato</Label>
                        <Input
                          value={formData.contato_nome}
                          onChange={(e) => handleInputChange('contato_nome', e.target.value)}
                          placeholder="Nome do responsável"
                        />
                      </div>
                      <div>
                        <Label>Cargo</Label>
                        <Input
                          value={formData.contato_cargo}
                          onChange={(e) => handleInputChange('contato_cargo', e.target.value)}
                          placeholder="Cargo/Função"
                        />
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
                          onChange={(e) => handleEnderecoChange('cep', maskCEP(e.target.value))}
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
                        placeholder="Sala, Galpão, etc."
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

                {/* ABA: FINANCEIRO */}
                <TabsContent value="financeiro" className="space-y-4">
                  <div className="border-b pb-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><CreditCard size={16} />Dados Bancários</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Banco</Label>
                        <Input
                          value={formData.dados_bancarios?.banco || ''}
                          onChange={(e) => handleBancarioChange('banco', e.target.value)}
                          placeholder="Nome do banco"
                        />
                      </div>
                      <div>
                        <Label>Agência</Label>
                        <Input
                          value={formData.dados_bancarios?.agencia || ''}
                          onChange={(e) => handleBancarioChange('agencia', e.target.value)}
                          placeholder="Agência"
                        />
                      </div>
                      <div>
                        <Label>Conta</Label>
                        <Input
                          value={formData.dados_bancarios?.conta || ''}
                          onChange={(e) => handleBancarioChange('conta', e.target.value)}
                          placeholder="Número da conta"
                        />
                      </div>
                      <div>
                        <Label>Tipo de Conta</Label>
                        <Select value={formData.dados_bancarios?.tipo_conta || 'corrente'} onValueChange={(v) => handleBancarioChange('tipo_conta', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="corrente">Conta Corrente</SelectItem>
                            <SelectItem value="poupanca">Poupança</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Chave PIX</Label>
                        <Input
                          value={formData.dados_bancarios?.pix || ''}
                          onChange={(e) => handleBancarioChange('pix', e.target.value)}
                          placeholder="CPF, CNPJ, E-mail, Telefone ou Chave Aleatória"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-b pb-4">
                    <h4 className="font-semibold mb-3 flex items-center gap-2"><Truck size={16} />Condições Comerciais</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Prazo de Entrega (dias)</Label>
                        <Input
                          type="number"
                          value={formData.prazo_entrega}
                          onChange={(e) => handleInputChange('prazo_entrega', e.target.value)}
                          placeholder="Ex: 15"
                        />
                      </div>
                      <div>
                        <Label>Condições de Pagamento</Label>
                        <Input
                          value={formData.condicoes_pagamento}
                          onChange={(e) => handleInputChange('condicoes_pagamento', e.target.value)}
                          placeholder="Ex: 30/60/90 dias"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={formData.observacoes}
                      onChange={(e) => handleInputChange('observacoes', e.target.value)}
                      placeholder="Observações sobre o fornecedor..."
                      rows={3}
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
      <div className="grid grid-cols-3 gap-4 mb-6">
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
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <Input
            placeholder="Buscar por razão social, nome fantasia, CNPJ ou e-mail..."
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
                  <th className="text-left p-3">Razão Social</th>
                  <th className="text-left p-3 hidden md:table-cell">CNPJ</th>
                  <th className="text-left p-3 hidden lg:table-cell">Contato</th>
                  <th className="text-left p-3 hidden xl:table-cell">Cidade/UF</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-center p-3 min-w-[150px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" size={24} />Carregando...
                  </td></tr>
                ) : fornecedoresPaginados.length === 0 ? (
                  <tr><td colSpan="6" className="p-8 text-center text-gray-500">Nenhum fornecedor encontrado</td></tr>
                ) : fornecedoresPaginados.map((fornecedor) => (
                  <tr key={fornecedor.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-purple-500" />
                        <div>
                          <p className="font-medium">{fornecedor.razao_social}</p>
                          {fornecedor.nome_fantasia && <p className="text-xs text-gray-500">{fornecedor.nome_fantasia}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="p-3 hidden md:table-cell font-mono text-sm">{formatCPFCNPJ(fornecedor.cnpj)}</td>
                    <td className="p-3 hidden lg:table-cell">
                      <div className="text-sm">
                        {fornecedor.telefone || fornecedor.celular ? formatPhone(fornecedor.telefone || fornecedor.celular) : '-'}
                        {fornecedor.email && <p className="text-xs text-gray-500">{fornecedor.email}</p>}
                      </div>
                    </td>
                    <td className="p-3 hidden xl:table-cell text-sm">
                      {fornecedor.endereco?.cidade ? `${fornecedor.endereco.cidade}/${fornecedor.endereco.estado}` : '-'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant={fornecedor.ativo ? 'default' : 'secondary'} className={fornecedor.ativo ? 'bg-green-500' : ''}>
                        {fornecedor.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(fornecedor)} title="Editar">
                          <Edit size={14} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setFinanceiroDialog({ open: true, id: fornecedor.id, nome: fornecedor.razao_social })} title="Financeiro">
                          <DollarSign size={14} />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setToggleDialog({ open: true, id: fornecedor.id, nome: fornecedor.razao_social, ativo: fornecedor.ativo })} title={fornecedor.ativo ? 'Desativar' : 'Ativar'}>
                          <Power size={14} />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-500 hover:text-red-700" onClick={() => setDeleteDialog({ open: true, id: fornecedor.id, nome: fornecedor.razao_social })} title="Excluir">
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
                Mostrando {((paginaAtual - 1) * ITENS_POR_PAGINA) + 1} - {Math.min(paginaAtual * ITENS_POR_PAGINA, filteredFornecedores.length)} de {filteredFornecedores.length}
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
            <AlertDialogDescription>Tem certeza que deseja excluir o fornecedor <strong>{deleteDialog.nome}</strong>?</AlertDialogDescription>
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
            <AlertDialogTitle>{toggleDialog.ativo ? 'Desativar' : 'Ativar'} Fornecedor</AlertDialogTitle>
            <AlertDialogDescription>
              {toggleDialog.ativo ? `Deseja desativar o fornecedor ${toggleDialog.nome}?` : `Deseja reativar o fornecedor ${toggleDialog.nome}?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleToggleStatus}>{toggleDialog.ativo ? 'Desativar' : 'Ativar'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Financeiro */}
      <Dialog open={financeiroDialog.open} onOpenChange={(open) => setFinanceiroDialog({ ...financeiroDialog, open })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle><DollarSign className="inline mr-2" />Financeiro - {financeiroDialog.nome}</DialogTitle></DialogHeader>
          {financeiroDialog.id && <FornecedorFinanceiro fornecedorId={financeiroDialog.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fornecedores;
