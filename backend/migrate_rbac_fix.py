#!/usr/bin/env python3
"""
Script de Migração - ETAPA 1: Adicionar Permissões Faltantes de RBAC

Adiciona permissões do módulo "administracao" sem apagar dados existentes.
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from uuid import uuid4
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "inventoai_db")

async def migrate_rbac():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print("=" * 80)
    print("🔧 MIGRAÇÃO RBAC - ETAPA 1")
    print("=" * 80)
    
    # 1. Adicionar permissões do módulo "administracao"
    print("\n1️⃣ Adicionando permissões do módulo 'administracao'...")
    
    modulo = "administracao"
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
                "descricao": f"Permissão para {acao} em {modulo}"
            }
            await db.permissions.insert_one(perm)
            permission_ids.append(perm_id)
            print(f"   ✅ Criada permissão: {modulo}:{acao}")
    
    # 2. Adicionar permissões aos papéis existentes
    print("\n2️⃣ Atualizando papéis com novas permissões...")
    
    # Admin recebe todas
    admin_role = await db.roles.find_one({"nome": "Administrador"})
    if admin_role:
        current_perms = admin_role.get("permissoes", [])
        new_perms = list(set(current_perms + permission_ids))
        
        await db.roles.update_one(
            {"id": admin_role["id"]},
            {"$set": {"permissoes": new_perms}}
        )
        print(f"   ✅ Administrador: {len(current_perms)} → {len(new_perms)} permissões")
    
    # Gerente recebe também (gestão operacional)
    gerente_role = await db.roles.find_one({"nome": "Gerente"})
    if gerente_role:
        current_perms = gerente_role.get("permissoes", [])
        new_perms = list(set(current_perms + permission_ids))
        
        await db.roles.update_one(
            {"id": gerente_role["id"]},
            {"$set": {"permissoes": new_perms}}
        )
        print(f"   ✅ Gerente: {len(current_perms)} → {len(new_perms)} permissões")
    
    # 3. Verificação final
    print("\n3️⃣ Verificação...")
    total_perms = await db.permissions.count_documents({})
    admin_perms_count = len(admin_role.get("permissoes", [])) if admin_role else 0
    
    print(f"   📊 Total de permissões no sistema: {total_perms}")
    print(f"   👤 Administrador tem: {admin_perms_count} permissões")
    
    # Verificar se a permissão "liquidar" existe (não deveria mais ser usada)
    liquidar_perm = await db.permissions.find_one({
        "modulo": "contas_pagar",
        "acao": "liquidar"
    })
    
    if liquidar_perm:
        print("\n   ⚠️  ATENÇÃO: Permissão 'liquidar' ainda existe no banco")
        print("      Recomendação: Pode ser removida (agora usa 'pagar')")
    
    print("\n" + "=" * 80)
    print("✅ MIGRAÇÃO CONCLUÍDA COM SUCESSO!")
    print("=" * 80)
    print("\n🔄 Próximos passos:")
    print("   1. Reinicie o backend: sudo supervisorctl restart backend")
    print("   2. Teste os endpoints de categorias e centros de custo")
    print("   3. Teste POST /api/contas-pagar/{id}/liquidar-parcela")
    print("=" * 80)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_rbac())
