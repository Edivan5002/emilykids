# 📦 Backup e Restauração do Banco de Dados MongoDB

## ERP Emily Kids / InventoAI

---

## 📋 Arquivos Incluídos

| Arquivo | Descrição |
|---------|-----------|
| `export_database.py` | Script Python de exportação |
| `import_database.py` | Script Python de importação |
| `exportar_banco.bat` | Atalho Windows para exportar |
| `importar_banco.bat` | Atalho Windows para importar |
| `exportar_banco.sh` | Atalho Linux/macOS para exportar |
| `importar_banco.sh` | Atalho Linux/macOS para importar |
| `inventoai_db_backup.json` | Arquivo de backup (gerado após exportação) |

---

## 🚀 Como Usar

### Pré-requisitos

1. **Python 3.8+** instalado
2. **MongoDB** instalado e rodando
3. Biblioteca `pymongo` (instalada automaticamente)

### Windows

**Para EXPORTAR (no servidor/Emergent):**
```
Dê duplo clique em: exportar_banco.bat
```

**Para IMPORTAR (na sua máquina local):**
```
Dê duplo clique em: importar_banco.bat
```

### Linux / macOS

**Para EXPORTAR:**
```bash
chmod +x exportar_banco.sh
./exportar_banco.sh
```

**Para IMPORTAR:**
```bash
chmod +x importar_banco.sh
./importar_banco.sh
```

### Via Python diretamente

```bash
# Exportar
python export_database.py

# Importar
python import_database.py
```

---

## 🔧 Configuração

Por padrão, os scripts conectam em:
- **URL:** `mongodb://localhost:27017`
- **Banco:** `inventoai_db`

Para alterar, defina variáveis de ambiente:

```bash
# Windows
set MONGO_URL=mongodb://usuario:senha@servidor:27017
python export_database.py

# Linux/macOS
export MONGO_URL=mongodb://usuario:senha@servidor:27017
python export_database.py
```

---

## 📝 Opções de Importação

Ao executar a importação, você terá 3 opções:

### [1] 🔄 SUBSTITUIR TUDO
- Remove **TODOS** os dados existentes
- Importa o backup completo
- Recomendado para: primeira instalação, reset completo

### [2] ➕ MANTER E ADICIONAR
- Mantém dados existentes
- Adiciona apenas documentos novos (que não existem)
- Recomendado para: atualização de estrutura, merge de dados

### [3] ❌ CANCELAR
- Sai sem fazer alterações

---

## 📊 O Que é Exportado

- ✅ Todas as collections (tabelas)
- ✅ Todos os documentos (registros)
- ✅ Todos os índices (com configurações)
- ✅ Metadados (data, versão)

### Collections incluídas:

- `usuarios` / `users` - Usuários do sistema
- `roles` - Papéis e permissões
- `permissions` - Permissões detalhadas
- `clientes` - Cadastro de clientes
- `fornecedores` - Cadastro de fornecedores
- `produtos` - Cadastro de produtos
- `categorias` / `subcategorias` / `marcas` - Classificações
- `vendas` / `orcamentos` - Vendas e orçamentos
- `contas_receber` / `contas_pagar` - Financeiro
- `movimentacoes_estoque` - Movimentações
- `logs` / `logs_seguranca` - Auditoria
- E outras...

---

## ⚠️ Solução de Problemas

### Erro: "MongoDB não conectado"
```
Verifique se o MongoDB está rodando:
- Windows: Serviços > MongoDB Server
- Linux: sudo systemctl status mongod
```

### Erro: "pymongo não encontrado"
```bash
pip install pymongo
```

### Erro: "Permissão negada" (Linux/macOS)
```bash
chmod +x *.sh
```

### Erro: "Arquivo de backup não encontrado"
```
Execute primeiro a exportação para gerar o arquivo:
python export_database.py
```

---

## 📞 Suporte

Em caso de dúvidas, consulte a documentação do projeto ou entre em contato com o desenvolvedor.

---

*Gerado automaticamente pelo sistema ERP Emily Kids*
