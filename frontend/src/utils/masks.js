/**
 * Utilitários de Máscaras e Validações para formulários brasileiros
 */

// === MÁSCARAS ===

// Máscara de CPF: 000.000.000-00
export const maskCPF = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

// Máscara de CNPJ: 00.000.000/0000-00
export const maskCNPJ = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

// Máscara de CPF ou CNPJ (automática)
export const maskCPFCNPJ = (value) => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return maskCPF(numbers);
  }
  return maskCNPJ(numbers);
};

// Máscara de Telefone: (00) 00000-0000 ou (00) 0000-0000
export const maskPhone = (value) => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
};

// Máscara de CEP: 00000-000
export const maskCEP = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
};

// Máscara de IE (Inscrição Estadual) - genérica
export const maskIE = (value) => {
  if (!value) return '';
  return value.replace(/\D/g, '').slice(0, 14);
};

// Máscara de RG
export const maskRG = (value) => {
  if (!value) return '';
  return value
    .replace(/[^0-9Xx]/g, '')
    .slice(0, 12)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})([0-9Xx]{1,2})$/, '$1-$2');
};

// Máscara de data: DD/MM/AAAA
export const maskDate = (value) => {
  if (!value) return '';
  return value
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2');
};

// Máscara de moeda: R$ 0,00
export const maskMoney = (value) => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  const amount = (parseInt(numbers || '0', 10) / 100).toFixed(2);
  return `R$ ${amount.replace('.', ',')}`;
};

// === VALIDAÇÕES ===

// Validar CPF
export const validateCPF = (cpf) => {
  if (!cpf) return false;
  cpf = cpf.replace(/\D/g, '');
  
  if (cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false; // Todos dígitos iguais
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.charAt(10))) return false;
  
  return true;
};

// Validar CNPJ
export const validateCNPJ = (cnpj) => {
  if (!cnpj) return false;
  cnpj = cnpj.replace(/\D/g, '');
  
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  let size = cnpj.length - 2;
  let numbers = cnpj.substring(0, size);
  const digits = cnpj.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cnpj.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

// Validar CPF ou CNPJ
export const validateCPFCNPJ = (value) => {
  if (!value) return false;
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 11) return validateCPF(numbers);
  if (numbers.length === 14) return validateCNPJ(numbers);
  return false;
};

// Validar Email
export const validateEmail = (email) => {
  if (!email) return true; // Opcional
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validar Telefone
export const validatePhone = (phone) => {
  if (!phone) return true; // Opcional
  const numbers = phone.replace(/\D/g, '');
  return numbers.length >= 10 && numbers.length <= 11;
};

// Validar CEP
export const validateCEP = (cep) => {
  if (!cep) return true; // Opcional
  const numbers = cep.replace(/\D/g, '');
  return numbers.length === 8;
};

// Validar Data de Nascimento (idade mínima 18 anos para alguns casos)
export const validateBirthDate = (date, minAge = 0) => {
  if (!date) return true;
  const parts = date.split('/');
  if (parts.length !== 3) return false;
  
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  
  const birthDate = new Date(year, month, day);
  if (isNaN(birthDate.getTime())) return false;
  
  if (minAge > 0) {
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      return age - 1 >= minAge;
    }
    return age >= minAge;
  }
  
  return true;
};

// === BUSCA CEP (ViaCEP) ===
export const fetchAddressByCEP = async (cep) => {
  const cleanCEP = cep.replace(/\D/g, '');
  if (cleanCEP.length !== 8) return null;
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      logradouro: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || '',
      complemento: data.complemento || ''
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

// === HELPERS ===

// Remover máscara (apenas números)
export const unmask = (value) => {
  if (!value) return '';
  return value.replace(/\D/g, '');
};

// Formatar CPF/CNPJ para exibição
export const formatCPFCNPJ = (value) => {
  if (!value) return '-';
  return maskCPFCNPJ(value);
};

// Formatar telefone para exibição
export const formatPhone = (value) => {
  if (!value) return '-';
  return maskPhone(value);
};

// Formatar CEP para exibição
export const formatCEP = (value) => {
  if (!value) return '-';
  return maskCEP(value);
};

// Lista de estados brasileiros
export const ESTADOS_BR = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

// Tipo de pessoa
export const TIPO_PESSOA = {
  FISICA: 'fisica',
  JURIDICA: 'juridica'
};

// Detectar tipo de pessoa pelo documento
export const detectTipoPessoa = (documento) => {
  if (!documento) return null;
  const numbers = documento.replace(/\D/g, '');
  if (numbers.length <= 11) return TIPO_PESSOA.FISICA;
  return TIPO_PESSOA.JURIDICA;
};
