# 🔐 Documentação de Autenticação - Emily Kids ERP

## ✅ Status Atual (06/12/2025)

O sistema de autenticação foi **VALIDADO** e está funcionando corretamente com 100% de sucesso nos testes.

## 📋 Schema Padronizado de Usuários

### Coleção MongoDB: `users`

```json
{
  "id": "uuid-v4-string",
  "email": "user@example.com",
  "nome": "Nome do Usuário",
  "senha_hash": "bcrypt-hash",
  "papel": "admin|gerente|vendedor|visualizador",
  "role_id": "uuid-reference-to-roles-collection",
  "ativo": true,
  "created_at": "2025-12-06T00:00:00.000000+00:00",
  "updated_at": "2025-12-06T00:00:00.000000+00:00",
  
  // Segurança
  "login_attempts": 0,
  "locked_until": null,
  "senha_ultimo_change": "2025-12-06T00:00:00.000000+00:00",
  "senha_historia": [],
  "require_2fa": false,
  
  // RBAC
  "grupos": [],
  "permissoes": []
}
```

### Campos Importantes

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `id` | String (UUID) | ✅ | Identificador único |
| `email` | EmailStr | ✅ | Email único do usuário |
| `nome` | String | ✅ | Nome completo |
| `senha_hash` | String | ✅ | Hash bcrypt da senha |
| `papel` | String | ✅ | Papel legado (admin, gerente, vendedor, visualizador) |
| `role_id` | String (UUID) | ❌ | Referência ao papel RBAC |
| `ativo` | Boolean | ✅ | Status do usuário (default: true) |

## 🔑 Endpoints de Autenticação

### 1. Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "senha": "password"
}
```

**Resposta de Sucesso (200):**
```json
{
  "access_token": "jwt-token",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "nome": "Nome",
    "papel": "admin",
    "role_id": "uuid",
    "ativo": true,
    "permissoes": ["modulo:acao", ...]
  }
}
```

**Respostas de Erro:**
- `401`: Credenciais inválidas
- `403`: Usuário inativo ou conta bloqueada

### 2. Logout
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

### 3. Criar Usuário (Admin apenas)
```http
POST /api/usuarios
Authorization: Bearer {admin-token}
Content-Type: application/json

{
  "email": "new@example.com",
  "nome": "Novo Usuário",
  "senha": "password",
  "papel": "vendedor",
  "role_id": "uuid-optional"
}
```

## 🔒 Segurança Implementada

### 1. Proteção contra Brute Force
- **Limite**: 5 tentativas falhadas
- **Bloqueio**: 30 minutos após 5 tentativas
- **Reset**: Tentativas resetadas após login bem-sucedido

### 2. Validação de Senha
- **Mínimo**: 6 caracteres
- **Hash**: bcrypt
- **Histórico**: Senhas antigas armazenadas em `senha_historia`

### 3. Expiração de Senha
- **Política**: 90 dias
- **Validação**: No login, se `senha_ultimo_change` > 90 dias

### 4. Sessões
- **Coleção**: `user_sessions`
- **Expiração**: 24 horas
- **Logout**: Invalida sessão específica

## 📊 Testes de Validação

Todos os testes passaram com **100% de sucesso**:

| Teste | Status | Descrição |
|-------|--------|-----------|
| Admin Login | ✅ | Login com credenciais válidas |
| Invalid Credentials | ✅ | Rejeição de email inexistente |
| Wrong Password | ✅ | Rejeição de senha incorreta |
| Missing Fields | ✅ | Validação de campos obrigatórios |
| Create User | ✅ | Criação de novo usuário e login |
| Weak Password | ✅ | Rejeição de senha < 6 caracteres |

### Executar Testes
```bash
cd /app
python3 test_authentication.py
```

## ⚠️ Inconsistências Resolvidas

### Campo `papel_id` vs `role_id`
**Status**: ✅ Resolvido

O código já trata ambos os casos:
```python
role_id = current_user.get("papel_id") or current_user.get("role_id")
```

O campo correto no banco é `role_id` e todos os usuários existentes usam este campo.

### Coleção `users` vs `usuarios`
**Status**: ✅ Correto

- Coleção MongoDB: `users` ✓
- Endpoints REST: `/api/usuarios` ✓

Não há inconsistência - é uma questão de convenção (inglês no DB, português na API).

### Campo `senha` vs `senha_hash`
**Status**: ✅ Correto

- Input da API: `senha` (plaintext)
- Armazenamento: `senha_hash` (bcrypt)
- Não há inconsistência

## 🎯 Credenciais de Teste

### Admin
```
Email: edivancelestino@yahoo.com.br
Senha: 123456
```

### Alternativas
```
Email: admin@emilykids.com
Senha: Admin@123
```

## 📝 Logs de Autenticação

Todos os eventos de login são registrados na coleção `logs` com:
- IP do usuário
- User agent
- Timestamp
- Resultado (sucesso/falha)
- Motivo de falha

### Severidades
- `INFO`: Login bem-sucedido
- `WARNING`: Tentativa falhada, usuário inativo
- `SECURITY`: Conta bloqueada, múltiplas tentativas

## 🔧 Manutenção

### Desbloquear Usuário Manualmente
```javascript
// MongoDB
db.users.updateOne(
  {email: "user@example.com"},
  {$set: {locked_until: null, login_attempts: 0}}
)
```

### Redefinir Senha
```javascript
// MongoDB (use bcrypt para gerar hash)
db.users.updateOne(
  {email: "user@example.com"},
  {$set: {
    senha_hash: "novo-bcrypt-hash",
    senha_ultimo_change: new Date().toISOString(),
    login_attempts: 0,
    locked_until: null
  }}
)
```

### Verificar Sessões Ativas
```javascript
// MongoDB
db.user_sessions.find({ativo: true, user_id: "user-uuid"})
```

## ✅ Conclusão

O sistema de autenticação está **ESTÁVEL** e **SEGURO** com:
- ✅ Validação de credenciais
- ✅ Proteção contra brute force
- ✅ Gerenciamento de sessões
- ✅ Logging completo
- ✅ Schema padronizado
- ✅ 100% de testes passando

**Última atualização**: 06/12/2025
**Validado por**: E1 Agent
**Status**: PRODUCTION READY ✅
