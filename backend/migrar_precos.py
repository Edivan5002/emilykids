#!/usr/bin/env python3
"""
Script de migração: Converte preco_custo para preco_inicial, preco_medio
e inicializa preco_ultima_compra
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

# Conectar ao MongoDB
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGO_URL)
db = client.emily_kids_db

async def migrar_produtos():
    """Migrar produtos existentes para novo esquema de preços"""
    print("Iniciando migração de produtos...")
    
    # Buscar todos os produtos
    produtos = await db.produtos.find({}, {"_id": 0}).to_list(10000)
    print(f"Encontrados {len(produtos)} produtos para migrar")
    
    migrados = 0
    erros = 0
    
    for produto in produtos:
        try:
            # Se já tem os novos campos, pular
            if "preco_inicial" in produto and "preco_medio" in produto:
                print(f"  ✓ Produto {produto.get('nome')} já migrado")
                continue
            
            # Converter preco_custo para preco_inicial e preco_medio
            preco_custo = produto.get("preco_custo", 0)
            
            update_data = {
                "preco_inicial": preco_custo,
                "preco_medio": preco_custo,
                "preco_ultima_compra": None
            }
            
            # Remover preco_custo antigo
            await db.produtos.update_one(
                {"id": produto["id"]},
                {
                    "$set": update_data,
                    "$unset": {"preco_custo": ""}
                }
            )
            
            migrados += 1
            print(f"  ✓ Migrado: {produto.get('nome')} - Preço: R$ {preco_custo:.2f}")
            
        except Exception as e:
            erros += 1
            print(f"  ✗ Erro ao migrar {produto.get('nome')}: {str(e)}")
    
    print(f"\nMigração concluída:")
    print(f"  - Migrados: {migrados}")
    print(f"  - Erros: {erros}")
    print(f"  - Total: {len(produtos)}")

async def main():
    await migrar_produtos()
    client.close()

if __name__ == "__main__":
    asyncio.run(main())
