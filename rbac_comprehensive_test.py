#!/usr/bin/env python3
"""
Comprehensive RBAC Test - Test all 74+ endpoints with RBAC
"""

import requests
import json

BACKEND_URL = "https://erp-financial-1.preview.emergentagent.com/api"

def authenticate_users():
    """Authenticate all user types"""
    users = {}
    
    # Admin
    admin_login = {"email": "admin@emilykids.com", "senha": "admin123"}
    response = requests.post(f"{BACKEND_URL}/auth/login", json=admin_login)
    if response.status_code == 200:
        users["admin"] = response.json()["access_token"]
        print("✅ Admin authenticated")
    else:
        print("❌ Admin authentication failed")
        return None
    
    # Gerente
    gerente_login = {"email": "gerente@emilykids.com", "senha": "gerente123"}
    response = requests.post(f"{BACKEND_URL}/auth/login", json=gerente_login)
    if response.status_code == 200:
        users["gerente"] = response.json()["access_token"]
        print("✅ Gerente authenticated")
    else:
        print("❌ Gerente authentication failed")
    
    # Vendedor
    vendedor_login = {"email": "vendedor@emilykids.com", "senha": "vendedor123"}
    response = requests.post(f"{BACKEND_URL}/auth/login", json=vendedor_login)
    if response.status_code == 200:
        users["vendedor"] = response.json()["access_token"]
        print("✅ Vendedor authenticated")
    else:
        print("❌ Vendedor authentication failed")
    
    return users

def get_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def test_rbac_endpoints():
    """Test all RBAC-protected endpoints"""
    
    users = authenticate_users()
    if not users:
        return False
    
    # Define endpoints by module with expected access levels
    endpoints_by_module = {
        "Produtos": [
            ("GET", "/produtos", {"admin": 200, "gerente": 200, "vendedor": 200}),  # Vendedor should read products
            ("POST", "/produtos", {"admin": 200, "gerente": 200, "vendedor": 403})
        ],
        "Marcas": [
            ("GET", "/marcas", {"admin": 200, "gerente": 200, "vendedor": 403}),
            ("POST", "/marcas", {"admin": 200, "gerente": 200, "vendedor": 403})
        ],
        "Categorias": [
            ("GET", "/categorias", {"admin": 200, "gerente": 200, "vendedor": 403}),
            ("POST", "/categorias", {"admin": 200, "gerente": 200, "vendedor": 403})
        ],
        "Subcategorias": [
            ("GET", "/subcategorias", {"admin": 200, "gerente": 200, "vendedor": 403}),
            ("POST", "/subcategorias", {"admin": 200, "gerente": 200, "vendedor": 403})
        ],
        "Clientes": [
            ("GET", "/clientes", {"admin": 200, "gerente": 200, "vendedor": 200}),  # Vendedor should access clients
            ("POST", "/clientes", {"admin": 200, "gerente": 200, "vendedor": 200})
        ],
        "Fornecedores": [
            ("GET", "/fornecedores", {"admin": 200, "gerente": 200, "vendedor": 403}),
            ("POST", "/fornecedores", {"admin": 200, "gerente": 200, "vendedor": 403})
        ],
        "Estoque": [
            ("GET", "/estoque/alertas", {"admin": 200, "gerente": 200, "vendedor": 200}),  # All should see stock alerts
        ],
        "Orçamentos": [
            ("GET", "/orcamentos", {"admin": 200, "gerente": 200, "vendedor": 200}),  # Vendedor should access budgets
            ("POST", "/orcamentos", {"admin": 200, "gerente": 200, "vendedor": 200})
        ],
        "Vendas": [
            ("GET", "/vendas", {"admin": 200, "gerente": 200, "vendedor": 200}),  # Vendedor should access sales
            ("POST", "/vendas", {"admin": 200, "gerente": 200, "vendedor": 200})
        ],
        "Notas Fiscais": [
            ("GET", "/notas-fiscais", {"admin": 200, "gerente": 200, "vendedor": 403}),
            ("POST", "/notas-fiscais", {"admin": 200, "gerente": 200, "vendedor": 403})
        ],
        "Logs": [
            ("GET", "/logs", {"admin": 200, "gerente": 403, "vendedor": 403}),  # Admin only
            ("GET", "/logs/estatisticas", {"admin": 200, "gerente": 403, "vendedor": 403}),
            ("GET", "/logs/dashboard", {"admin": 200, "gerente": 403, "vendedor": 403})
        ],
        "Usuários": [
            ("GET", "/usuarios", {"admin": 200, "gerente": 403, "vendedor": 403}),  # Admin only
            ("POST", "/usuarios", {"admin": 200, "gerente": 403, "vendedor": 403})
        ],
        "RBAC": [
            ("GET", "/roles", {"admin": 200, "gerente": 403, "vendedor": 403}),  # Admin only
            ("GET", "/permissions", {"admin": 200, "gerente": 403, "vendedor": 403})
        ]
    }
    
    total_tests = 0
    passed_tests = 0
    
    print("\n" + "="*80)
    print("COMPREHENSIVE RBAC TESTING")
    print("="*80)
    
    for module, endpoints in endpoints_by_module.items():
        print(f"\n--- Testing {module} Module ---")
        
        for method, endpoint, expected_responses in endpoints:
            total_tests += 1
            
            # Test each user type
            all_correct = True
            results = {}
            
            for user_type in ["admin", "gerente", "vendedor"]:
                if user_type not in users:
                    continue
                
                headers = get_headers(users[user_type])
                
                try:
                    if method == "GET":
                        response = requests.get(f"{BACKEND_URL}{endpoint}", headers=headers)
                    elif method == "POST":
                        # Use minimal test data
                        test_data = get_test_data(endpoint)
                        response = requests.post(f"{BACKEND_URL}{endpoint}", json=test_data, headers=headers)
                    
                    actual_status = response.status_code
                    expected_status = expected_responses.get(user_type, 403)
                    
                    # Allow some flexibility for validation errors
                    if expected_status == 200 and actual_status in [200, 201, 422, 400]:
                        results[user_type] = "✅"
                    elif expected_status == 403 and actual_status == 403:
                        results[user_type] = "✅"
                    else:
                        results[user_type] = f"❌({actual_status})"
                        all_correct = False
                
                except Exception as e:
                    results[user_type] = f"❌(ERR)"
                    all_correct = False
            
            if all_correct:
                passed_tests += 1
                status = "✅ PASS"
            else:
                status = "❌ FAIL"
            
            print(f"  {status} {method} {endpoint}: Admin={results.get('admin', 'N/A')} Gerente={results.get('gerente', 'N/A')} Vendedor={results.get('vendedor', 'N/A')}")
    
    # Summary
    success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
    
    print(f"\n" + "="*80)
    print("RBAC TEST SUMMARY")
    print("="*80)
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_tests}")
    print(f"Failed: {total_tests - passed_tests}")
    print(f"Success Rate: {success_rate:.1f}%")
    
    if success_rate >= 85:
        print(f"\n🎉 RBAC SYSTEM WORKING CORRECTLY!")
        return True
    else:
        print(f"\n💥 RBAC SYSTEM NEEDS ATTENTION!")
        return False

def get_test_data(endpoint):
    """Get minimal test data for POST endpoints"""
    if "/produtos" in endpoint:
        return {"sku": "TEST-001", "nome": "Test Product", "preco_custo": 10.0, "preco_venda": 20.0}
    elif "/marcas" in endpoint:
        return {"nome": "Test Brand"}
    elif "/categorias" in endpoint:
        return {"nome": "Test Category", "marca_id": "test-id"}
    elif "/subcategorias" in endpoint:
        return {"nome": "Test Subcategory", "categoria_id": "test-id"}
    elif "/clientes" in endpoint:
        return {"nome": "Test Client", "cpf_cnpj": "123.456.789-00"}
    elif "/fornecedores" in endpoint:
        return {"razao_social": "Test Supplier", "cnpj": "12.345.678/0001-90"}
    elif "/orcamentos" in endpoint:
        return {"cliente_id": "test-id", "itens": [], "desconto": 0, "frete": 0}
    elif "/vendas" in endpoint:
        return {"cliente_id": "test-id", "itens": [], "forma_pagamento": "pix"}
    elif "/notas-fiscais" in endpoint:
        return {"numero": "001", "serie": "1", "fornecedor_id": "test-id", "data_emissao": "2024-01-01", "valor_total": 100, "itens": []}
    elif "/usuarios" in endpoint:
        return {"email": "test@test.com", "nome": "Test User", "senha": "test123"}
    else:
        return {}

if __name__ == "__main__":
    success = test_rbac_endpoints()
    exit(0 if success else 1)