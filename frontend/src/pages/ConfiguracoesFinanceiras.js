import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Settings, DollarSign, CreditCard, Building2, Save, Plus, Edit2, Trash2, Check, X, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';

const ConfiguracoesFinanceiras = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [abaAtiva, setAbaAtiva] = useState('geral');
  
  // Estados para Configurações Gerais
  const [config, setConfig] = useState(null);
  const [editandoConfig, setEditandoConfig] = useState(false);
  
  // Estados para Categorias de Receita
  const [categoriasReceita, setCategoriasReceita] = useState([]);
  const [modalReceitaAberto, setModalReceitaAberto] = useState(false);
  const [receitaEditando, setReceitaEditando] = useState(null);
  
  // Estados para Categorias de Despesa
  const [categoriasDespesa, setCategoriasDespesa] = useState([]);
  const [modalDespesaAberto, setModalDespesaAberto] = useState(false);
  const [despesaEditando, setDespesaEditando] = useState(null);
  
  // Estados para Centros de Custo
  const [centrosCusto, setCentrosCusto] = useState([]);
  const [modalCentroAberto, setModalCentroAberto] = useState(false);
  const [centroEditando, setCentroEditando] = useState(null);
  const [usuarios, setUsuarios] = useState([]);
  
  // Estados de paginação
  const ITENS_POR_PAGINA = 20;
  const [paginaReceitas, setPaginaReceitas] = useState(1);
  const [paginaDespesas, setPaginaDespesas] = useState(1);
  const [paginaCentros, setPaginaCentros] = useState(1);
  
  const backendUrl = process.env.REACT_APP_BACKEND_URL || '';

  useEffect(() => {
    fetchData();
  }, [abaAtiva]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (abaAtiva === 'geral') {
        const response = await axios.get(`${backendUrl}/api/configuracoes-financeiras`, { headers });
        setConfig(response.data);
      } else if (abaAtiva === 'receitas') {
        const response = await axios.get(`${backendUrl}/api/categorias-receita?incluir_inativas=true`, { headers });
        setCategoriasReceita(response.data);
      } else if (abaAtiva === 'despesas') {
        const response = await axios.get(`${backendUrl}/api/categorias-despesa?incluir_inativas=true`, { headers });
        setCategoriasDespesa(response.data);
      } else if (abaAtiva === 'centros') {
        const [centrosResp, usuariosResp] = await Promise.all([
          axios.get(`${backendUrl}/api/centros-custo?incluir_inativos=true`, { headers }),
          axios.get(`${backendUrl}/api/usuarios`, { headers })
        ]);
        setCentrosCusto(centrosResp.data);
        setUsuarios(usuariosResp.data);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados das configurações');
    } finally {
      setLoading(false);
    }
  };

  // ========== CONFIGURAÇÕES GERAIS ==========
  
  const handleSalvarConfig = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${backendUrl}/api/configuracoes-financeiras`, config, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Configurações salvas com sucesso!');
      setEditandoConfig(false);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações');
    }
  };

  const renderConfiguracoesGerais = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Configurações Gerais</h2>
        {!editandoConfig ? (
          <button
            onClick={() => setEditandoConfig(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
          >
            <Edit2 className="w-4 h-4" />
            Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleSalvarConfig}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Salvar
            </button>
            <button
              onClick={() => {
                setEditandoConfig(false);
                fetchData();
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {config && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contas a Receber */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-green-600">Contas a Receber</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Dias para Alerta de Vencimento</label>
                <input
                  type="number"
                  value={config.dias_alerta_vencimento_receber}
                  onChange={(e) => setConfig({...config, dias_alerta_vencimento_receber: parseInt(e.target.value)})}
                  disabled={!editandoConfig}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Permitir Desconto no Recebimento</label>
                <input
                  type="checkbox"
                  checked={config.permitir_desconto_recebimento}
                  onChange={(e) => setConfig({...config, permitir_desconto_recebimento: e.target.checked})}
                  disabled={!editandoConfig}
                  className="w-5 h-5"
                />
              </div>
              {config.permitir_desconto_recebimento && (
                <div>
                  <label className="block text-sm font-medium mb-1">Desconto Máximo (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.desconto_maximo_recebimento}
                    onChange={(e) => setConfig({...config, desconto_maximo_recebimento: parseFloat(e.target.value)})}
                    disabled={!editandoConfig}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Permitir Juros por Atraso</label>
                <input
                  type="checkbox"
                  checked={config.permitir_juros_atraso}
                  onChange={(e) => setConfig({...config, permitir_juros_atraso: e.target.checked})}
                  disabled={!editandoConfig}
                  className="w-5 h-5"
                />
              </div>
              {config.permitir_juros_atraso && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Taxa de Juros ao Mês (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.taxa_juros_mes}
                      onChange={(e) => setConfig({...config, taxa_juros_mes: parseFloat(e.target.value)})}
                      disabled={!editandoConfig}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Taxa de Multa por Atraso (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={config.taxa_multa_atraso}
                      onChange={(e) => setConfig({...config, taxa_multa_atraso: parseFloat(e.target.value)})}
                      disabled={!editandoConfig}
                      className="w-full border rounded px-3 py-2"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contas a Pagar */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4 text-red-600">Contas a Pagar</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Dias para Alerta de Vencimento</label>
                <input
                  type="number"
                  value={config.dias_alerta_vencimento_pagar}
                  onChange={(e) => setConfig({...config, dias_alerta_vencimento_pagar: parseInt(e.target.value)})}
                  disabled={!editandoConfig}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Exigir Aprovação de Pagamento</label>
                <input
                  type="checkbox"
                  checked={config.exigir_aprovacao_pagamento}
                  onChange={(e) => setConfig({...config, exigir_aprovacao_pagamento: e.target.checked})}
                  disabled={!editandoConfig}
                  className="w-5 h-5"
                />
              </div>
              {config.exigir_aprovacao_pagamento && (
                <div>
                  <label className="block text-sm font-medium mb-1">Valor Mínimo para Aprovação (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.valor_minimo_aprovacao}
                    onChange={(e) => setConfig({...config, valor_minimo_aprovacao: parseFloat(e.target.value)})}
                    disabled={!editandoConfig}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Permitir Antecipação de Pagamento</label>
                <input
                  type="checkbox"
                  checked={config.permitir_antecipacao_pagamento}
                  onChange={(e) => setConfig({...config, permitir_antecipacao_pagamento: e.target.checked})}
                  disabled={!editandoConfig}
                  className="w-5 h-5"
                />
              </div>
              {config.permitir_antecipacao_pagamento && (
                <div>
                  <label className="block text-sm font-medium mb-1">Desconto para Antecipação (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={config.desconto_antecipacao}
                    onChange={(e) => setConfig({...config, desconto_antecipacao: parseFloat(e.target.value)})}
                    disabled={!editandoConfig}
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Configurações Gerais */}
          <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
            <h3 className="text-lg font-semibold mb-4">Outras Configurações</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Regime Contábil</label>
                <select
                  value={config.regime_contabil}
                  onChange={(e) => setConfig({...config, regime_contabil: e.target.value})}
                  disabled={!editandoConfig}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="caixa">Caixa</option>
                  <option value="competencia">Competência</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Moeda</label>
                <select
                  value={config.moeda}
                  onChange={(e) => setConfig({...config, moeda: e.target.value})}
                  disabled={!editandoConfig}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="BRL">BRL - Real Brasileiro</option>
                  <option value="USD">USD - Dólar Americano</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ========== CATEGORIAS DE RECEITA ==========

  const handleSalvarCategoriaReceita = async (dados) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (receitaEditando) {
        await axios.put(`${backendUrl}/api/categorias-receita/${receitaEditando.id}`, dados, { headers });
      } else {
        await axios.post(`${backendUrl}/api/categorias-receita`, dados, { headers });
      }

      alert('Categoria salva com sucesso!');
      setModalReceitaAberto(false);
      setReceitaEditando(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      alert(error.response?.data?.detail || 'Erro ao salvar categoria');
    }
  };

  const handleToggleStatusReceita = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${backendUrl}/api/categorias-receita/${id}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status da categoria');
    }
  };

  const handleDeletarReceita = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta categoria?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${backendUrl}/api/categorias-receita/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Categoria deletada com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      alert(error.response?.data?.detail || 'Erro ao deletar categoria');
    }
  };

  const renderCategoriasReceita = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Categorias de Receita</h2>
        <button
          onClick={() => {
            setReceitaEditando(null);
            setModalReceitaAberto(true);
          }}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {receitasPaginadas.map((cat) => (
          <div key={cat.id} className="bg-white p-4 rounded-lg shadow border-l-4" style={{borderLeftColor: cat.cor}}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">{cat.nome}</h3>
                {cat.descricao && <p className="text-sm text-gray-600">{cat.descricao}</p>}
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${cat.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {cat.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setReceitaEditando(cat);
                  setModalReceitaAberto(true);
                }}
                className="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                <Edit2 className="w-3 h-3 inline mr-1" />
                Editar
              </button>
              <button
                onClick={() => handleToggleStatusReceita(cat.id)}
                className="flex-1 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
              >
                {cat.ativo ? <EyeOff className="w-3 h-3 inline mr-1" /> : <Eye className="w-3 h-3 inline mr-1" />}
                {cat.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => handleDeletarReceita(cat.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                <Trash2 className="w-3 h-3 inline" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Categoria Receita */}
      {modalReceitaAberto && (
        <ModalCategoriaReceita
          categoria={receitaEditando}
          onSalvar={handleSalvarCategoriaReceita}
          onFechar={() => {
            setModalReceitaAberto(false);
            setReceitaEditando(null);
          }}
        />
      )}

      {/* Paginação - Categorias de Receita */}
      {categoriasReceita.length > ITENS_POR_PAGINA && (
        <div className="mt-4 p-4 border rounded-lg bg-white">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {paginaReceitas} de {totalPaginasReceitas} | Mostrando {indiceInicialReceitas + 1} a {Math.min(indiceFinalReceitas, categoriasReceita.length)} de {categoriasReceita.length} categorias
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaReceitas(p => Math.max(1, p - 1))}
                disabled={paginaReceitas === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPaginasReceitas }, (_, i) => i + 1).map((pagina) => (
                  <button
                    key={pagina}
                    onClick={() => setPaginaReceitas(pagina)}
                    className={`px-3 py-1 border rounded ${paginaReceitas === pagina ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
                  >
                    {pagina}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPaginaReceitas(p => Math.min(totalPaginasReceitas, p + 1))}
                disabled={paginaReceitas === totalPaginasReceitas}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1"
              >
                Próxima
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ========== CATEGORIAS DE DESPESA ==========

  const handleSalvarCategoriaDespesa = async (dados) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (despesaEditando) {
        await axios.put(`${backendUrl}/api/categorias-despesa/${despesaEditando.id}`, dados, { headers });
      } else {
        await axios.post(`${backendUrl}/api/categorias-despesa`, dados, { headers });
      }

      alert('Categoria salva com sucesso!');
      setModalDespesaAberto(false);
      setDespesaEditando(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
      alert(error.response?.data?.detail || 'Erro ao salvar categoria');
    }
  };

  const handleToggleStatusDespesa = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${backendUrl}/api/categorias-despesa/${id}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status da categoria');
    }
  };

  const handleDeletarDespesa = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar esta categoria?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${backendUrl}/api/categorias-despesa/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Categoria deletada com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao deletar categoria:', error);
      alert(error.response?.data?.detail || 'Erro ao deletar categoria');
    }
  };

  const renderCategoriasDespesa = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Categorias de Despesa</h2>
        <button
          onClick={() => {
            setDespesaEditando(null);
            setModalDespesaAberto(true);
          }}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nova Categoria
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {despesasPaginadas.map((cat) => (
          <div key={cat.id} className="bg-white p-4 rounded-lg shadow border-l-4" style={{borderLeftColor: cat.cor}}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="font-semibold text-lg">{cat.nome}</h3>
                {cat.descricao && <p className="text-sm text-gray-600">{cat.descricao}</p>}
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded mt-1 inline-block">
                  {cat.tipo === 'operacional' && 'Operacional'}
                  {cat.tipo === 'administrativa' && 'Administrativa'}
                  {cat.tipo === 'financeira' && 'Financeira'}
                </span>
              </div>
              <span className={`px-2 py-1 rounded text-xs font-semibold ${cat.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                {cat.ativo ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setDespesaEditando(cat);
                  setModalDespesaAberto(true);
                }}
                className="flex-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                <Edit2 className="w-3 h-3 inline mr-1" />
                Editar
              </button>
              <button
                onClick={() => handleToggleStatusDespesa(cat.id)}
                className="flex-1 px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 text-sm"
              >
                {cat.ativo ? <EyeOff className="w-3 h-3 inline mr-1" /> : <Eye className="w-3 h-3 inline mr-1" />}
                {cat.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button
                onClick={() => handleDeletarDespesa(cat.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
              >
                <Trash2 className="w-3 h-3 inline" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Categoria Despesa */}
      {modalDespesaAberto && (
        <ModalCategoriaDespesa
          categoria={despesaEditando}
          onSalvar={handleSalvarCategoriaDespesa}
          onFechar={() => {
            setModalDespesaAberto(false);
            setDespesaEditando(null);
          }}
        />
      )}

      {/* Paginação - Categorias de Despesa */}
      {categoriasDespesa.length > ITENS_POR_PAGINA && (
        <div className="mt-4 p-4 border rounded-lg bg-white">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {paginaDespesas} de {totalPaginasDespesas} | Mostrando {indiceInicialDespesas + 1} a {Math.min(indiceFinalDespesas, categoriasDespesa.length)} de {categoriasDespesa.length} categorias
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaDespesas(p => Math.max(1, p - 1))}
                disabled={paginaDespesas === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPaginasDespesas }, (_, i) => i + 1).map((pagina) => (
                  <button
                    key={pagina}
                    onClick={() => setPaginaDespesas(pagina)}
                    className={`px-3 py-1 border rounded ${paginaDespesas === pagina ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
                  >
                    {pagina}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPaginaDespesas(p => Math.min(totalPaginasDespesas, p + 1))}
                disabled={paginaDespesas === totalPaginasDespesas}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1"
              >
                Próxima
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ========== CENTROS DE CUSTO ==========

  const handleSalvarCentroCusto = async (dados) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      if (centroEditando) {
        await axios.put(`${backendUrl}/api/centros-custo/${centroEditando.id}`, dados, { headers });
      } else {
        await axios.post(`${backendUrl}/api/centros-custo`, dados, { headers });
      }

      alert('Centro de custo salvo com sucesso!');
      setModalCentroAberto(false);
      setCentroEditando(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao salvar centro de custo:', error);
      alert(error.response?.data?.detail || 'Erro ao salvar centro de custo');
    }
  };

  const handleToggleStatusCentro = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${backendUrl}/api/centros-custo/${id}/toggle-status`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      alert('Erro ao alterar status do centro de custo');
    }
  };

  const handleDeletarCentro = async (id) => {
    if (!window.confirm('Tem certeza que deseja deletar este centro de custo?')) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${backendUrl}/api/centros-custo/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Centro de custo deletado com sucesso!');
      fetchData();
    } catch (error) {
      console.error('Erro ao deletar centro de custo:', error);
      alert(error.response?.data?.detail || 'Erro ao deletar centro de custo');
    }
  };

  const renderCentrosCusto = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Centros de Custo</h2>
        <button
          onClick={() => {
            setCentroEditando(null);
            setModalCentroAberto(true);
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Centro de Custo
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">Código</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Nome</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Departamento</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Responsável</th>
              <th className="px-4 py-3 text-right text-sm font-semibold">Orçamento Mensal</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Status</th>
              <th className="px-4 py-3 text-center text-sm font-semibold">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {centrosPaginados.map((centro) => (
              <tr key={centro.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-mono">{centro.codigo}</td>
                <td className="px-4 py-3">
                  <div>
                    <div className="font-medium">{centro.nome}</div>
                    {centro.descricao && <div className="text-sm text-gray-500">{centro.descricao}</div>}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{centro.departamento || '-'}</td>
                <td className="px-4 py-3 text-sm">{centro.responsavel_nome || '-'}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold">
                  R$ {centro.orcamento_mensal?.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${centro.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                    {centro.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => {
                        setCentroEditando(centro);
                        setModalCentroAberto(true);
                      }}
                      className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleStatusCentro(centro.id)}
                      className="p-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      title={centro.ativo ? 'Desativar' : 'Ativar'}
                    >
                      {centro.ativo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeletarCentro(centro.id)}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação - Centros de Custo */}
      {centrosCusto.length > ITENS_POR_PAGINA && (
        <div className="mt-4 p-4 border rounded-lg bg-white">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Página {paginaCentros} de {totalPaginasCentros} | Mostrando {indiceInicialCentros + 1} a {Math.min(indiceFinalCentros, centrosCusto.length)} de {centrosCusto.length} centros
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPaginaCentros(p => Math.max(1, p - 1))}
                disabled={paginaCentros === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPaginasCentros }, (_, i) => i + 1).map((pagina) => (
                  <button
                    key={pagina}
                    onClick={() => setPaginaCentros(pagina)}
                    className={`px-3 py-1 border rounded ${paginaCentros === pagina ? 'bg-blue-600 text-white' : 'hover:bg-gray-50'}`}
                  >
                    {pagina}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setPaginaCentros(p => Math.min(totalPaginasCentros, p + 1))}
                disabled={paginaCentros === totalPaginasCentros}
                className="px-3 py-1 border rounded disabled:opacity-50 hover:bg-gray-50 flex items-center gap-1"
              >
                Próxima
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Centro de Custo */}
      {modalCentroAberto && (
        <ModalCentroCusto
          centro={centroEditando}
          usuarios={usuarios}
          onSalvar={handleSalvarCentroCusto}
          onFechar={() => {
            setModalCentroAberto(false);
            setCentroEditando(null);
          }}
        />
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Lógica de paginação
  // 1. Categorias de Receita
  const totalPaginasReceitas = Math.ceil(categoriasReceita.length / ITENS_POR_PAGINA);
  const indiceInicialReceitas = (paginaReceitas - 1) * ITENS_POR_PAGINA;
  const indiceFinalReceitas = indiceInicialReceitas + ITENS_POR_PAGINA;
  const receitasPaginadas = categoriasReceita.slice(indiceInicialReceitas, indiceFinalReceitas);
  
  // 2. Categorias de Despesa
  const totalPaginasDespesas = Math.ceil(categoriasDespesa.length / ITENS_POR_PAGINA);
  const indiceInicialDespesas = (paginaDespesas - 1) * ITENS_POR_PAGINA;
  const indiceFinalDespesas = indiceInicialDespesas + ITENS_POR_PAGINA;
  const despesasPaginadas = categoriasDespesa.slice(indiceInicialDespesas, indiceFinalDespesas);
  
  // 3. Centros de Custo
  const totalPaginasCentros = Math.ceil(centrosCusto.length / ITENS_POR_PAGINA);
  const indiceInicialCentros = (paginaCentros - 1) * ITENS_POR_PAGINA;
  const indiceFinalCentros = indiceInicialCentros + ITENS_POR_PAGINA;
  const centrosPaginados = centrosCusto.slice(indiceInicialCentros, indiceFinalCentros);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Configurações Financeiras</h1>
        </div>

        {/* Abas */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="flex border-b overflow-x-auto">
            <button
              onClick={() => setAbaAtiva('geral')}
              className={`px-6 py-3 font-medium whitespace-nowrap flex items-center gap-2 ${
                abaAtiva === 'geral'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              Geral
            </button>
            <button
              onClick={() => setAbaAtiva('receitas')}
              className={`px-6 py-3 font-medium whitespace-nowrap flex items-center gap-2 ${
                abaAtiva === 'receitas'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              Categorias de Receita
            </button>
            <button
              onClick={() => setAbaAtiva('despesas')}
              className={`px-6 py-3 font-medium whitespace-nowrap flex items-center gap-2 ${
                abaAtiva === 'despesas'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              Categorias de Despesa
            </button>
            <button
              onClick={() => setAbaAtiva('centros')}
              className={`px-6 py-3 font-medium whitespace-nowrap flex items-center gap-2 ${
                abaAtiva === 'centros'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Centros de Custo
            </button>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div>
          {abaAtiva === 'geral' && renderConfiguracoesGerais()}
          {abaAtiva === 'receitas' && renderCategoriasReceita()}
          {abaAtiva === 'despesas' && renderCategoriasDespesa()}
          {abaAtiva === 'centros' && renderCentrosCusto()}
        </div>
      </div>
    </div>
  );
};

// ========== COMPONENTES DE MODAL ==========

const ModalCategoriaReceita = ({ categoria, onSalvar, onFechar }) => {
  const [dados, setDados] = useState({
    nome: categoria?.nome || '',
    descricao: categoria?.descricao || '',
    cor: categoria?.cor || '#10B981',
    icone: categoria?.icone || 'DollarSign'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dados.nome.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    onSalvar(dados);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">{categoria ? 'Editar' : 'Nova'} Categoria de Receita</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input
              type="text"
              value={dados.nome}
              onChange={(e) => setDados({...dados, nome: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea
              value={dados.descricao}
              onChange={(e) => setDados({...dados, descricao: e.target.value})}
              className="w-full border rounded px-3 py-2"
              rows="3"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cor</label>
              <input
                type="color"
                value={dados.cor}
                onChange={(e) => setDados({...dados, cor: e.target.value})}
                className="w-full h-10 border rounded px-1 py-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ícone</label>
              <input
                type="text"
                value={dados.icone}
                onChange={(e) => setDados({...dados, icone: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="DollarSign"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="submit" className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
              Salvar
            </button>
            <button type="button" onClick={onFechar} className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ModalCategoriaDespesa = ({ categoria, onSalvar, onFechar }) => {
  const [dados, setDados] = useState({
    nome: categoria?.nome || '',
    descricao: categoria?.descricao || '',
    cor: categoria?.cor || '#EF4444',
    icone: categoria?.icone || 'CreditCard',
    tipo: categoria?.tipo || 'operacional'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dados.nome.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    onSalvar(dados);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">{categoria ? 'Editar' : 'Nova'} Categoria de Despesa</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input
              type="text"
              value={dados.nome}
              onChange={(e) => setDados({...dados, nome: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea
              value={dados.descricao}
              onChange={(e) => setDados({...dados, descricao: e.target.value})}
              className="w-full border rounded px-3 py-2"
              rows="3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={dados.tipo}
              onChange={(e) => setDados({...dados, tipo: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="operacional">Operacional</option>
              <option value="administrativa">Administrativa</option>
              <option value="financeira">Financeira</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cor</label>
              <input
                type="color"
                value={dados.cor}
                onChange={(e) => setDados({...dados, cor: e.target.value})}
                className="w-full h-10 border rounded px-1 py-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ícone</label>
              <input
                type="text"
                value={dados.icone}
                onChange={(e) => setDados({...dados, icone: e.target.value})}
                className="w-full border rounded px-3 py-2"
                placeholder="CreditCard"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button type="submit" className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
              Salvar
            </button>
            <button type="button" onClick={onFechar} className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ModalCentroCusto = ({ centro, usuarios, onSalvar, onFechar }) => {
  const [dados, setDados] = useState({
    nome: centro?.nome || '',
    descricao: centro?.descricao || '',
    responsavel_id: centro?.responsavel_id || '',
    departamento: centro?.departamento || '',
    orcamento_mensal: centro?.orcamento_mensal || 0
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dados.nome.trim()) {
      alert('Nome é obrigatório');
      return;
    }
    
    // Converter valores vazios para null
    const dadosLimpos = {
      ...dados,
      responsavel_id: dados.responsavel_id || null,
      departamento: dados.departamento || null,
      orcamento_mensal: parseFloat(dados.orcamento_mensal) || 0
    };
    
    onSalvar(dadosLimpos);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">{centro ? 'Editar' : 'Novo'} Centro de Custo</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nome *</label>
            <input
              type="text"
              value={dados.nome}
              onChange={(e) => setDados({...dados, nome: e.target.value})}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Descrição</label>
            <textarea
              value={dados.descricao}
              onChange={(e) => setDados({...dados, descricao: e.target.value})}
              className="w-full border rounded px-3 py-2"
              rows="2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Departamento</label>
            <select
              value={dados.departamento}
              onChange={(e) => setDados({...dados, departamento: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Selecione...</option>
              <option value="Vendas">Vendas</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Operacional">Operacional</option>
              <option value="Financeiro">Financeiro</option>
              <option value="Marketing">Marketing</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Responsável</label>
            <select
              value={dados.responsavel_id}
              onChange={(e) => setDados({...dados, responsavel_id: e.target.value})}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Selecione...</option>
              {usuarios.map((user) => (
                <option key={user.id} value={user.id}>{user.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Orçamento Mensal (R$)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={dados.orcamento_mensal}
              onChange={(e) => setDados({...dados, orcamento_mensal: e.target.value})}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div className="flex gap-2 mt-6">
            <button type="submit" className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Salvar
            </button>
            <button type="button" onClick={onFechar} className="flex-1 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfiguracoesFinanceiras;
