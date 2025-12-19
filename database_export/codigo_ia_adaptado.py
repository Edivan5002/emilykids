"""
============================================================
CÓDIGO DE IA ADAPTADO PARA USO LOCAL
============================================================
Este arquivo contém o código do módulo de IA já adaptado
para funcionar localmente com a API da OpenAI.

COMO USAR:
1. Copie este código para o seu server.py
2. Substitua as funções de IA existentes por estas
3. Configure sua OPENAI_API_KEY no .env
============================================================
"""

# ============================================================
# IMPORTS NECESSÁRIOS (adicionar no topo do server.py)
# ============================================================
import os
from openai import AsyncOpenAI

# ============================================================
# CLIENTE OPENAI E FUNÇÃO AUXILIAR
# (adicionar após os imports, antes das definições de rotas)
# ============================================================

_openai_client = None

def get_openai_client():
    """Retorna cliente OpenAI singleton"""
    global _openai_client
    if _openai_client is None:
        api_key = os.environ.get('OPENAI_API_KEY')
        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY não configurada. "
                "Adicione no arquivo .env: OPENAI_API_KEY=sk-sua-chave-aqui"
            )
        _openai_client = AsyncOpenAI(api_key=api_key)
    return _openai_client


async def chat_completion(
    system_message: str, 
    user_prompt: str, 
    model: str = "gpt-4"
) -> str:
    """
    Função auxiliar para chamadas ao GPT.
    
    Args:
        system_message: Define o comportamento/persona do assistente
        user_prompt: O prompt/pergunta do usuário
        model: Modelo a usar (gpt-4, gpt-4-turbo, gpt-3.5-turbo)
    
    Returns:
        Resposta do modelo como string
    
    Custos aproximados por 1000 tokens:
        - gpt-4: $0.03 input / $0.06 output
        - gpt-4-turbo: $0.01 input / $0.03 output  
        - gpt-3.5-turbo: $0.0015 input / $0.002 output
    """
    try:
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
        
    except Exception as e:
        error_msg = str(e)
        if "api_key" in error_msg.lower():
            return "Erro: Chave da API OpenAI inválida ou não configurada."
        elif "rate_limit" in error_msg.lower():
            return "Erro: Limite de requisições atingido. Aguarde alguns segundos."
        elif "insufficient_quota" in error_msg.lower():
            return "Erro: Sem créditos na API OpenAI. Adicione créditos em platform.openai.com"
        else:
            return f"Erro na análise de IA: {error_msg}"


# ============================================================
# ENDPOINT: PREVISÃO DE DEMANDA
# POST /api/ia/previsao-demanda
# ============================================================

@api_router.post("/ia/previsao-demanda")
async def previsao_demanda(
    request: PrevisaoDemandaRequest, 
    current_user: dict = Depends(get_current_user)
):
    """
    Analisa vendas históricas de um produto e prevê demanda futura.
    Usa IA para fornecer insights e recomendações de estoque.
    """
    try:
        produto_id = request.produto_id
        
        # Buscar produto
        produto = await db.produtos.find_one({"id": produto_id}, {"_id": 0})
        if not produto:
            raise HTTPException(status_code=404, detail="Produto não encontrado")
        
        # Buscar vendas com este produto
        vendas = await db.vendas.find({}, {"_id": 0}).to_list(1000)
        
        # Calcular estatísticas
        total_vendido = 0
        quantidade_vendas = 0
        vendas_por_mes = {}
        
        for venda in vendas:
            for item in venda.get("itens", []):
                if item["produto_id"] == produto_id:
                    total_vendido += item["quantidade"]
                    quantidade_vendas += 1
                    
                    # Agrupar por mês
                    mes = venda["created_at"][:7]
                    if mes not in vendas_por_mes:
                        vendas_por_mes[mes] = 0
                    vendas_por_mes[mes] += item["quantidade"]
        
        media_mensal = total_vendido / max(len(vendas_por_mes), 1)
        
        # === CHAMADA À IA (ADAPTADO PARA LOCAL) ===
        system_message = (
            "Você é um especialista em análise de vendas e previsão de demanda. "
            "Forneça análises objetivas e práticas."
        )
        
        prompt = f"""Analise os seguintes dados de vendas do produto "{produto['nome']}":

DADOS ATUAIS:
- Estoque Atual: {produto['estoque_atual']} unidades
- Estoque Mínimo Configurado: {produto['estoque_minimo']} unidades
- Estoque Máximo Configurado: {produto.get('estoque_maximo', 'Não definido')} unidades
- Preço de Venda: R$ {produto['preco_venda']:.2f}

HISTÓRICO DE VENDAS:
- Total Vendido (histórico completo): {total_vendido} unidades
- Número de Vendas: {quantidade_vendas} transações
- Média Mensal de Vendas: {media_mensal:.2f} unidades/mês
- Vendas por Mês: {vendas_por_mes}

TAREFA:
1. Faça uma previsão de demanda para os próximos 30 dias
2. Calcule a quantidade sugerida para compra/produção
3. Identifique tendências e padrões de venda
4. Forneça recomendações estratégicas de estoque
5. Avalie se o estoque atual é suficiente

Formate sua resposta de forma estruturada e objetiva."""
        
        response = await chat_completion(system_message, prompt, "gpt-4")
        
        return {
            "success": True,
            "produto": {
                "id": produto["id"],
                "nome": produto["nome"],
                "sku": produto.get("sku"),
                "estoque_atual": produto["estoque_atual"],
                "estoque_minimo": produto["estoque_minimo"],
                "preco_venda": produto["preco_venda"]
            },
            "estatisticas": {
                "total_vendido": total_vendido,
                "quantidade_vendas": quantidade_vendas,
                "media_mensal": round(media_mensal, 2),
                "vendas_por_mes": vendas_por_mes
            },
            "analise_ia": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")


# ============================================================
# ENDPOINT: RECOMENDAÇÕES PARA CLIENTE
# POST /api/ia/recomendacoes-cliente
# ============================================================

@api_router.post("/ia/recomendacoes-cliente")
async def recomendacoes_cliente(
    request: RecomendacoesClienteRequest, 
    current_user: dict = Depends(get_current_user)
):
    """
    Analisa histórico de compras do cliente e sugere produtos.
    Usa IA para personalizar recomendações de cross-sell e up-sell.
    """
    try:
        cliente_id = request.cliente_id
        
        # Buscar cliente
        cliente = await db.clientes.find_one({"id": cliente_id}, {"_id": 0})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Buscar histórico de compras
        vendas = await db.vendas.find({"cliente_id": cliente_id}, {"_id": 0}).to_list(1000)
        
        # Analisar compras
        produtos_comprados = []
        total_gasto = 0
        
        for venda in vendas:
            total_gasto += venda.get("total", 0)
            for item in venda.get("itens", []):
                produto = await db.produtos.find_one({"id": item["produto_id"]}, {"_id": 0})
                if produto:
                    produtos_comprados.append({
                        "nome": produto["nome"],
                        "quantidade": item["quantidade"],
                        "valor": item["preco_unitario"]
                    })
        
        # Buscar produtos disponíveis
        produtos_disponiveis = await db.produtos.find(
            {"ativo": True}, 
            {"_id": 0}
        ).to_list(50)
        
        # === CHAMADA À IA (ADAPTADO PARA LOCAL) ===
        system_message = (
            "Você é um especialista em análise de comportamento de compra "
            "e recomendação de produtos. Forneça recomendações personalizadas "
            "e estratégicas."
        )
        
        # Montar lista de produtos para o prompt
        produtos_lista = "\n".join([
            f"- {p['nome']} (R$ {p['preco_venda']:.2f})" 
            for p in produtos_disponiveis[:30]
        ])
        
        compras_lista = "\n".join([
            f"- {p['nome']} ({p['quantidade']}x) - R$ {p['valor']:.2f}" 
            for p in produtos_comprados[:15]
        ])
        
        prompt = f"""Analise o perfil de compras do cliente "{cliente['nome']}" e forneça recomendações:

PERFIL DO CLIENTE:
- Nome: {cliente['nome']}
- Email: {cliente.get('email', 'Não informado')}
- Total Gasto: R$ {total_gasto:.2f}
- Número de Compras: {len(vendas)}

HISTÓRICO DE COMPRAS:
{compras_lista if compras_lista else "Nenhuma compra registrada"}

PRODUTOS DISPONÍVEIS NO CATÁLOGO:
{produtos_lista}

TAREFA:
1. Identifique padrões de compra e preferências do cliente
2. Sugira 5-8 produtos específicos que o cliente pode ter interesse
3. Explique o motivo de cada recomendação (baseado no histórico)
4. Sugira estratégias de cross-sell e up-sell
5. Avalie o perfil de valor do cliente (ticket médio, frequência)

Formate sua resposta de forma estruturada e persuasiva."""
        
        response = await chat_completion(system_message, prompt, "gpt-4")
        
        return {
            "success": True,
            "cliente": {
                "id": cliente["id"],
                "nome": cliente["nome"],
                "email": cliente.get("email"),
                "cpf_cnpj": cliente.get("cpf_cnpj")
            },
            "estatisticas": {
                "total_compras": len(vendas),
                "total_gasto": round(total_gasto, 2),
                "ticket_medio": round(total_gasto / max(len(vendas), 1), 2),
                "produtos_distintos": len(set([p["nome"] for p in produtos_comprados]))
            },
            "recomendacoes_ia": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")


# ============================================================
# ENDPOINT: ANÁLISE PREDITIVA GERAL
# GET /api/ia/analise-preditiva
# ============================================================

@api_router.get("/ia/analise-preditiva")
async def analise_preditiva(current_user: dict = Depends(get_current_user)):
    """
    Realiza análise preditiva completa do negócio.
    Usa IA para identificar tendências e fornecer previsões.
    """
    try:
        # Coletar dados gerais do sistema
        total_clientes = await db.clientes.count_documents({})
        total_produtos = await db.produtos.count_documents({"ativo": True})
        
        vendas = await db.vendas.find({}, {"_id": 0}).to_list(1000)
        produtos = await db.produtos.find({"ativo": True}, {"_id": 0}).to_list(1000)
        
        # Calcular métricas
        total_vendas = len(vendas)
        faturamento_total = sum(v.get("total", 0) for v in vendas)
        ticket_medio = faturamento_total / max(total_vendas, 1)
        
        # Produtos mais vendidos
        vendas_por_produto = {}
        for venda in vendas:
            for item in venda.get("itens", []):
                pid = item["produto_id"]
                if pid not in vendas_por_produto:
                    vendas_por_produto[pid] = {"quantidade": 0, "valor": 0}
                vendas_por_produto[pid]["quantidade"] += item["quantidade"]
                vendas_por_produto[pid]["valor"] += item["quantidade"] * item["preco_unitario"]
        
        top_produtos = sorted(
            vendas_por_produto.items(), 
            key=lambda x: x[1]["valor"], 
            reverse=True
        )[:10]
        
        top_produtos_info = []
        for pid, info in top_produtos:
            prod = await db.produtos.find_one({"id": pid}, {"_id": 0})
            if prod:
                top_produtos_info.append(
                    f"{prod['nome']}: {info['quantidade']} un, R$ {info['valor']:.2f}"
                )
        
        # Produtos com estoque baixo
        produtos_estoque_baixo = [
            p for p in produtos 
            if p["estoque_atual"] <= p["estoque_minimo"]
        ]
        
        # Análise temporal
        vendas_por_mes = {}
        for venda in vendas:
            mes = venda["created_at"][:7]
            if mes not in vendas_por_mes:
                vendas_por_mes[mes] = {"quantidade": 0, "valor": 0}
            vendas_por_mes[mes]["quantidade"] += 1
            vendas_por_mes[mes]["valor"] += venda.get("total", 0)
        
        # === CHAMADA À IA (ADAPTADO PARA LOCAL) ===
        system_message = (
            "Você é um especialista em análise de negócios e business intelligence. "
            "Forneça insights estratégicos e previsões de mercado."
        )
        
        vendas_mes_lista = "\n".join([
            f"- {mes}: {info['quantidade']} vendas, R$ {info['valor']:.2f}" 
            for mes, info in sorted(vendas_por_mes.items())
        ])
        
        prompt = f"""Realize uma análise preditiva completa do negócio com base nos dados:

VISÃO GERAL DO NEGÓCIO:
- Total de Clientes Cadastrados: {total_clientes}
- Total de Produtos Ativos: {total_produtos}
- Total de Vendas Realizadas: {total_vendas}
- Faturamento Total: R$ {faturamento_total:.2f}
- Ticket Médio: R$ {ticket_medio:.2f}

PRODUTOS MAIS VENDIDOS:
{chr(10).join([f"- {info}" for info in top_produtos_info])}

ALERTAS DE ESTOQUE:
- Produtos com Estoque Baixo: {len(produtos_estoque_baixo)}

EVOLUÇÃO TEMPORAL (Vendas por Mês):
{vendas_mes_lista}

TAREFA - FORNEÇA ANÁLISE COMPLETA:
1. **Tendências de Mercado**: Padrões de crescimento ou declínio
2. **Previsão de Faturamento**: Estimativa para os próximos 3 meses
3. **Análise de Produtos**: Produtos com potencial e em declínio
4. **Gestão de Estoque**: Recomendações de otimização
5. **Estratégias de Crescimento**: Sugestões para aumentar vendas
6. **Riscos e Oportunidades**: Pontos de atenção
7. **KPIs Recomendados**: Métricas para acompanhar

Seja específico, use números e forneça recomendações práticas."""
        
        response = await chat_completion(system_message, prompt, "gpt-4")
        
        return {
            "success": True,
            "metricas_gerais": {
                "total_clientes": total_clientes,
                "total_produtos": total_produtos,
                "total_vendas": total_vendas,
                "faturamento_total": round(faturamento_total, 2),
                "ticket_medio": round(ticket_medio, 2),
                "produtos_estoque_baixo": len(produtos_estoque_baixo)
            },
            "top_produtos": [
                {"produto_id": pid, **info} 
                for pid, info in top_produtos[:5]
            ],
            "vendas_por_mes": vendas_por_mes,
            "analise_ia": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")


# ============================================================
# ENDPOINT: OTIMIZAÇÃO DE PREÇOS
# POST /api/ia/otimizar-precos
# ============================================================

@api_router.post("/ia/otimizar-precos")
async def otimizar_precos(
    request: dict,  # Aceita lista de produto_ids
    current_user: dict = Depends(get_current_user)
):
    """
    Analisa preços de produtos e sugere otimizações.
    Usa IA para recomendar estratégias de precificação.
    """
    try:
        produto_ids = request.get("produto_ids", [])
        
        if not produto_ids:
            # Se não especificou, pega os 20 mais vendidos
            produtos = await db.produtos.find(
                {"ativo": True}, 
                {"_id": 0}
            ).to_list(20)
        else:
            produtos = []
            for pid in produto_ids:
                prod = await db.produtos.find_one({"id": pid}, {"_id": 0})
                if prod:
                    produtos.append(prod)
        
        if not produtos:
            raise HTTPException(status_code=404, detail="Nenhum produto encontrado")
        
        # Montar dados de produtos
        produtos_info = []
        for p in produtos:
            margem = ((p['preco_venda'] - p['preco_custo']) / p['preco_venda'] * 100) if p['preco_venda'] > 0 else 0
            produtos_info.append(
                f"- {p['nome']}: Custo R$ {p['preco_custo']:.2f}, "
                f"Venda R$ {p['preco_venda']:.2f}, Margem {margem:.1f}%, "
                f"Estoque {p['estoque_atual']}"
            )
        
        # === CHAMADA À IA (ADAPTADO PARA LOCAL) ===
        system_message = (
            "Você é um especialista em precificação e estratégias de pricing. "
            "Forneça análises de preços baseadas em dados de mercado e concorrência."
        )
        
        prompt = f"""Analise os preços dos produtos e sugira otimizações:

PRODUTOS PARA ANÁLISE:
{chr(10).join(produtos_info)}

CONTEXTO:
- Segmento: Varejo de moda infantil (Emily Kids)
- Público: Pais e famílias
- Posicionamento: Qualidade com preço acessível

TAREFA:
1. Avalie a margem de lucro de cada produto
2. Identifique produtos com margem muito baixa ou muito alta
3. Sugira ajustes de preço específicos (com valores)
4. Recomende estratégias de precificação (psicológica, promocional, etc)
5. Identifique oportunidades de bundling/combos

Formate com recomendações práticas e específicas."""
        
        response = await chat_completion(system_message, prompt, "gpt-4")
        
        return {
            "success": True,
            "produtos_analisados": len(produtos),
            "analise_ia": response,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro na análise: {str(e)}")
