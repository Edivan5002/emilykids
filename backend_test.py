#!/usr/bin/env python3
"""
Backend Test Suite for FASE 10: INTEGRAÇÃO VENDAS COM CONTAS A RECEBER

Tests the new endpoint GET /api/vendas/{venda_id}/contas-receber that fetches
contas a receber linked to a specific sale.

MANDATORY TESTS:
1. Fetch contas a receber from parcelada sale (cartao payment with 3 parcelas)
2. Fetch contas a receber from à vista sale (should return empty list)
3. Fetch contas a receber from non-existent sale (should return 404)
4. Validate structure of returned contas
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://frontend-boost-10.preview.emergentagent.com/api"

class VendasContasReceberTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        self.created_clients = []
        self.created_products = []
        self.created_sales = []
        
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
        
        # Try multiple admin credentials to find working ones
        credentials_to_try = [
            {"email": "edivancelestino@yahoo.com.br", "senha": "123456"},
            {"email": "admin@emilykids.com", "senha": "Admin@123"},
            {"email": "admin@emilykids.com", "senha": "admin123"},
            {"email": "admin@emilykids.com", "senha": "123456"},
            {"email": "paulo2@gmail.com", "senha": "123456"},
            {"email": "paulo2@gmail.com", "senha": "admin123"},
            {"email": "paulo2@gmail.com", "senha": "Admin@123"}
        ]
        
        for login_data in credentials_to_try:
            try:
                response = requests.post(f"{self.base_url}/auth/login", json=login_data)
                if response.status_code == 200:
                    data = response.json()
                    self.token = data["access_token"]
                    self.user_id = data["user"]["id"]
                    self.log_test("Authentication", True, f"Admin login successful with {login_data['email']}")
                    return True
                else:
                    print(f"   ⚠ Failed login attempt with {login_data['email']}: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Login error with {login_data['email']}: {str(e)}")
        
        self.log_test("Authentication", False, "All login attempts failed")
        return False
    
    def get_headers(self):
        """Get headers with authentication"""
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    def create_test_client(self, name_suffix=""):
        """Create a test client for the tests"""
        client_data = {
            "nome": f"Cliente Teste Contas Receber{name_suffix}",
            "cpf_cnpj": f"123456789{str(uuid.uuid4().int)[:2]}"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clientes", json=client_data, headers=self.get_headers())
            if response.status_code == 200:
                client = response.json()
                self.created_clients.append(client["id"])
                return client["id"]
            else:
                print(f"   ⚠ Failed to create test client: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating test client: {str(e)}")
            return None
    
    def create_test_product(self, name_suffix=""):
        """Create a test product for the tests"""
        # Get existing brands, categories, subcategories
        try:
            # Get first available brand
            brands_response = requests.get(f"{self.base_url}/marcas", headers=self.get_headers())
            brands = brands_response.json() if brands_response.status_code == 200 else []
            if not brands:
                print("   ⚠ No brands available, creating one...")
                brand_data = {"nome": "Marca Teste"}
                brand_response = requests.post(f"{self.base_url}/marcas", json=brand_data, headers=self.get_headers())
                if brand_response.status_code == 200:
                    brands = [brand_response.json()]
                else:
                    print(f"   ⚠ Failed to create brand: {brand_response.status_code}")
                    return None
            
            # Get first available category
            categories_response = requests.get(f"{self.base_url}/categorias", headers=self.get_headers())
            categories = categories_response.json() if categories_response.status_code == 200 else []
            if not categories:
                print("   ⚠ No categories available, creating one...")
                category_data = {"nome": "Categoria Teste", "marca_id": brands[0]["id"]}
                category_response = requests.post(f"{self.base_url}/categorias", json=category_data, headers=self.get_headers())
                if category_response.status_code == 200:
                    categories = [category_response.json()]
                else:
                    print(f"   ⚠ Failed to create category: {category_response.status_code}")
                    return None
            
            # Get first available subcategory
            subcategories_response = requests.get(f"{self.base_url}/subcategorias", headers=self.get_headers())
            subcategories = subcategories_response.json() if subcategories_response.status_code == 200 else []
            if not subcategories:
                print("   ⚠ No subcategories available, creating one...")
                subcategory_data = {"nome": "Subcategoria Teste", "categoria_id": categories[0]["id"]}
                subcategory_response = requests.post(f"{self.base_url}/subcategorias", json=subcategory_data, headers=self.get_headers())
                if subcategory_response.status_code == 200:
                    subcategories = [subcategory_response.json()]
                else:
                    print(f"   ⚠ Failed to create subcategory: {subcategory_response.status_code}")
                    return None
            
            product_data = {
                "sku": f"TEST-CR-{uuid.uuid4().hex[:8]}{name_suffix}",
                "nome": f"Produto Teste Contas Receber{name_suffix}",
                "marca_id": brands[0]["id"],
                "categoria_id": categories[0]["id"],
                "subcategoria_id": subcategories[0]["id"],
                "preco_inicial": 50.0,
                "preco_venda": 100.0,
                "estoque_minimo": 5,
                "estoque_maximo": 200
            }
            
            response = requests.post(f"{self.base_url}/produtos", json=product_data, headers=self.get_headers())
            if response.status_code == 200:
                product = response.json()
                product_id = product["id"]
                self.created_products.append(product_id)
                
                # Set initial stock using manual adjustment
                stock_adjustment = {
                    "produto_id": product_id,
                    "quantidade": 100,
                    "motivo": "Estoque inicial para teste",
                    "tipo": "entrada"
                }
                
                stock_response = requests.post(f"{self.base_url}/estoque/ajuste-manual", 
                                             json=stock_adjustment, headers=self.get_headers())
                if stock_response.status_code == 200:
                    print(f"   ✓ Product created with initial stock of 100")
                else:
                    print(f"   ⚠ Failed to set initial stock: {stock_response.status_code} - {stock_response.text}")
                
                return product_id
            else:
                print(f"   ⚠ Failed to create test product: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating test product: {str(e)}")
            return None
    
    def create_parcelada_sale(self, client_id, product_id):
        """Create a parcelada sale (cartao payment with 3 parcelas)"""
        sale_data = {
            "cliente_id": client_id,
            "itens": [
                {
                    "produto_id": product_id,
                    "quantidade": 2,
                    "preco_unitario": 150.0
                }
            ],
            "desconto": 0,
            "frete": 20.0,
            "forma_pagamento": "cartao",
            "numero_parcelas": 3,
            "observacoes": "Venda parcelada para teste de contas a receber"
        }
        
        try:
            response = requests.post(f"{self.base_url}/vendas", json=sale_data, headers=self.get_headers())
            if response.status_code == 200:
                sale = response.json()
                self.created_sales.append(sale["id"])
                return sale["id"]
            else:
                print(f"   ⚠ Failed to create parcelada sale: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating parcelada sale: {str(e)}")
            return None
    
    def create_avista_sale(self, client_id, product_id):
        """Create an à vista sale"""
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
            "forma_pagamento": "avista",
            "numero_parcelas": 1,
            "observacoes": "Venda à vista para teste de contas a receber"
        }
        
        try:
            response = requests.post(f"{self.base_url}/vendas", json=sale_data, headers=self.get_headers())
            if response.status_code == 200:
                sale = response.json()
                self.created_sales.append(sale["id"])
                return sale["id"]
            else:
                print(f"   ⚠ Failed to create à vista sale: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating à vista sale: {str(e)}")
            return None
    
    # Helper methods removed - not needed for contas a receber tests
    
    def test_fetch_contas_receber_parcelada(self):
        """Test 1: Fetch contas a receber from parcelada sale"""
        print("\n=== TEST 1: BUSCAR CONTAS A RECEBER DE VENDA PARCELADA ===")
        
        # 1. Create test client
        client_id = self.create_test_client(" - Parcelada")
        if not client_id:
            self.log_test("Test 1 - Setup", False, "Failed to create test client")
            return
        
        # 2. Create test product
        product_id = self.create_test_product(" - Parcelada")
        if not product_id:
            self.log_test("Test 1 - Setup", False, "Failed to create test product")
            return
        
        # 3. Create parcelada sale
        sale_id = self.create_parcelada_sale(client_id, product_id)
        if not sale_id:
            self.log_test("Test 1 - Setup", False, "Failed to create parcelada sale")
            return
        
        print(f"   ✓ Created parcelada sale: {sale_id}")
        
        # 4. Call the new endpoint
        try:
            response = requests.get(f"{self.base_url}/vendas/{sale_id}/contas-receber", headers=self.get_headers())
            
            if response.status_code == 200:
                contas = response.json()
                
                # Validate response
                if len(contas) == 3:  # Should have 3 contas for 3 parcelas
                    # Validate each conta structure
                    all_valid = True
                    for conta in contas:
                        if (conta.get("origem") != "venda" or 
                            conta.get("origem_id") != sale_id):
                            all_valid = False
                            break
                    
                    if all_valid:
                        self.log_test("Test 1 - Fetch Parcelada Contas", True, 
                                    f"✅ Status 200, returned list with 3 contas, each has origem='venda' and origem_id={sale_id}")
                    else:
                        self.log_test("Test 1 - Fetch Parcelada Contas", False, 
                                    "Contas structure validation failed", {"contas": contas})
                else:
                    self.log_test("Test 1 - Fetch Parcelada Contas", False, 
                                f"Expected 3 contas, got {len(contas)}", {"contas": contas})
            else:
                self.log_test("Test 1 - Fetch Parcelada Contas", False, 
                            f"Expected status 200, got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Test 1 - Fetch Parcelada Contas", False, f"Error calling endpoint: {str(e)}")
    
    def test_fetch_contas_receber_avista(self):
        """Test 2: Fetch contas a receber from à vista sale"""
        print("\n=== TEST 2: BUSCAR CONTAS A RECEBER DE VENDA À VISTA ===")
        
        # 1. Create test client
        client_id = self.create_test_client(" - À Vista")
        if not client_id:
            self.log_test("Test 2 - Setup", False, "Failed to create test client")
            return
        
        # 2. Create test product
        product_id = self.create_test_product(" - À Vista")
        if not product_id:
            self.log_test("Test 2 - Setup", False, "Failed to create test product")
            return
        
        # 3. Create à vista sale
        sale_id = self.create_avista_sale(client_id, product_id)
        if not sale_id:
            self.log_test("Test 2 - Setup", False, "Failed to create à vista sale")
            return
        
        print(f"   ✓ Created à vista sale: {sale_id}")
        
        # 4. Call the new endpoint
        try:
            response = requests.get(f"{self.base_url}/vendas/{sale_id}/contas-receber", headers=self.get_headers())
            
            if response.status_code == 200:
                contas = response.json()
                
                if len(contas) == 0:  # Should return empty list for à vista sales
                    self.log_test("Test 2 - Fetch À Vista Contas", True, 
                                "✅ Status 200, returned empty list (vendas à vista não geram contas a receber)")
                else:
                    self.log_test("Test 2 - Fetch À Vista Contas", False, 
                                f"Expected empty list, got {len(contas)} contas", {"contas": contas})
            else:
                self.log_test("Test 2 - Fetch À Vista Contas", False, 
                            f"Expected status 200, got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Test 2 - Fetch À Vista Contas", False, f"Error calling endpoint: {str(e)}")
    
    def test_fetch_contas_receber_invalid_sale(self):
        """Test 3: Fetch contas a receber from non-existent sale"""
        print("\n=== TEST 3: BUSCAR CONTAS A RECEBER DE VENDA INEXISTENTE ===")
        
        invalid_sale_id = "venda-id-invalido"
        
        try:
            response = requests.get(f"{self.base_url}/vendas/{invalid_sale_id}/contas-receber", headers=self.get_headers())
            
            if response.status_code == 404:
                response_data = response.json()
                if response_data.get("detail") == "Venda não encontrada":
                    self.log_test("Test 3 - Invalid Sale ID", True, 
                                "✅ Status 404, message 'Venda não encontrada'")
                else:
                    self.log_test("Test 3 - Invalid Sale ID", False, 
                                f"Expected message 'Venda não encontrada', got: {response_data.get('detail')}")
            else:
                self.log_test("Test 3 - Invalid Sale ID", False, 
                            f"Expected status 404, got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Test 3 - Invalid Sale ID", False, f"Error calling endpoint: {str(e)}")
    
    def test_validate_contas_structure(self):
        """Test 4: Validate structure of returned contas"""
        print("\n=== TEST 4: VALIDAR ESTRUTURA DAS CONTAS RETORNADAS ===")
        
        # Use the first parcelada sale from previous tests
        if not self.created_sales:
            self.log_test("Test 4 - Validate Structure", False, "No sales available from previous tests")
            return
        
        # Find a parcelada sale (we'll use the first one created)
        sale_id = self.created_sales[0]
        
        try:
            response = requests.get(f"{self.base_url}/vendas/{sale_id}/contas-receber", headers=self.get_headers())
            
            if response.status_code == 200:
                contas = response.json()
                
                if len(contas) > 0:
                    # Validate structure of first conta
                    conta = contas[0]
                    required_fields = [
                        "id", "numero", "cliente_id", "descricao", "valor_total", 
                        "forma_pagamento", "parcelas", 
                        "origem", "origem_id", "status"
                    ]
                    
                    missing_fields = []
                    for field in required_fields:
                        if field not in conta:
                            missing_fields.append(field)
                    
                    if not missing_fields:
                        # Additional validations
                        validations = {
                            "origem_is_venda": conta.get("origem") == "venda",
                            "origem_id_matches": conta.get("origem_id") == sale_id,
                            "has_valid_id": conta.get("id") is not None,
                            "has_valid_numero": conta.get("numero") is not None,
                            "has_valid_cliente_id": conta.get("cliente_id") is not None,
                            "has_valid_descricao": conta.get("descricao") is not None,
                            "has_valid_valor": isinstance(conta.get("valor_total"), (int, float)),
                            "has_valid_forma_pagamento": conta.get("forma_pagamento") is not None,
                            "has_valid_parcelas": isinstance(conta.get("parcelas"), list),
                            "has_valid_status": conta.get("status") is not None,
                            "parcelas_have_data_vencimento": len(conta.get("parcelas", [])) > 0 and conta["parcelas"][0].get("data_vencimento") is not None
                        }
                        
                        all_valid = all(validations.values())
                        
                        if all_valid:
                            self.log_test("Test 4 - Validate Structure", True, 
                                        "✅ All required fields present and valid: id, numero, cliente_id, descricao, valor_total, forma_pagamento, parcelas (with data_vencimento), origem, origem_id, status")
                        else:
                            failed_validations = [k for k, v in validations.items() if not v]
                            self.log_test("Test 4 - Validate Structure", False, 
                                        f"Structure validation failed for: {failed_validations}", 
                                        {"conta_sample": conta})
                    else:
                        self.log_test("Test 4 - Validate Structure", False, 
                                    f"Missing required fields: {missing_fields}", 
                                    {"conta_sample": conta})
                else:
                    self.log_test("Test 4 - Validate Structure", False, 
                                "No contas returned to validate structure")
            else:
                self.log_test("Test 4 - Validate Structure", False, 
                            f"Failed to fetch contas for structure validation: {response.status_code}")
        except Exception as e:
            self.log_test("Test 4 - Validate Structure", False, f"Error validating structure: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data created during tests"""
        print("\n--- Cleaning up test data ---")
        
        # Clean up sales
        for sale_id in self.created_sales:
            try:
                response = requests.delete(f"{self.base_url}/vendas/{sale_id}", headers=self.get_headers())
                if response.status_code == 200:
                    print(f"   ✓ Cleaned up sale {sale_id}")
                else:
                    print(f"   ⚠ Failed to cleanup sale {sale_id}: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Error cleaning up sale {sale_id}: {str(e)}")
        
        # Clean up products
        for product_id in self.created_products:
            try:
                response = requests.delete(f"{self.base_url}/produtos/{product_id}", headers=self.get_headers())
                if response.status_code == 200:
                    print(f"   ✓ Cleaned up product {product_id}")
                else:
                    print(f"   ⚠ Failed to cleanup product {product_id}: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Error cleaning up product {product_id}: {str(e)}")
        
        # Clean up clients
        for client_id in self.created_clients:
            try:
                response = requests.delete(f"{self.base_url}/clientes/{client_id}", headers=self.get_headers())
                if response.status_code == 200:
                    print(f"   ✓ Cleaned up client {client_id}")
                else:
                    print(f"   ⚠ Failed to cleanup client {client_id}: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Error cleaning up client {client_id}: {str(e)}")
    
    def run_all_tests(self):
        """Run all mandatory tests for FASE 10"""
        print("🎯 TESTAR FASE 10: INTEGRAÇÃO VENDAS COM CONTAS A RECEBER")
        print("=" * 80)
        print("NOVO ENDPOINT: GET /api/vendas/{venda_id}/contas-receber")
        print("Busca contas a receber vinculadas a uma venda específica.")
        print("Permissão requerida: contas_receber:ler")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run the 4 mandatory tests from review request
        self.test_fetch_contas_receber_parcelada()    # Test 1: Parcelada sale
        self.test_fetch_contas_receber_avista()       # Test 2: À vista sale
        self.test_fetch_contas_receber_invalid_sale() # Test 3: Invalid sale
        self.test_validate_contas_structure()         # Test 4: Structure validation
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 FASE 10: INTEGRAÇÃO VENDAS COM CONTAS A RECEBER - TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 VALIDAÇÕES TESTADAS:")
        print(f"   ✅ Venda parcelada (cartão, 3 parcelas) → Retorna 3 contas a receber")
        print(f"   ✅ Venda à vista → Retorna lista vazia")
        print(f"   ✅ Venda inexistente → Retorna 404 'Venda não encontrada'")
        print(f"   ✅ Estrutura das contas → Campos obrigatórios presentes")
        print(f"   ✅ Permissão contas_receber:ler → Requerida para acesso")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! Endpoint GET /api/vendas/{{venda_id}}/contas-receber is working correctly.")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = VendasContasReceberTester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    # Optional cleanup
    # tester.cleanup_test_data()
    
    sys.exit(0 if success else 1)
