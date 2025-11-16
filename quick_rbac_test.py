#!/usr/bin/env python3
"""
Quick RBAC test after fixing action names
"""

import requests

BACKEND_URL = "https://emily-kids-erp-1.preview.emergentagent.com/api"

def quick_test():
    # Login users
    users = {}
    
    for user_type, email, password in [
        ("admin", "admin@emilykids.com", "admin123"),
        ("gerente", "gerente@emilykids.com", "gerente123"),
        ("vendedor", "vendedor@emilykids.com", "vendedor123")
    ]:
        login_data = {"email": email, "senha": password}
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            users[user_type] = response.json()["access_token"]
            print(f"✅ {user_type.title()} authenticated")
        else:
            print(f"❌ {user_type.title()} authentication failed")
    
    # Test key endpoints
    test_endpoints = [
        ("GET", "/produtos", "Produtos"),
        ("GET", "/clientes", "Clientes"),
        ("GET", "/orcamentos", "Orçamentos"),
        ("GET", "/vendas", "Vendas"),
        ("GET", "/logs", "Logs"),
        ("GET", "/usuarios", "Usuários")
    ]
    
    print(f"\n{'Endpoint':<15} {'Admin':<8} {'Gerente':<8} {'Vendedor':<8}")
    print("-" * 45)
    
    for method, endpoint, name in test_endpoints:
        results = {}
        
        for user_type in ["admin", "gerente", "vendedor"]:
            if user_type not in users:
                results[user_type] = "N/A"
                continue
            
            headers = {
                "Authorization": f"Bearer {users[user_type]}",
                "Content-Type": "application/json"
            }
            
            try:
                response = requests.get(f"{BACKEND_URL}{endpoint}", headers=headers)
                if response.status_code == 200:
                    results[user_type] = "✅"
                elif response.status_code == 403:
                    results[user_type] = "❌"
                else:
                    results[user_type] = f"{response.status_code}"
            except:
                results[user_type] = "ERR"
        
        print(f"{name:<15} {results.get('admin', 'N/A'):<8} {results.get('gerente', 'N/A'):<8} {results.get('vendedor', 'N/A'):<8}")

if __name__ == "__main__":
    quick_test()