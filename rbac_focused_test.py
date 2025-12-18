#!/usr/bin/env python3
"""
Focused RBAC Test - Test the corrected endpoints
"""

import requests
import json

BACKEND_URL = "https://frontend-boost-10.preview.emergentagent.com/api"

def test_corrected_endpoints():
    """Test the endpoints that were just corrected"""
    
    # Login as admin
    admin_login = {
        "email": "admin@emilykids.com",
        "senha": "admin123"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=admin_login)
    if response.status_code != 200:
        print("❌ Admin login failed")
        return False
    
    admin_token = response.json()["access_token"]
    admin_headers = {
        "Authorization": f"Bearer {admin_token}",
        "Content-Type": "application/json"
    }
    
    # Login as vendedor
    vendedor_login = {
        "email": "vendedor@emilykids.com",
        "senha": "vendedor123"
    }
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=vendedor_login)
    if response.status_code != 200:
        print("❌ Vendedor login failed")
        return False
    
    vendedor_token = response.json()["access_token"]
    vendedor_headers = {
        "Authorization": f"Bearer {vendedor_token}",
        "Content-Type": "application/json"
    }
    
    # Test corrected endpoints
    corrected_endpoints = [
        "/logs/estatisticas",
        "/logs/dashboard",
        "/logs/arquivar-antigos",
        "/logs/atividade-suspeita",
        "/logs/criar-indices"
    ]
    
    print("Testing corrected logs endpoints:")
    for endpoint in corrected_endpoints:
        # Test admin access (should work)
        if endpoint.startswith("/logs/arquivar-antigos") or endpoint.startswith("/logs/criar-indices"):
            admin_response = requests.post(f"{BACKEND_URL}{endpoint}", headers=admin_headers)
        else:
            admin_response = requests.get(f"{BACKEND_URL}{endpoint}", headers=admin_headers)
        
        # Test vendedor access (should be denied)
        if endpoint.startswith("/logs/arquivar-antigos") or endpoint.startswith("/logs/criar-indices"):
            vendedor_response = requests.post(f"{BACKEND_URL}{endpoint}", headers=vendedor_headers)
        else:
            vendedor_response = requests.get(f"{BACKEND_URL}{endpoint}", headers=vendedor_headers)
        
        admin_status = "✅" if admin_response.status_code == 200 else "❌"
        vendedor_status = "✅" if vendedor_response.status_code == 403 else "❌"
        
        print(f"  {endpoint}: Admin={admin_status}({admin_response.status_code}) Vendedor={vendedor_status}({vendedor_response.status_code})")
    
    print("\nTesting usuarios endpoints:")
    usuarios_endpoints = [
        ("GET", "/usuarios"),
        ("POST", "/usuarios")
    ]
    
    for method, endpoint in usuarios_endpoints:
        # Test admin access
        if method == "GET":
            admin_response = requests.get(f"{BACKEND_URL}{endpoint}", headers=admin_headers)
            vendedor_response = requests.get(f"{BACKEND_URL}{endpoint}", headers=vendedor_headers)
        else:
            test_data = {"email": "test@test.com", "nome": "Test", "senha": "test123"}
            admin_response = requests.post(f"{BACKEND_URL}{endpoint}", json=test_data, headers=admin_headers)
            vendedor_response = requests.post(f"{BACKEND_URL}{endpoint}", json=test_data, headers=vendedor_headers)
        
        admin_status = "✅" if admin_response.status_code in [200, 201, 400, 422] else "❌"
        vendedor_status = "✅" if vendedor_response.status_code == 403 else "❌"
        
        print(f"  {method} {endpoint}: Admin={admin_status}({admin_response.status_code}) Vendedor={vendedor_status}({vendedor_response.status_code})")
    
    return True

if __name__ == "__main__":
    test_corrected_endpoints()