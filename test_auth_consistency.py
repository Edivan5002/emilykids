#!/usr/bin/env python3
"""
Teste de Consistência de Dados de Autenticação
Verifica se todos os usuários têm dados consistentes
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check_consistency():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.inventoai_db
    
    print("=" * 80)
    print("🔍 AUTHENTICATION CONSISTENCY CHECK")
    print("=" * 80)
    
    # 1. Verificar todos os usuários
    print("\n1. Checking all users...")
    users = await db.users.find({}, {"_id": 0}).to_list(100)
    print(f"   Total users: {len(users)}")
    
    # 2. Verificar campos obrigatórios
    print("\n2. Checking required fields...")
    required_fields = ["id", "email", "nome", "senha_hash", "papel", "ativo"]
    issues = []
    
    for user in users:
        for field in required_fields:
            if field not in user:
                issues.append(f"User {user.get('email', 'unknown')} missing field: {field}")
    
    if issues:
        print("   ❌ Issues found:")
        for issue in issues:
            print(f"      - {issue}")
    else:
        print("   ✅ All users have required fields")
    
    # 3. Verificar papel_id vs role_id
    print("\n3. Checking papel_id vs role_id consistency...")
    users_with_papel_id = await db.users.count_documents({"papel_id": {"$exists": True}})
    users_with_role_id = await db.users.count_documents({"role_id": {"$exists": True}})
    
    print(f"   Users with papel_id: {users_with_papel_id}")
    print(f"   Users with role_id: {users_with_role_id}")
    
    if users_with_papel_id > 0:
        print("   ⚠️  Warning: Some users have 'papel_id' instead of 'role_id'")
        print("      This is handled by code but should be standardized")
    else:
        print("   ✅ All users use 'role_id' (correct)")
    
    # 4. Verificar referências de role_id
    print("\n4. Checking role_id references...")
    users_with_role = [u for u in users if u.get("role_id")]
    role_ids = list(set([u["role_id"] for u in users_with_role]))
    
    print(f"   Users with role_id: {len(users_with_role)}")
    print(f"   Unique role_ids: {len(role_ids)}")
    
    # Verificar se todos os role_ids existem
    missing_roles = []
    for role_id in role_ids:
        role = await db.roles.find_one({"id": role_id})
        if not role:
            missing_roles.append(role_id)
    
    if missing_roles:
        print(f"   ❌ Missing roles: {len(missing_roles)}")
        for role_id in missing_roles:
            print(f"      - {role_id}")
    else:
        print("   ✅ All role_id references are valid")
    
    # 5. Verificar usuários sem role_id
    print("\n5. Checking users without role_id...")
    users_without_role = [u for u in users if not u.get("role_id")]
    
    if users_without_role:
        print(f"   ⚠️  {len(users_without_role)} users without role_id:")
        for user in users_without_role:
            print(f"      - {user['email']} (papel: {user.get('papel', 'N/A')})")
    else:
        print("   ✅ All users have role_id assigned")
    
    # 6. Verificar senhas
    print("\n6. Checking password hashes...")
    users_without_hash = [u for u in users if not u.get("senha_hash")]
    
    if users_without_hash:
        print(f"   ❌ {len(users_without_hash)} users without senha_hash!")
        for user in users_without_hash:
            print(f"      - {user['email']}")
    else:
        print("   ✅ All users have senha_hash")
    
    # 7. Verificar usuários bloqueados
    print("\n7. Checking locked users...")
    locked_users = await db.users.count_documents({"locked_until": {"$ne": None}})
    print(f"   Locked users: {locked_users}")
    
    if locked_users > 0:
        locked = await db.users.find(
            {"locked_until": {"$ne": None}},
            {"_id": 0, "email": 1, "locked_until": 1}
        ).to_list(10)
        for user in locked:
            print(f"      - {user['email']} locked until {user['locked_until']}")
    
    # 8. Verificar emails duplicados
    print("\n8. Checking duplicate emails...")
    pipeline = [
        {"$group": {"_id": "$email", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}}
    ]
    duplicates = await db.users.aggregate(pipeline).to_list(100)
    
    if duplicates:
        print(f"   ❌ {len(duplicates)} duplicate emails found!")
        for dup in duplicates:
            print(f"      - {dup['_id']} ({dup['count']} occurrences)")
    else:
        print("   ✅ No duplicate emails")
    
    # 9. Verificar sessões ativas
    print("\n9. Checking active sessions...")
    active_sessions = await db.user_sessions.count_documents({"ativo": True})
    total_sessions = await db.user_sessions.count_documents({})
    print(f"   Active sessions: {active_sessions} / {total_sessions}")
    
    # Summary
    print("\n" + "=" * 80)
    print("📊 SUMMARY")
    print("=" * 80)
    
    total_issues = len(issues) + len(missing_roles) + len(users_without_hash) + len(duplicates)
    warnings = (1 if users_with_papel_id > 0 else 0) + len(users_without_role)
    
    print(f"✅ Users checked: {len(users)}")
    print(f"❌ Critical issues: {total_issues}")
    print(f"⚠️  Warnings: {warnings}")
    
    if total_issues == 0 and warnings == 0:
        print("\n🎉 All checks passed! Authentication system is CONSISTENT.")
    elif total_issues == 0:
        print("\n⚠️  No critical issues, but some warnings to review.")
    else:
        print("\n❌ Critical issues found! Please fix them.")
    
    print("=" * 80)
    
    return total_issues == 0

if __name__ == "__main__":
    success = asyncio.run(check_consistency())
    exit(0 if success else 1)
