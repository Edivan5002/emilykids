// Funções auxiliares para inventário periódico

export const fetchInventarios = async (API, setInventarios, setInventarioAtivo) => {
  try {
    const response = await axios.get(`${API}/estoque/inventario?limit=0`);
    setInventarios(response.data);
    
    // Verificar se há inventário em andamento
    const inventarioAberto = response.data.find(inv => inv.status === 'em_andamento');
    if (inventarioAberto) {
      setInventarioAtivo(inventarioAberto);
    }
  } catch (error) {
    console.error('Erro ao buscar inventários:', error);
  }
};

export const iniciarNovoInventario = async (API, observacoes, fetchInventarios, toast) => {
  try {
    const response = await axios.post(`${API}/estoque/inventario/iniciar`, null, {
      params: { observacoes }
    });
    toast.success(`Inventário ${response.data.numero} iniciado com ${response.data.total_produtos} produtos!`);
    await fetchInventarios();
    return response.data;
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Erro ao iniciar inventário');
    throw error;
  }
};

export const registrarContagem = async (API, inventarioId, produtoId, quantidade, observacao, fetchInventarios, toast) => {
  try {
    await axios.put(`${API}/estoque/inventario/${inventarioId}/registrar-contagem`, null, {
      params: {
        produto_id: produtoId,
        quantidade_contada: quantidade,
        observacao: observacao || undefined
      }
    });
    toast.success('Contagem registrada com sucesso!');
    await fetchInventarios();
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Erro ao registrar contagem');
    throw error;
  }
};

export const finalizarInventario = async (API, inventarioId, aplicarAjustes, fetchInventarios, toast) => {
  try {
    const response = await axios.post(`${API}/estoque/inventario/${inventarioId}/finalizar`, null, {
      params: { aplicar_ajustes: aplicarAjustes }
    });
    
    const divergencias = response.data.total_divergencias;
    const ajustes = response.data.ajustes_aplicados?.length || 0;
    
    if (aplicarAjustes) {
      toast.success(`Inventário finalizado! ${divergencias} divergências encontradas e ${ajustes} ajustes aplicados.`);
    } else {
      toast.success(`Inventário finalizado! ${divergencias} divergências registradas (sem aplicar ajustes).`);
    }
    
    await fetchInventarios();
    return response.data;
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Erro ao finalizar inventário');
    throw error;
  }
};

export const cancelarInventario = async (API, inventarioId, motivo, fetchInventarios, toast) => {
  try {
    await axios.delete(`${API}/estoque/inventario/${inventarioId}/cancelar`, {
      params: { motivo }
    });
    toast.success('Inventário cancelado com sucesso');
    await fetchInventarios();
  } catch (error) {
    toast.error(error.response?.data?.detail || 'Erro ao cancelar inventário');
    throw error;
  }
};
