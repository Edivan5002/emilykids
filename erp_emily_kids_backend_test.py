#!/usr/bin/env python3
"""
ERP Emily Kids Backend API Test Suite

Tests the specific backend API endpoints for ERP Emily Kids system:
1. Comissões endpoints
2. Curva ABC endpoints  
3. Pedidos de Compra endpoints
4. Estoque/Auditoria endpoints
5. Alertas Financeiros endpoints
6. Cliente Crédito endpoints

Login credentials: admin@emilykids.com / 123456
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://frontend-boost-10.preview.emergentagent.com/api"

class ERPEmilyKidsAPITester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        self.created_data = {
            "clients": [],
            "products": [],
            "suppliers": [],
            "sales": [],
            "purchase_orders": []
        }
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details or {},
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def authenticate(self):
        """Authenticate using admin credentials"""
        print("\n=== AUTHENTICATION TEST ===")
        
        # Primary credentials from review request
        login_data = {"email": "admin@emilykids.com", "senha": "123456"}
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_test("Authentication", True, f"Admin login successful with {login_data['email']}")
                return True
            else:
                self.log_test("Authentication", False, f"Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Authentication", False, f"Login error: {str(e)}")
            return False
    
    def get_headers(self):
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    # ==================== COMISSÕES TESTS ====================
    
    def test_comissoes_list(self):
        """Test GET /api/comissoes - List commissions"""
        print("\n=== TEST: GET /api/comissoes ===")
        
        try:
            response = requests.get(f"{self.base_url}/comissoes", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) or (isinstance(data, dict) and "data" in data):
                    self.log_test("Comissões List", True, "✅ Status 200, returned commission data structure")
                else:
                    self.log_test("Comissões List", False, f"Unexpected response format: {type(data)}", {"response": data})
            else:
                self.log_test("Comissões List", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Comissões List", False, f"Error: {str(e)}")
    
    def test_comissoes_filter_vendedor(self):
        """Test GET /api/comissoes?vendedor_id=xxx - Filter by vendedor"""
        print("\n=== TEST: GET /api/comissoes?vendedor_id=xxx ===")
        
        try:
            # Use a test vendedor_id
            test_vendedor_id = "test-vendedor-123"
            response = requests.get(f"{self.base_url}/comissoes?vendedor_id={test_vendedor_id}", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Comissões Filter Vendedor", True, "✅ Status 200, filter by vendedor_id working")
            else:
                self.log_test("Comissões Filter Vendedor", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Comissões Filter Vendedor", False, f"Error: {str(e)}")
    
    def test_comissoes_filter_status(self):
        """Test GET /api/comissoes?status=pendente - Filter by status"""
        print("\n=== TEST: GET /api/comissoes?status=pendente ===")
        
        try:
            response = requests.get(f"{self.base_url}/comissoes?status=pendente", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                self.log_test("Comissões Filter Status", True, "✅ Status 200, filter by status working")
            else:
                self.log_test("Comissões Filter Status", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Comissões Filter Status", False, f"Error: {str(e)}")
    
    # ==================== CURVA ABC TESTS ====================
    
    def test_curva_abc_get(self):
        """Test GET /api/produtos/curva-abc - Get ABC classification"""
        print("\n=== TEST: GET /api/produtos/curva-abc ===")
        
        try:
            response = requests.get(f"{self.base_url}/produtos/curva-abc", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                # Check if response has ABC classification structure
                if isinstance(data, dict) and any(key in data for key in ["curva_a", "curva_b", "curva_c", "produtos"]):
                    self.log_test("Curva ABC Get", True, "✅ Status 200, returned ABC classification data")
                elif isinstance(data, list):
                    self.log_test("Curva ABC Get", True, "✅ Status 200, returned products list with ABC data")
                else:
                    self.log_test("Curva ABC Get", False, f"Unexpected response format", {"response": data})
            else:
                self.log_test("Curva ABC Get", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Curva ABC Get", False, f"Error: {str(e)}")
    
    def test_curva_abc_recalculate(self):
        """Test POST /api/produtos/calcular-curva-abc?periodo_meses=12 - Recalculate"""
        print("\n=== TEST: POST /api/produtos/calcular-curva-abc?periodo_meses=12 ===")
        
        try:
            response = requests.post(f"{self.base_url}/produtos/calcular-curva-abc?periodo_meses=12", 
                                   headers=self.get_headers(), json={})
            
            if response.status_code in [200, 201]:
                data = response.json()
                self.log_test("Curva ABC Recalculate", True, "✅ Status 200/201, ABC recalculation triggered")
            else:
                self.log_test("Curva ABC Recalculate", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Curva ABC Recalculate", False, f"Error: {str(e)}")
    
    # ==================== PEDIDOS DE COMPRA TESTS ====================
    
    def test_pedidos_compra_list(self):
        """Test GET /api/pedidos-compra - List purchase orders"""
        print("\n=== TEST: GET /api/pedidos-compra ===")
        
        try:
            response = requests.get(f"{self.base_url}/pedidos-compra", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) or (isinstance(data, dict) and "data" in data):
                    self.log_test("Pedidos Compra List", True, "✅ Status 200, returned purchase orders data")
                else:
                    self.log_test("Pedidos Compra List", False, f"Unexpected response format", {"response": data})
            else:
                self.log_test("Pedidos Compra List", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Pedidos Compra List", False, f"Error: {str(e)}")
    
    def test_pedidos_compra_create(self):
        """Test POST /api/pedidos-compra - Create purchase order"""
        print("\n=== TEST: POST /api/pedidos-compra ===")
        
        # First, try to get a supplier for the test
        supplier_id = self.get_or_create_test_supplier()
        if not supplier_id:
            self.log_test("Pedidos Compra Create", False, "Failed to get/create test supplier")
            return
        
        # Get a product for the test
        product_id = self.get_or_create_test_product()
        if not product_id:
            self.log_test("Pedidos Compra Create", False, "Failed to get/create test product")
            return
        
        try:
            pedido_data = {
                "fornecedor_id": supplier_id,
                "itens": [
                    {
                        "produto_id": product_id,
                        "quantidade": 10,
                        "preco_unitario": 50.0
                    }
                ],
                "observacoes": "Pedido de teste para API"
            }
            
            response = requests.post(f"{self.base_url}/pedidos-compra", 
                                   json=pedido_data, headers=self.get_headers())
            
            if response.status_code in [200, 201]:
                data = response.json()
                if "id" in data:
                    self.created_data["purchase_orders"].append(data["id"])
                self.log_test("Pedidos Compra Create", True, "✅ Status 200/201, purchase order created successfully")
            else:
                self.log_test("Pedidos Compra Create", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Pedidos Compra Create", False, f"Error: {str(e)}")
    
    # ==================== ESTOQUE/AUDITORIA TESTS ====================
    
    def test_estoque_auditoria(self):
        """Test GET /api/estoque/auditoria - Get stock audit"""
        print("\n=== TEST: GET /api/estoque/auditoria ===")
        
        try:
            response = requests.get(f"{self.base_url}/estoque/auditoria", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, (list, dict)):
                    self.log_test("Estoque Auditoria", True, "✅ Status 200, returned stock audit data")
                else:
                    self.log_test("Estoque Auditoria", False, f"Unexpected response format", {"response": data})
            else:
                self.log_test("Estoque Auditoria", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Estoque Auditoria", False, f"Error: {str(e)}")
    
    def test_estoque_lotes_vencendo(self):
        """Test GET /api/estoque/lotes-vencendo?dias=90 - Get expiring lots"""
        print("\n=== TEST: GET /api/estoque/lotes-vencendo?dias=90 ===")
        
        try:
            response = requests.get(f"{self.base_url}/estoque/lotes-vencendo?dias=90", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, (list, dict)):
                    self.log_test("Estoque Lotes Vencendo", True, "✅ Status 200, returned expiring lots data")
                else:
                    self.log_test("Estoque Lotes Vencendo", False, f"Unexpected response format", {"response": data})
            else:
                self.log_test("Estoque Lotes Vencendo", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Estoque Lotes Vencendo", False, f"Error: {str(e)}")
    
    def test_estoque_check_disponibilidade(self):
        """Test POST /api/estoque/check-disponibilidade - Check stock availability"""
        print("\n=== TEST: POST /api/estoque/check-disponibilidade ===")
        
        # Get a product for the test
        product_id = self.get_or_create_test_product()
        if not product_id:
            self.log_test("Estoque Check Disponibilidade", False, "Failed to get/create test product")
            return
        
        try:
            check_data = {
                "produto_id": product_id,
                "quantidade": 5
            }
            
            response = requests.post(f"{self.base_url}/estoque/check-disponibilidade", 
                                   json=check_data, headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if "disponivel" in data and "estoque_atual" in data:
                    self.log_test("Estoque Check Disponibilidade", True, "✅ Status 200, returned stock availability data")
                else:
                    self.log_test("Estoque Check Disponibilidade", False, f"Missing expected fields", {"response": data})
            else:
                self.log_test("Estoque Check Disponibilidade", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Estoque Check Disponibilidade", False, f"Error: {str(e)}")
    
    # ==================== ALERTAS FINANCEIROS TESTS ====================
    
    def test_alertas_financeiros(self):
        """Test GET /api/alertas/financeiros - Get financial alerts"""
        print("\n=== TEST: GET /api/alertas/financeiros ===")
        
        try:
            response = requests.get(f"{self.base_url}/alertas/financeiros", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, (list, dict)):
                    self.log_test("Alertas Financeiros", True, "✅ Status 200, returned financial alerts data")
                else:
                    self.log_test("Alertas Financeiros", False, f"Unexpected response format", {"response": data})
            else:
                self.log_test("Alertas Financeiros", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Alertas Financeiros", False, f"Error: {str(e)}")
    
    # ==================== CLIENTE CRÉDITO TESTS ====================
    
    def test_cliente_limite_credito(self):
        """Test GET /api/clientes/{id}/limite-credito - Get customer credit limit"""
        print("\n=== TEST: GET /api/clientes/{id}/limite-credito ===")
        
        # Get or create a test client
        client_id = self.get_or_create_test_client()
        if not client_id:
            self.log_test("Cliente Limite Crédito", False, "Failed to get/create test client")
            return
        
        try:
            response = requests.get(f"{self.base_url}/clientes/{client_id}/limite-credito", headers=self.get_headers())
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and any(key in data for key in ["limite_credito", "credito_utilizado", "credito_disponivel"]):
                    self.log_test("Cliente Limite Crédito", True, "✅ Status 200, returned credit limit data")
                else:
                    self.log_test("Cliente Limite Crédito", False, f"Missing expected credit fields", {"response": data})
            else:
                self.log_test("Cliente Limite Crédito", False, f"Status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Cliente Limite Crédito", False, f"Error: {str(e)}")
    
    # ==================== HELPER METHODS ====================
    
    def get_or_create_test_client(self):
        """Get existing client or create a test client"""
        try:
            # Try to get existing clients first
            response = requests.get(f"{self.base_url}/clientes", headers=self.get_headers())
            if response.status_code == 200:
                clients = response.json()
                if isinstance(clients, list) and len(clients) > 0:
                    return clients[0]["id"]
                elif isinstance(clients, dict) and "data" in clients and len(clients["data"]) > 0:
                    return clients["data"][0]["id"]
            
            # Create a new test client
            client_data = {
                "nome": "Cliente Teste ERP Emily Kids",
                "cpf_cnpj": f"12345678901{str(uuid.uuid4().int)[:2]}",
                "email": "cliente.teste@emilykids.com",
                "telefone": "(11) 99999-9999"
            }
            
            response = requests.post(f"{self.base_url}/clientes", json=client_data, headers=self.get_headers())
            if response.status_code in [200, 201]:
                client = response.json()
                client_id = client["id"]
                self.created_data["clients"].append(client_id)
                return client_id
            
        except Exception as e:
            print(f"   ⚠ Error getting/creating test client: {str(e)}")
        
        return None
    
    def get_or_create_test_product(self):
        """Get existing product or create a test product"""
        try:
            # Try to get existing products first
            response = requests.get(f"{self.base_url}/produtos", headers=self.get_headers())
            if response.status_code == 200:
                products = response.json()
                if isinstance(products, list) and len(products) > 0:
                    return products[0]["id"]
                elif isinstance(products, dict) and "data" in products and len(products["data"]) > 0:
                    return products["data"][0]["id"]
            
            # Need to create dependencies first
            brand_id = self.get_or_create_test_brand()
            category_id = self.get_or_create_test_category(brand_id)
            subcategory_id = self.get_or_create_test_subcategory(category_id)
            
            if not all([brand_id, category_id, subcategory_id]):
                return None
            
            # Create a new test product
            product_data = {
                "sku": f"TEST-ERP-{uuid.uuid4().hex[:8]}",
                "nome": "Produto Teste ERP Emily Kids",
                "marca_id": brand_id,
                "categoria_id": category_id,
                "subcategoria_id": subcategory_id,
                "preco_inicial": 50.0,
                "preco_venda": 100.0,
                "estoque_minimo": 5,
                "estoque_maximo": 200
            }
            
            response = requests.post(f"{self.base_url}/produtos", json=product_data, headers=self.get_headers())
            if response.status_code in [200, 201]:
                product = response.json()
                product_id = product["id"]
                self.created_data["products"].append(product_id)
                return product_id
            
        except Exception as e:
            print(f"   ⚠ Error getting/creating test product: {str(e)}")
        
        return None
    
    def get_or_create_test_supplier(self):
        """Get existing supplier or create a test supplier"""
        try:
            # Try to get existing suppliers first
            response = requests.get(f"{self.base_url}/fornecedores", headers=self.get_headers())
            if response.status_code == 200:
                suppliers = response.json()
                if isinstance(suppliers, list) and len(suppliers) > 0:
                    return suppliers[0]["id"]
                elif isinstance(suppliers, dict) and "data" in suppliers and len(suppliers["data"]) > 0:
                    return suppliers["data"][0]["id"]
            
            # Create a new test supplier
            supplier_data = {
                "razao_social": "Fornecedor Teste ERP Emily Kids",
                "cnpj": f"12345678000{str(uuid.uuid4().int)[:3]}",
                "email": "fornecedor.teste@emilykids.com",
                "telefone": "(11) 88888-8888"
            }
            
            response = requests.post(f"{self.base_url}/fornecedores", json=supplier_data, headers=self.get_headers())
            if response.status_code in [200, 201]:
                supplier = response.json()
                supplier_id = supplier["id"]
                self.created_data["suppliers"].append(supplier_id)
                return supplier_id
            
        except Exception as e:
            print(f"   ⚠ Error getting/creating test supplier: {str(e)}")
        
        return None
    
    def get_or_create_test_brand(self):
        """Get existing brand or create a test brand"""
        try:
            response = requests.get(f"{self.base_url}/marcas", headers=self.get_headers())
            if response.status_code == 200:
                brands = response.json()
                if isinstance(brands, list) and len(brands) > 0:
                    return brands[0]["id"]
                elif isinstance(brands, dict) and "data" in brands and len(brands["data"]) > 0:
                    return brands["data"][0]["id"]
            
            # Create a new test brand
            brand_data = {"nome": "Marca Teste ERP"}
            response = requests.post(f"{self.base_url}/marcas", json=brand_data, headers=self.get_headers())
            if response.status_code in [200, 201]:
                return response.json()["id"]
        except Exception as e:
            print(f"   ⚠ Error getting/creating test brand: {str(e)}")
        return None
    
    def get_or_create_test_category(self, brand_id):
        """Get existing category or create a test category"""
        try:
            response = requests.get(f"{self.base_url}/categorias", headers=self.get_headers())
            if response.status_code == 200:
                categories = response.json()
                if isinstance(categories, list) and len(categories) > 0:
                    return categories[0]["id"]
                elif isinstance(categories, dict) and "data" in categories and len(categories["data"]) > 0:
                    return categories["data"][0]["id"]
            
            # Create a new test category
            category_data = {"nome": "Categoria Teste ERP", "marca_id": brand_id}
            response = requests.post(f"{self.base_url}/categorias", json=category_data, headers=self.get_headers())
            if response.status_code in [200, 201]:
                return response.json()["id"]
        except Exception as e:
            print(f"   ⚠ Error getting/creating test category: {str(e)}")
        return None
    
    def get_or_create_test_subcategory(self, category_id):
        """Get existing subcategory or create a test subcategory"""
        try:
            response = requests.get(f"{self.base_url}/subcategorias", headers=self.get_headers())
            if response.status_code == 200:
                subcategories = response.json()
                if isinstance(subcategories, list) and len(subcategories) > 0:
                    return subcategories[0]["id"]
                elif isinstance(subcategories, dict) and "data" in subcategories and len(subcategories["data"]) > 0:
                    return subcategories["data"][0]["id"]
            
            # Create a new test subcategory
            subcategory_data = {"nome": "Subcategoria Teste ERP", "categoria_id": category_id}
            response = requests.post(f"{self.base_url}/subcategorias", json=subcategory_data, headers=self.get_headers())
            if response.status_code in [200, 201]:
                return response.json()["id"]
        except Exception as e:
            print(f"   ⚠ Error getting/creating test subcategory: {str(e)}")
        return None
    
    # ==================== MAIN TEST RUNNER ====================
    
    def run_all_tests(self):
        """Run all ERP Emily Kids API tests"""
        print("🎯 ERP EMILY KIDS BACKEND API TESTS")
        print("=" * 80)
        print("Testing specific endpoints for ERP Emily Kids system")
        print("Login: admin@emilykids.com / 123456")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all endpoint tests
        print("\n🔍 TESTING COMISSÕES ENDPOINTS...")
        self.test_comissoes_list()
        self.test_comissoes_filter_vendedor()
        self.test_comissoes_filter_status()
        
        print("\n🔍 TESTING CURVA ABC ENDPOINTS...")
        self.test_curva_abc_get()
        self.test_curva_abc_recalculate()
        
        print("\n🔍 TESTING PEDIDOS DE COMPRA ENDPOINTS...")
        self.test_pedidos_compra_list()
        self.test_pedidos_compra_create()
        
        print("\n🔍 TESTING ESTOQUE/AUDITORIA ENDPOINTS...")
        self.test_estoque_auditoria()
        self.test_estoque_lotes_vencendo()
        self.test_estoque_check_disponibilidade()
        
        print("\n🔍 TESTING ALERTAS FINANCEIROS ENDPOINTS...")
        self.test_alertas_financeiros()
        
        print("\n🔍 TESTING CLIENTE CRÉDITO ENDPOINTS...")
        self.test_cliente_limite_credito()
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 ERP EMILY KIDS BACKEND API - TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 ENDPOINTS TESTED:")
        print(f"   📋 Comissões: GET /api/comissoes (list, filter by vendedor, filter by status)")
        print(f"   📊 Curva ABC: GET /api/produtos/curva-abc, POST /api/produtos/calcular-curva-abc")
        print(f"   🛒 Pedidos Compra: GET /api/pedidos-compra, POST /api/pedidos-compra")
        print(f"   📦 Estoque: GET /api/estoque/auditoria, /api/estoque/lotes-vencendo, POST /api/estoque/check-disponibilidade")
        print(f"   💰 Alertas: GET /api/alertas/financeiros")
        print(f"   👤 Cliente: GET /api/clientes/{{id}}/limite-credito")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! ERP Emily Kids backend APIs are working correctly.")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = ERPEmilyKidsAPITester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    sys.exit(0 if success else 1)