/**
 * Utilitário para formatação de datas no formato brasileiro
 */

/**
 * Formata data para DD/MM/YYYY
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada como DD/MM/YYYY
 */
export const formatDateBR = (date) => {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Formata data para MM/YYYY
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada como MM/YYYY
 */
export const formatMonthYearBR = (date) => {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${month}/${year}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Formata data e hora para DD/MM/YYYY HH:MM
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} Data formatada como DD/MM/YYYY HH:MM
 */
export const formatDateTimeBR = (date) => {
  if (!date) return '-';
  
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return '-';
  }
};

/**
 * Formata string de data YYYY-MM-DD para DD/MM/YYYY
 * @param {string} dateString - String de data no formato YYYY-MM-DD
 * @returns {string} Data formatada como DD/MM/YYYY
 */
export const formatDateStringBR = (dateString) => {
  if (!dateString) return '-';
  
  try {
    // Se já está no formato DD/MM/YYYY, retorna como está
    if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      return dateString;
    }
    
    // Se está no formato YYYY-MM-DD
    if (dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [year, month, day] = dateString.split('T')[0].split('-');
      return `${day}/${month}/${year}`;
    }
    
    // Tenta parsear como data
    return formatDateBR(dateString);
  } catch (error) {
    return dateString;
  }
};
