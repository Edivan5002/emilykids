#!/usr/bin/env python3
"""
Script de Migração - ETAPA 2: Adicionar Permissões do Módulo "admin"

Adiciona permissões do módulo "admin" (administração do sistema).
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "inventoai_db")

async def migrate_rbac_etapa2():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 80)
    print("🔧 MIGRAÇÃO RBAC - ETAPA 2")
    print("=" * 80)
    
    # 1. Adicionar permissões do módulo "admin"
    print("\n1️⃣ Adicionando permissões do módulo 'admin'...")
    
    modulo = "admin"
    acoes = ["ler", "criar", "editar", "deletar", "exportar", "aprovar"]
    
    permission_ids = []
    for acao in acoes:
        # Verificar se já existe
        existing = await db.permissions.find_one({
            "modulo": modulo,
            "acao": acao
        })
        
        if existing:
            print(f"   ⚠️  Permissão {modulo}:{acao} já existe")
            permission_ids.append(existing["id"])
        else:
            # Criar nova permissão
            perm_id = str(uuid4())
            perm = {
                "id": perm_id,
                "modulo": modulo,
                "acao": acao,
                "descricao": f"Permissão para {acao} em {modulo} do sistema"
            }
            await db.permissions.insert_one(perm)
            permission_ids.append(perm_id)
            print(f"   ✅ Criada permissão: {modulo}:{acao}")
    
    # 2. Adicionar permissões APENAS ao Admin (operações perigosas)
    print("\n2️⃣ Atualizando papel Administrador com permissões de admin...")
    
    admin_role = await db.roles.find_one({"nome": "Administrador"})
    if admin_role:
        current_perms = admin_role.get("permissoes", [])
        new_perms = list(set(current_perms + permission_ids))
        
        await db.roles.update_one(
            {"id": admin_role["id"]},
            {"$set": {"permissoes": new_perms}}
        )
        added = len(new_perms) - len(current_perms)
        print(f"   ✅ Administrador: {len(current_perms)} → {len(new_perms)} permissões (+{added})")
    
    # 3. Verificação final
    print("\n3️⃣ Verificação de Consistência...")
    
    # Módulos esperados nos endpoints
    modulos_usados = [
        "admin", "administracao", "categorias", "clientes", "contas_pagar",
        "contas_receber", "estoque", "fornecedores", "logs", "marcas",
        "notas_fiscais", "orcamentos", "produtos", "relatorios",
        "subcategorias", "usuarios", "vendas"
    ]
    
    inconsistencias = []
    for modulo in modulos_usados:
        count = await db.permissions.count_documents({"modulo": modulo})
        if count == 0:
            inconsistencias.append(modulo)
            print(f"   ❌ Módulo '{modulo}' NÃO tem permissões!")
        else:
            print(f"   ✅ Módulo '{modulo}': {count} permissões")
    
    if inconsistencias:
        print(f"\n   ⚠️  ATENÇÃO: {len(inconsistencias)} módulos sem permissões!")
        for mod in inconsistencias:
            print(f"      - {mod}")
    else:
        print("\n   ✅ Todos os módulos usados nos endpoints têm permissões!")
    
    # Total final
    total_perms = await db.permissions.count_documents({})
    total_modules = len(await db.permissions.distinct("modulo"))
    
    print(f"\n📊 Resumo Final:")
    print(f"   • Total de permissões: {total_perms}")
    print(f"   • Total de módulos: {total_modules}")
    
    admin_perms = len(admin_role.get("permissoes", [])) if admin_role else 0
    print(f"   • Administrador tem: {admin_perms} permissões")
    
    print("\n" + "=" * 80)
    print("✅ MIGRAÇÃO ETAPA 2 CONCLUÍDA!")
    print("=" * 80)
    print("\n🔄 Próximos passos:")
    print("   1. Reinicie o backend: sudo supervisorctl restart backend")
    print("   2. Teste endpoints de admin:")
    print("      GET  /api/admin/estatisticas")
    print("      POST /api/admin/resetar-modulo")
    print("=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_rbac_etapa2())
