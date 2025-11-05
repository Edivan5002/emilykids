#!/bin/bash

# Primeiro fazer login para pegar o token
echo "=== FAZENDO LOGIN ==="
LOGIN_RESPONSE=$(curl -s -X POST "${REACT_APP_BACKEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "edivancelestino@yahoo.com.br",
    "password": "123456"
  }')

echo "Login response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | sed 's/"access_token":"//')
echo "Token extraído: $TOKEN"

# Testar criação de fornecedor
echo ""
echo "=== TESTANDO CRIAÇÃO DE FORNECEDOR ==="
curl -v -X POST "${REACT_APP_BACKEND_URL}/api/fornecedores" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "razao_social": "Teste Fornecedor LTDA",
    "cnpj": "12345678000190",
    "ie": "123456789",
    "telefone": "(11) 98765-4321",
    "email": "teste@fornecedor.com",
    "endereco": {
      "logradouro": "Rua Teste",
      "numero": "123",
      "complemento": "Sala 1",
      "bairro": "Centro",
      "cidade": "São Paulo",
      "estado": "SP",
      "cep": "01234-567"
    }
  }'
