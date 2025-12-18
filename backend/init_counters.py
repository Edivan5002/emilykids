#!/usr/bin/env python3
"""
Script de Inicialização dos Contadores (Sequências)

Inicializa os contadores baseados nos números máximos existentes nas collections.
Execute ANTES de começar a usar o novo sistema de numeração.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "inventoai_db")

async def init_counters():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 80)
    print("🔢 INICIALIZAÇÃO DE CONTADORES SEQUENCIAIS")
    print("=" * 80)
    
    counters_to_init = [
        {
            "name": "contas_pagar",
            "collection": "contas_pagar",
            "field": "numero",
            "prefix": "CP-"
        },
        {
            "name": "contas_receber",
            "collection": "contas_receber",
            "field": "numero",
            "prefix": "CR-"
        },
        {
            "name": "vendas",
            "collection": "vendas",
            "field": "numero_venda",
            "prefix": "VEN-"
        }
    ]
    
    for counter in counters_to_init:
        print(f"\n📊 Inicializando contador: {counter['name']}")
        
        # Verificar se já existe
        existing_counter = await db.counters.find_one({"name": counter["name"]})
        if existing_counter:
            print(f"   ⚠️  Contador já existe com seq={existing_counter['seq']}")
            continue
        
        # Buscar maior número existente
        last_doc = await db[counter["collection"]].find_one(
            {counter["field"]: {"$exists": True}},
            sort=[("created_at", -1)]
        )
        
        if last_doc and counter["field"] in last_doc:
            numero_str = last_doc[counter["field"]]
            # Extrair número após o prefixo (ex: "CP-000123" -> 123)
            try:
                last_num = int(numero_str.replace(counter["prefix"], ""))
                initial_seq = last_num
            except:
                initial_seq = 0
        else:
            initial_seq = 0
        
        # Criar contador
        await db.counters.insert_one({
            "name": counter["name"],
            "seq": initial_seq
        })
        
        print(f"   ✅ Contador criado com seq inicial: {initial_seq}")
        print(f"   📝 Próximo número será: {counter['prefix']}{initial_seq + 1}")
    
    # Resumo
    print("\n" + "=" * 80)
    print("✅ CONTADORES INICIALIZADOS!")
    print("=" * 80)
    
    all_counters = await db.counters.find({}, {"_id": 0}).to_list(None)
    print("\n📋 Contadores ativos:")
    for c in all_counters:
        print(f"   • {c['name']}: seq={c['seq']}")
    
    print("\n" + "=" * 80)
    print("🚀 Sistema pronto para usar numeração atômica!")
    print("=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(init_counters())
