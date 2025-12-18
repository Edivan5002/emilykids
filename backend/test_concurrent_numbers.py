#!/usr/bin/env python3
"""
Teste de Concorrência para Números Sequenciais

Cria múltiplas contas simultaneamente para validar que:
1. Não há números duplicados
2. Não há race conditions
3. Sequência é consistente
"""

import asyncio
import aiohttp
import json
from datetime import datetime, timedelta

API_URL = "https://mongo-fastapi-1.preview.emergentagent.com/api"

async def login():
    """Faz login e retorna token"""
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{API_URL}/auth/login",
            json={"email": "edivancelestino@yahoo.com.br", "senha": "123456"}
        ) as resp:
            data = await resp.json()
            return data.get("access_token")

async def criar_conta_pagar(session, token, index):
    """Cria uma conta a pagar"""
    headers = {"Authorization": f"Bearer {token}"}
    
    data_vencimento = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    
    payload = {
        "fornecedor_id": "test-fornecedor-1",
        "descricao": f"Teste Concorrência #{index}",
        "categoria": "Teste",
        "valor_total": 100.00,
        "data_vencimento": data_vencimento,
        "numero_parcelas": 1,
        "forma_pagamento": "boleto"
    }
    
    try:
        async with session.post(
            f"{API_URL}/contas-pagar",
            headers=headers,
            json=payload
        ) as resp:
            if resp.status == 200:
                data = await resp.json()
                numero = data.get("numero", "ERRO")
                return {"index": index, "numero": numero, "status": "OK"}
            else:
                error = await resp.text()
                return {"index": index, "numero": None, "status": f"ERRO {resp.status}"}
    except Exception as e:
        return {"index": index, "numero": None, "status": f"EXCEPTION: {str(e)}"}

async def test_concurrent():
    """Executa teste de concorrência"""
    print("=" * 80)
    print("🔬 TESTE DE CONCORRÊNCIA - NUMERAÇÃO SEQUENCIAL")
    print("=" * 80)
    
    # Login
    print("\n1️⃣ Fazendo login...")
    token = await login()
    if not token:
        print("❌ Falha no login")
        return
    print("✅ Login realizado")
    
    # Criar 20 contas simultaneamente
    print("\n2️⃣ Criando 20 contas a pagar SIMULTANEAMENTE...")
    
    async with aiohttp.ClientSession() as session:
        tasks = [criar_conta_pagar(session, token, i) for i in range(1, 21)]
        results = await asyncio.gather(*tasks)
    
    # Analisar resultados
    print("\n3️⃣ Analisando resultados...")
    
    numeros = []
    erros = []
    
    for result in results:
        if result["status"] == "OK" and result["numero"]:
            numeros.append(result["numero"])
        else:
            erros.append(result)
    
    print(f"\n✅ Contas criadas com sucesso: {len(numeros)}")
    print(f"❌ Erros: {len(erros)}")
    
    if erros:
        print("\n⚠️ Detalhes dos erros:")
        for erro in erros[:5]:
            print(f"   • #{erro['index']}: {erro['status']}")
    
    # Verificar unicidade
    print("\n4️⃣ Verificando unicidade dos números...")
    
    numeros_sorted = sorted(numeros)
    duplicados = []
    
    for i in range(len(numeros_sorted) - 1):
        if numeros_sorted[i] == numeros_sorted[i + 1]:
            duplicados.append(numeros_sorted[i])
    
    if duplicados:
        print(f"❌ ENCONTRADOS {len(duplicados)} NÚMEROS DUPLICADOS!")
        for dup in duplicados:
            print(f"   • {dup}")
    else:
        print("✅ TODOS OS NÚMEROS SÃO ÚNICOS!")
    
    # Mostrar primeiros 10 números
    print("\n5️⃣ Primeiros 10 números gerados (ordenados):")
    for i, num in enumerate(numeros_sorted[:10], 1):
        print(f"   {i:2d}. {num}")
    
    # Verificar sequência
    print("\n6️⃣ Verificando continuidade da sequência...")
    
    numeros_int = [int(n.split("-")[1]) for n in numeros_sorted]
    min_num = min(numeros_int)
    max_num = max(numeros_int)
    esperados = set(range(min_num, max_num + 1))
    obtidos = set(numeros_int)
    faltando = esperados - obtidos
    
    if faltando:
        print(f"⚠️  Há {len(faltando)} números faltando na sequência:")
        print(f"   Faltando: {sorted(list(faltando))[:10]}")
    else:
        print("✅ Sequência contínua sem buracos!")
    
    print(f"\n📊 Estatísticas:")
    print(f"   • Menor número: CP-{min_num:06d}")
    print(f"   • Maior número: CP-{max_num:06d}")
    print(f"   • Range: {max_num - min_num + 1} números")
    print(f"   • Contas criadas: {len(numeros)}")
    
    # Conclusão
    print("\n" + "=" * 80)
    if not duplicados and not faltando:
        print("✅ TESTE PASSOU! Sistema thread-safe funcionando corretamente.")
    elif not duplicados and faltando:
        print("⚠️  TESTE PARCIAL: Sem duplicatas mas há números faltando")
        print("    (Pode ser devido a erros de criação, não race condition)")
    else:
        print("❌ TESTE FALHOU! Há duplicatas - race condition detectada!")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_concurrent())
