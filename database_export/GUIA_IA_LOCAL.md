# 🤖 Guia Completo: Configurar IA Insights para Ambiente Local

## Visão Geral

O módulo de **IA Insights** do ERP Emily Kids utiliza a biblioteca `emergentintegrations` da plataforma Emergent para fazer chamadas ao GPT-4 da OpenAI. Para funcionar localmente, você tem **2 opções**:

| Opção | Descrição | Custo | Dificuldade |
|-------|-----------|-------|-------------|
| **Opção A** | Usar OpenAI API diretamente | ~$0.03/1K tokens | Fácil |
| **Opção B** | Usar biblioteca emergentintegrations com sua chave | Depende do plano | Muito Fácil |

---

## 📍 Localização do Código a Alterar

O módulo de IA está em:
```
backend/server.py
```

### Linhas que usam IA:

| Linha | Função | Endpoint | Descrição |
|-------|--------|----------|-----------|
| 9015-9020 | `previsao_demanda` | POST /api/ia/previsao-demanda | Previsão de demanda de produtos |
| 9110-9115 | `recomendacoes_cliente` | POST /api/ia/recomendacoes-cliente | Recomendações personalizadas |
| 9233-9238 | `analise_preditiva` | GET /api/ia/analise-preditiva | Análise geral do negócio |
| 9341-9345 | `otimizar_precos` | POST /api/ia/otimizar-precos | Sugestões de preços |

---

## Opção A: Usar OpenAI API Diretamente (RECOMENDADO)

### Passo 1: Obter Chave da OpenAI

1. Acesse: https://platform.openai.com/api-keys
2. Faça login ou crie uma conta
3. Clique em "+ Create new secret key"
4. Copie a chave (começa com `sk-...`)
5. **IMPORTANTE**: Adicione créditos em https://platform.openai.com/account/billing

### Passo 2: Instalar Biblioteca OpenAI

```bash
# Na pasta backend
cd backend
pip install openai
```

### Passo 3: Atualizar o arquivo .env

Abra o arquivo `backend/.env` e adicione:

```env
# Chave da API OpenAI
OPENAI_API_KEY=sk-sua-chave-aqui
```

### Passo 4: Alterar o Código do server.py

#### 4.1 Alterar a linha 17 (import)

**ANTES:**
```python
from emergentintegrations.llm.chat import LlmChat, UserMessage
```

**DEPOIS:**
```python
from openai import AsyncOpenAI
```

#### 4.2 Adicionar função auxiliar após os imports (linha ~50)

Adicione esta função após os imports:

```python
# Cliente OpenAI global
openai_client = None

def get_openai_client():
    global openai_client
    if openai_client is None:
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("OPENAI_API_KEY não configurada no .env")
        openai_client = AsyncOpenAI(api_key=api_key)
    return openai_client

async def chat_completion(system_message: str, user_prompt: str, model: str = "gpt-4") -> str:
    """Função auxiliar para chamadas ao GPT"""
    client = get_openai_client()
    response = await client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_prompt}
        ],
        max_tokens=2000,
        temperature=0.7
    )
    return response.choices[0].message.content
```

#### 4.3 Alterar a função de previsão de demanda (linhas 9014-9046)

**ANTES (linhas 9014-9046):**
```python
        # Usar GPT-4 para análise
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"previsao-{produto_id}-{datetime.now().isoformat()}",
            system_message="Você é um especialista em análise de vendas e previsão de demanda. Forneça análises objetivas e práticas."
        ).with_model("openai", "gpt-4")
        
        prompt = f"""Analise os seguintes dados..."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
```

**DEPOIS:**
```python
        # Usar GPT-4 para análise
        system_message = "Você é um especialista em análise de vendas e previsão de demanda. Forneça análises objetivas e práticas."
        
        prompt = f"""Analise os seguintes dados..."""
        
        response = await chat_completion(system_message, prompt, "gpt-4")
```

#### 4.4 Alterar a função de recomendações ao cliente (linhas 9109-9149)

**ANTES (linhas 9109-9149):**
```python
        # Usar GPT-4 para recomendações
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"recomendacao-{cliente_id}-{datetime.now().isoformat()}",
            system_message="Você é um especialista em análise de comportamento de compra e recomendação de produtos. Forneça recomendações personalizadas e estratégicas."
        ).with_model("openai", "gpt-4")
        
        prompt = f"""Analise o perfil de compras..."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
```

**DEPOIS:**
```python
        # Usar GPT-4 para recomendações
        system_message = "Você é um especialista em análise de comportamento de compra e recomendação de produtos. Forneça recomendações personalizadas e estratégicas."
        
        prompt = f"""Analise o perfil de compras..."""
        
        response = await chat_completion(system_message, prompt, "gpt-4")
```

#### 4.5 Alterar a função de análise preditiva (linhas 9232-9270)

**ANTES:**
```python
        # Usar GPT-4 para análise preditiva geral
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"analise-preditiva-{datetime.now().isoformat()}",
            system_message="Você é um especialista em análise de negócios e business intelligence. Forneça insights estratégicos e previsões de mercado."
        ).with_model("openai", "gpt-4")
        
        prompt = f"""Realize uma análise preditiva..."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
```

**DEPOIS:**
```python
        # Usar GPT-4 para análise preditiva geral
        system_message = "Você é um especialista em análise de negócios e business intelligence. Forneça insights estratégicos e previsões de mercado."
        
        prompt = f"""Realize uma análise preditiva..."""
        
        response = await chat_completion(system_message, prompt, "gpt-4")
```

#### 4.6 Alterar a função de otimização de preços (linhas 9340-9380)

**ANTES:**
```python
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"otimizar-precos-{datetime.now().isoformat()}",
            system_message="Você é um especialista em precificação e estratégias de pricing. Forneça análises de preços baseadas em dados de mercado e concorrência."
        ).with_model("openai", "gpt-4")
        
        prompt = f"""Analise os preços dos produtos..."""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
```

**DEPOIS:**
```python
        # Usar GPT-4 para otimização de preços
        system_message = "Você é um especialista em precificação e estratégias de pricing. Forneça análises de preços baseadas em dados de mercado e concorrência."
        
        prompt = f"""Analise os preços dos produtos..."""
        
        response = await chat_completion(system_message, prompt, "gpt-4")
```

---

## Opção B: Continuar Usando emergentintegrations

Se você preferir continuar usando a biblioteca emergentintegrations (necessário ter conta na plataforma Emergent):

### Passo 1: Instalar a biblioteca

```bash
pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/
```

### Passo 2: Obter sua Universal Key

1. Acesse sua conta na plataforma Emergent
2. Vá em Profile → Universal Key
3. Copie a chave

### Passo 3: Configurar no .env

```env
EMERGENT_LLM_KEY=sua-universal-key-aqui
```

### Passo 4: Nenhuma alteração de código necessária

O código já está pronto para usar!

---

## 📋 Resumo das Alterações (Opção A)

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `backend/server.py` | 17 | Trocar import `emergentintegrations` por `openai` |
| `backend/server.py` | ~50 | Adicionar função `chat_completion` |
| `backend/server.py` | 9014-9046 | Substituir `LlmChat` por `chat_completion` |
| `backend/server.py` | 9109-9149 | Substituir `LlmChat` por `chat_completion` |
| `backend/server.py` | 9232-9270 | Substituir `LlmChat` por `chat_completion` |
| `backend/server.py` | 9340-9380 | Substituir `LlmChat` por `chat_completion` |
| `backend/.env` | - | Adicionar `OPENAI_API_KEY` |
| `backend/requirements.txt` | - | Adicionar `openai>=1.0.0` |

---

## 🧪 Testando a IA Local

Após as alterações, teste os endpoints:

```bash
# 1. Previsão de demanda
curl -X POST http://localhost:8001/api/ia/previsao-demanda \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"produto_id": "ID_DO_PRODUTO"}'

# 2. Análise preditiva geral
curl -X GET http://localhost:8001/api/ia/analise-preditiva \
  -H "Authorization: Bearer SEU_TOKEN"

# 3. Recomendações para cliente
curl -X POST http://localhost:8001/api/ia/recomendacoes-cliente \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cliente_id": "ID_DO_CLIENTE"}'
```

---

## 💰 Estimativa de Custos (OpenAI)

| Modelo | Custo Input | Custo Output | Uso Típico |
|--------|-------------|--------------|------------|
| GPT-4 | $0.03/1K tokens | $0.06/1K tokens | Análises complexas |
| GPT-3.5-Turbo | $0.0015/1K tokens | $0.002/1K tokens | Uso frequente |

**Recomendação**: Para economizar, troque `"gpt-4"` por `"gpt-3.5-turbo"` na função `chat_completion`:

```python
response = await chat_completion(system_message, prompt, "gpt-3.5-turbo")
```

---

## ⚠️ Solução de Problemas

### Erro: "OPENAI_API_KEY não configurada"
- Verifique se o arquivo `.env` tem a variável `OPENAI_API_KEY`
- Verifique se o servidor foi reiniciado após adicionar a variável

### Erro: "Rate limit exceeded"
- Você atingiu o limite de requisições da API
- Aguarde 1 minuto ou adicione mais créditos

### Erro: "Insufficient quota"
- Adicione créditos em https://platform.openai.com/account/billing

### Erro: "Model not found"
- Verifique se você tem acesso ao GPT-4
- Troque para `gpt-3.5-turbo` se não tiver acesso

---

## 📝 Arquivo requirements.txt Atualizado

Adicione esta linha ao seu `backend/requirements.txt`:

```
openai>=1.0.0
```

E remova ou comente a linha:
```
# emergentintegrations  # Comentar para uso local
```

---

*Guia criado para migração do ERP Emily Kids - Módulo IA Insights*
