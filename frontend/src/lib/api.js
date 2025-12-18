/**
 * API Utilities - Helpers para compatibilidade com backend hardened (Etapas 11-14)
 * 
 * Funcionalidades:
 * - Unwrap de respostas do novo envelope {ok, data, meta}
 * - Suporte a Idempotency-Key para ações críticas
 * - Tratamento padronizado de erros (401, 403, 409, 422, 429)
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_BACKEND_URL;

// ============================================
// HELPERS PARA UNWRAP DE RESPOSTAS
// ============================================

/**
 * Unwrap response do novo formato de envelope
 * @param {Object} response - Axios response
 * @returns {any} - data extraído
 */
export function unwrap(response) {
  const data = response?.data;
  
  // Novo formato: { ok: true, data: {...}, message?: "..." }
  if (data && typeof data === 'object' && data.ok !== undefined) {
    return data.data;
  }
  
  // Formato antigo: data direto
  return data;
}

/**
 * Unwrap list response com suporte a paginação
 * @param {Object} response - Axios response
 * @returns {{ items: Array, meta: Object|null }}
 */
export function unwrapList(response) {
  const data = response?.data;
  
  // Novo formato: { ok: true, data: [...], meta: { page, limit, total, pages } }
  if (data && typeof data === 'object' && data.ok !== undefined) {
    return {
      items: Array.isArray(data.data) ? data.data : [],
      meta: data.meta || null
    };
  }
  
  // Formato antigo com .data como array
  if (data && typeof data === 'object' && Array.isArray(data.data)) {
    return {
      items: data.data,
      meta: data.meta || null
    };
  }
  
  // Formato antigo: array direto
  if (Array.isArray(data)) {
    return {
      items: data,
      meta: null
    };
  }
  
  return { items: [], meta: null };
}

// ============================================
// IDEMPOTENCY KEY HELPERS
// ============================================

/**
 * Gera uma chave de idempotência única
 * @returns {string} UUID v4
 */
export function generateIdempotencyKey() {
  // Usar crypto.randomUUID se disponível (browsers modernos)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback para browsers antigos
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Cria headers com Idempotency-Key
 * @param {string} [existingKey] - Chave existente (para retry)
 * @returns {Object} Headers object
 */
export function idempotencyHeaders(existingKey = null) {
  return {
    'Idempotency-Key': existingKey || generateIdempotencyKey()
  };
}

// ============================================
// ERROR HANDLING HELPERS
// ============================================

/**
 * Códigos de erro específicos do backend
 */
export const ERROR_CODES = {
  TWO_FACTOR_REQUIRED: 'TWO_FACTOR_REQUIRED',
  TWO_FACTOR_INVALID: 'TWO_FACTOR_INVALID',
  RATE_LIMITED: 'RATE_LIMITED',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  ALREADY_PAID: 'ALREADY_PAID',
  CONFLICT: 'CONFLICT',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION_ERROR: 'VALIDATION_ERROR'
};

/**
 * Extrai informações de erro de uma resposta axios
 * @param {Error} error - Erro do axios
 * @returns {{ code: string, message: string, detail: any, status: number }}
 */
export function parseError(error) {
  const status = error.response?.status || 0;
  const data = error.response?.data || {};
  
  let code = 'UNKNOWN_ERROR';
  let message = 'Erro desconhecido';
  let detail = data.detail || null;
  
  // Detectar código específico
  if (status === 401) {
    if (detail?.includes?.('2FA') || detail?.includes?.('two_factor') || data.code === 'TWO_FACTOR_REQUIRED') {
      code = ERROR_CODES.TWO_FACTOR_REQUIRED;
      message = 'Autenticação de dois fatores necessária';
    } else if (data.code === 'TWO_FACTOR_INVALID') {
      code = ERROR_CODES.TWO_FACTOR_INVALID;
      message = 'Código 2FA inválido';
    } else {
      code = 'UNAUTHORIZED';
      message = 'Sessão expirada ou credenciais inválidas';
    }
  } else if (status === 403) {
    code = ERROR_CODES.FORBIDDEN;
    message = 'Você não tem permissão para esta ação';
  } else if (status === 409) {
    code = ERROR_CODES.CONFLICT;
    
    // Detectar tipo específico de conflito
    if (typeof detail === 'string') {
      if (detail.toLowerCase().includes('estoque')) {
        code = ERROR_CODES.INSUFFICIENT_STOCK;
        message = detail;
      } else if (detail.toLowerCase().includes('liquidada') || detail.toLowerCase().includes('paga')) {
        code = ERROR_CODES.ALREADY_PAID;
        message = detail;
      } else {
        message = detail;
      }
    } else {
      message = 'Conflito: operação não pode ser completada';
    }
  } else if (status === 422) {
    code = ERROR_CODES.VALIDATION_ERROR;
    // Extrair mensagens de validação
    if (Array.isArray(detail)) {
      message = detail.map(e => e.msg || e.message || String(e)).join('; ');
    } else if (typeof detail === 'string') {
      message = detail;
    } else {
      message = 'Dados inválidos';
    }
  } else if (status === 429) {
    code = ERROR_CODES.RATE_LIMITED;
    message = 'Muitas tentativas. Aguarde alguns segundos antes de tentar novamente.';
  } else if (typeof detail === 'string') {
    message = detail;
  }
  
  return { code, message, detail, status };
}

/**
 * Mensagens amigáveis para códigos de erro
 */
export const ERROR_MESSAGES = {
  [ERROR_CODES.TWO_FACTOR_REQUIRED]: 'Digite o código de autenticação de dois fatores',
  [ERROR_CODES.TWO_FACTOR_INVALID]: 'Código 2FA inválido ou expirado',
  [ERROR_CODES.RATE_LIMITED]: 'Muitas tentativas. Aguarde alguns segundos.',
  [ERROR_CODES.INSUFFICIENT_STOCK]: 'Estoque insuficiente para esta operação',
  [ERROR_CODES.ALREADY_PAID]: 'Esta parcela já foi liquidada',
  [ERROR_CODES.CONFLICT]: 'Conflito: a operação não pode ser completada',
  [ERROR_CODES.FORBIDDEN]: 'Sem permissão para esta ação',
  [ERROR_CODES.VALIDATION_ERROR]: 'Dados inválidos'
};

// ============================================
// AXIOS INSTANCE COM INTERCEPTORS
// ============================================

/**
 * Instância axios configurada (opcional - pode usar axios global)
 */
export const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para adicionar token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================
// STATUS LABELS PADRONIZADOS
// ============================================

/**
 * Labels e cores para status de contas a pagar
 */
export const STATUS_CONTAS_PAGAR = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  pago_parcial: { label: 'Pago Parcial', color: 'bg-blue-100 text-blue-800' },
  pago_total: { label: 'Pago', color: 'bg-green-100 text-green-800' },
  vencido: { label: 'Vencido', color: 'bg-red-100 text-red-800' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' }
};

/**
 * Labels e cores para status de contas a receber
 */
export const STATUS_CONTAS_RECEBER = {
  pendente: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
  recebido_parcial: { label: 'Recebido Parcial', color: 'bg-blue-100 text-blue-800' },
  recebido_total: { label: 'Recebido', color: 'bg-green-100 text-green-800' },
  vencido: { label: 'Vencido', color: 'bg-red-100 text-red-800' },
  cancelado: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' }
};

export default {
  unwrap,
  unwrapList,
  generateIdempotencyKey,
  idempotencyHeaders,
  parseError,
  ERROR_CODES,
  ERROR_MESSAGES,
  apiClient,
  STATUS_CONTAS_PAGAR,
  STATUS_CONTAS_RECEBER
};
