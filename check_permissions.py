#!/usr/bin/env python3
"""
Check current role permissions
"""

import requests
import json

BACKEND_URL = "https://client-dependency.preview.emergentagent.com/api"

def check_permissions():
    # Login as admin
    admin_login = {"email": "admin@emilykids.com", "senha": "admin123"}
    response = requests.post(f"{BACKEND_URL}/auth/login", json=admin_login)
    if response.status_code != 200:
        print("❌ Admin login failed")
        return
    
    admin_token = response.json()["access_token"]
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Get all roles
    response = requests.get(f"{BACKEND_URL}/roles", headers=headers)
    if response.status_code == 200:
        roles = response.json()
        print("Current Roles:")
        for role in roles:
            print(f"  - {role['nome']}: {len(role.get('permissoes', []))} permissions")
    
    # Get all permissions
    response = requests.get(f"{BACKEND_URL}/permissions", headers=headers)
    if response.status_code == 200:
        permissions = response.json()
        print(f"\nTotal Permissions Available: {len(permissions)}")
        
        # Group by module
        by_module = {}
        for perm in permissions:
            module = perm['modulo']
            if module not in by_module:
                by_module[module] = []
            by_module[module].append(perm['acao'])
        
        print("\nPermissions by Module:")
        for module, actions in by_module.items():
            print(f"  {module}: {actions}")
    
    # Check specific user permissions
    print("\n" + "="*50)
    print("CHECKING USER PERMISSIONS")
    print("="*50)
    
    # Get gerente user ID
    response = requests.get(f"{BACKEND_URL}/usuarios", headers=headers)
    if response.status_code == 200:
        users = response.json()
        gerente_user = next((u for u in users if u['email'] == 'gerente@emilykids.com'), None)
        vendedor_user = next((u for u in users if u['email'] == 'vendedor@emilykids.com'), None)
        
        if gerente_user:
            print(f"\nGerente User:")
            print(f"  Email: {gerente_user['email']}")
            print(f"  Role ID: {gerente_user.get('role_id', 'None')}")
            print(f"  Papel: {gerente_user.get('papel', 'None')}")
            
            # Get effective permissions
            response = requests.get(f"{BACKEND_URL}/users/{gerente_user['id']}/permissions", headers=headers)
            if response.status_code == 200:
                perms = response.json()
                print(f"  Total Effective Permissions: {perms.get('total_permissions', 0)}")
                print(f"  Permissions by Module: {list(perms.get('by_module', {}).keys())}")
        
        if vendedor_user:
            print(f"\nVendedor User:")
            print(f"  Email: {vendedor_user['email']}")
            print(f"  Role ID: {vendedor_user.get('role_id', 'None')}")
            print(f"  Papel: {vendedor_user.get('papel', 'None')}")
            
            # Get effective permissions
            response = requests.get(f"{BACKEND_URL}/users/{vendedor_user['id']}/permissions", headers=headers)
            if response.status_code == 200:
                perms = response.json()
                print(f"  Total Effective Permissions: {perms.get('total_permissions', 0)}")
                print(f"  Permissions by Module: {list(perms.get('by_module', {}).keys())}")

if __name__ == "__main__":
    check_permissions()