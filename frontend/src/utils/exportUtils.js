/**
 * Utilitários para exportação de dados
 */

/**
 * Converte dados para CSV e faz download
 * @param {Array} data - Array de objetos com os dados
 * @param {string} filename - Nome do arquivo (sem extensão)
 * @param {Array} columns - Array de objetos {key: string, label: string} para definir colunas
 */
export const exportToCSV = (data, filename, columns) => {
  if (!data || data.length === 0) {
    throw new Error('Não há dados para exportar');
  }

  // Criar cabeçalho
  const headers = columns.map(col => col.label).join(',');
  
  // Criar linhas
  const rows = data.map(item => {
    return columns.map(col => {
      let value = item[col.key];
      
      // Tratar valores especiais
      if (value === null || value === undefined) {
        value = '';
      } else if (typeof value === 'boolean') {
        value = value ? 'Sim' : 'Não';
      } else if (typeof value === 'object') {
        value = JSON.stringify(value);
      } else if (typeof value === 'string') {
        // Escapar aspas e adicionar aspas se contiver vírgula ou quebra de linha
        value = value.replace(/"/g, '""');
        if (value.includes(',') || value.includes('\n') || value.includes('"')) {
          value = `"${value}"`;
        }
      }
      
      return value;
    }).join(',');
  });

  // Combinar cabeçalho e linhas
  const csv = [headers, ...rows].join('\n');
  
  // Criar Blob e fazer download
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Formata data para exibição
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

/**
 * Formata moeda para exibição
 */
export const formatCurrency = (value) => {
  if (value === null || value === undefined) return 'R$ 0,00';
  return `R$ ${parseFloat(value).toFixed(2).replace('.', ',')}`;
};

/**
 * Formata CPF/CNPJ
 */
export const formatCpfCnpj = (value) => {
  if (!value) return '';
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    // CPF: 000.000.000-00
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleaned.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return value;
};
