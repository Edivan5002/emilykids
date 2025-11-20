#!/usr/bin/env python3
"""
Debug script to check sales creation and contas a receber generation
"""

import requests
import json
import uuid

# Backend URL from environment
BACKEND_URL = "https://erp-emily.preview.emergentagent.com/api"

def authenticate():
    """Authenticate using admin credentials"""
    login_data = {"email": "edivancelestino@yahoo.com.br", "senha": "123456"}
    
    response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        return data["access_token"], data["user"]["id"]
    return None, None

def get_headers(token):
    """Get headers with authentication"""
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

def main():
    print("🔍 DEBUGGING SALES AND CONTAS A RECEBER CREATION")
    print("=" * 60)
    
    # Authenticate
    token, user_id = authenticate()
    if not token:
        print("❌ Authentication failed")
        return
    
    print(f"✅ Authenticated as user: {user_id}")
    headers = get_headers(token)
    
    # Get existing clients
    clients_response = requests.get(f"{BACKEND_URL}/clientes", headers=headers)
    if clients_response.status_code == 200:
        clients = clients_response.json()
        if clients:
            client_id = clients[0]["id"]
            print(f"✅ Using existing client: {client_id}")
        else:
            print("❌ No clients found")
            return
    else:
        print(f"❌ Failed to get clients: {clients_response.status_code}")
        return
    
    # Get existing products
    products_response = requests.get(f"{BACKEND_URL}/produtos", headers=headers)
    if products_response.status_code == 200:
        products = products_response.json()
        if products:
            product_id = products[0]["id"]
            print(f"✅ Using existing product: {product_id}")
        else:
            print("❌ No products found")
            return
    else:
        print(f"❌ Failed to get products: {products_response.status_code}")
        return
    
    # Create a parcelada sale
    sale_data = {
        "cliente_id": client_id,
        "itens": [
            {
                "produto_id": product_id,
                "quantidade": 1,
                "preco_unitario": 100.0
            }
        ],
        "desconto": 0,
        "frete": 10.0,
        "forma_pagamento": "cartao",
        "numero_parcelas": 3,
        "observacoes": "Debug sale for contas a receber"
    }
    
    print("\n🛒 Creating parcelada sale...")
    print(f"Sale data: {json.dumps(sale_data, indent=2)}")
    
    sale_response = requests.post(f"{BACKEND_URL}/vendas", json=sale_data, headers=headers)
    
    if sale_response.status_code == 200:
        sale = sale_response.json()
        sale_id = sale["id"]
        print(f"✅ Sale created: {sale_id}")
        print(f"Sale details: {json.dumps(sale, indent=2)}")
        
        # Check if contas a receber were created
        print(f"\n🔍 Checking contas a receber for sale {sale_id}...")
        contas_response = requests.get(f"{BACKEND_URL}/vendas/{sale_id}/contas-receber", headers=headers)
        
        if contas_response.status_code == 200:
            contas = contas_response.json()
            print(f"✅ Contas a receber response: {len(contas)} contas found")
            if contas:
                print(f"Contas details: {json.dumps(contas, indent=2)}")
            else:
                print("⚠️ No contas a receber found - investigating...")
                
                # Check directly in the database via a different endpoint
                print("\n🔍 Checking all contas a receber...")
                all_contas_response = requests.get(f"{BACKEND_URL}/contas-receber", headers=headers)
                if all_contas_response.status_code == 200:
                    all_contas = all_contas_response.json()
                    print(f"Total contas in system: {len(all_contas)}")
                    
                    # Look for contas with our sale_id
                    matching_contas = [c for c in all_contas if c.get("origem_id") == sale_id or c.get("referencia_id") == sale_id]
                    print(f"Matching contas for sale {sale_id}: {len(matching_contas)}")
                    if matching_contas:
                        print(f"Matching contas: {json.dumps(matching_contas, indent=2)}")
                else:
                    print(f"❌ Failed to get all contas: {all_contas_response.status_code}")
        else:
            print(f"❌ Failed to get contas a receber: {contas_response.status_code} - {contas_response.text}")
    else:
        print(f"❌ Failed to create sale: {sale_response.status_code} - {sale_response.text}")

if __name__ == "__main__":
    main()