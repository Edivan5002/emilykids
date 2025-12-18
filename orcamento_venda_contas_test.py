#!/usr/bin/env python3
"""
Backend Test Suite for Orçamento -> Venda -> Contas a Receber Vinculadas

Tests the complete flow:
1. Create orçamento
2. Convert orçamento to venda
3. Verify orçamento has venda_id field after conversion
4. Verify contas a receber are created automatically
5. Test the endpoint GET /api/vendas/{venda_id}/contas-receber

This test addresses the specific issue where the frontend only shows linked accounts
if the orçamento has the venda_id field populated after conversion.
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://frontend-boost-10.preview.emergentagent.com/api"

class OrcamentoVendaContasTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        self.created_clients = []
        self.created_products = []
        self.created_orcamentos = []
        self.created_vendas = []
        
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
        
        # Use the credentials from the review request
        login_data = {"email": "admin@emilyerp.com", "senha": "admin123"}
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_test("Authentication", True, f"Admin login successful with {login_data['email']}")
                return True
            else:
                # Try alternative credentials if the first one fails
                alt_credentials = [
                    {"email": "edivancelestino@yahoo.com.br", "senha": "123456"},
                    {"email": "admin@emilykids.com", "senha": "Admin@123"},
                    {"email": "paulo2@gmail.com", "senha": "123456"}
                ]
                
                for alt_login in alt_credentials:
                    try:
                        response = requests.post(f"{self.base_url}/auth/login", json=alt_login)
                        if response.status_code == 200:
                            data = response.json()
                            self.token = data["access_token"]
                            self.user_id = data["user"]["id"]
                            self.log_test("Authentication", True, f"Admin login successful with {alt_login['email']}")
                            return True
                    except Exception as e:
                        continue
                
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
    
    def check_prerequisites(self):
        """Check if there are clients and products with stock available"""
        print("\n=== CHECKING PREREQUISITES ===")
        
        # Check clients
        try:
            response = requests.get(f"{self.base_url}/clientes", headers=self.get_headers())
            if response.status_code == 200:
                clients = response.json()
                if len(clients) > 0:
                    print(f"   ✓ Found {len(clients)} clients in system")
                    self.existing_client_id = clients[0]["id"]
                else:
                    print("   ⚠ No clients found, will create test client")
                    self.existing_client_id = None
            else:
                print(f"   ⚠ Failed to fetch clients: {response.status_code}")
                self.existing_client_id = None
        except Exception as e:
            print(f"   ⚠ Error checking clients: {str(e)}")
            self.existing_client_id = None
        
        # Check products with stock
        try:
            response = requests.get(f"{self.base_url}/produtos", headers=self.get_headers())
            if response.status_code == 200:
                products = response.json()
                products_with_stock = [p for p in products if p.get("estoque_atual", 0) > 0]
                if len(products_with_stock) > 0:
                    print(f"   ✓ Found {len(products_with_stock)} products with stock available")
                    self.existing_product_id = products_with_stock[0]["id"]
                else:
                    print("   ⚠ No products with stock found, will create test product")
                    self.existing_product_id = None
            else:
                print(f"   ⚠ Failed to fetch products: {response.status_code}")
                self.existing_product_id = None
        except Exception as e:
            print(f"   ⚠ Error checking products: {str(e)}")
            self.existing_product_id = None
    
    def create_test_client(self):
        """Create a test client"""
        client_data = {
            "nome": "Cliente Teste Orçamento Venda",
            "cpf_cnpj": f"12345678901{str(uuid.uuid4().int)[:2]}"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clientes", json=client_data, headers=self.get_headers())
            if response.status_code == 200:
                client = response.json()
                self.created_clients.append(client["id"])
                print(f"   ✓ Created test client: {client['id']}")
                return client["id"]
            else:
                print(f"   ⚠ Failed to create test client: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating test client: {str(e)}")
            return None
    
    def create_test_product(self):
        """Create a test product with stock"""
        # Get existing brands, categories, subcategories
        try:
            # Get first available brand
            brands_response = requests.get(f"{self.base_url}/marcas", headers=self.get_headers())
            brands = brands_response.json() if brands_response.status_code == 200 else []
            if not brands:
                brand_data = {"nome": "Marca Teste Orçamento"}
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
                category_data = {"nome": "Categoria Teste Orçamento", "marca_id": brands[0]["id"]}
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
                subcategory_data = {"nome": "Subcategoria Teste Orçamento", "categoria_id": categories[0]["id"]}
                subcategory_response = requests.post(f"{self.base_url}/subcategorias", json=subcategory_data, headers=self.get_headers())
                if subcategory_response.status_code == 200:
                    subcategories = [subcategory_response.json()]
                else:
                    print(f"   ⚠ Failed to create subcategory: {subcategory_response.status_code}")
                    return None
            
            product_data = {
                "sku": f"TEST-ORC-{uuid.uuid4().hex[:8]}",
                "nome": "Produto Teste Orçamento Venda",
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
                    "motivo": "Estoque inicial para teste orçamento",
                    "tipo": "entrada"
                }
                
                stock_response = requests.post(f"{self.base_url}/estoque/ajuste-manual", 
                                             json=stock_adjustment, headers=self.get_headers())
                if stock_response.status_code == 200:
                    print(f"   ✓ Created product with initial stock of 100: {product_id}")
                else:
                    print(f"   ⚠ Failed to set initial stock: {stock_response.status_code}")
                
                return product_id
            else:
                print(f"   ⚠ Failed to create test product: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating test product: {str(e)}")
            return None
    
    def test_step_1_create_orcamento(self):
        """Step 1: Create orçamento"""
        print("\n=== STEP 1: CRIAR ORÇAMENTO ===")
        
        # Get or create client
        client_id = self.existing_client_id or self.create_test_client()
        if not client_id:
            self.log_test("Step 1 - Create Orçamento", False, "Failed to get/create client")
            return None
        
        # Use existing product with good stock or create new one
        product_id = self.existing_product_id
        if not product_id:
            # Try to find a product with good stock (>10 units)
            try:
                response = requests.get(f"{self.base_url}/produtos", headers=self.get_headers())
                if response.status_code == 200:
                    products = response.json()
                    good_stock_products = [p for p in products if p.get("estoque_atual", 0) >= 10]
                    if good_stock_products:
                        product_id = good_stock_products[0]["id"]
                        print(f"   ✓ Using existing product with stock: {good_stock_products[0]['nome']} (Stock: {good_stock_products[0]['estoque_atual']})")
                    else:
                        product_id = self.create_test_product()
                else:
                    product_id = self.create_test_product()
            except:
                product_id = self.create_test_product()
        
        if not product_id:
            self.log_test("Step 1 - Create Orçamento", False, "Failed to get/create product")
            return None
        
        # Create orçamento
        orcamento_data = {
            "cliente_id": client_id,
            "itens": [
                {
                    "produto_id": product_id,
                    "quantidade": 2,
                    "preco_unitario": 100.0
                }
            ],
            "desconto": 0,
            "frete": 0,
            "observacoes": "Orçamento teste para conversão em venda"
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos", json=orcamento_data, headers=self.get_headers())
            if response.status_code == 200:
                orcamento = response.json()
                orcamento_id = orcamento["id"]
                self.created_orcamentos.append(orcamento_id)
                self.log_test("Step 1 - Create Orçamento", True, f"Orçamento created successfully: {orcamento_id}")
                print(f"   ✓ Orçamento ID: {orcamento_id}")
                return orcamento_id
            else:
                self.log_test("Step 1 - Create Orçamento", False, f"Failed to create orçamento: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            self.log_test("Step 1 - Create Orçamento", False, f"Error creating orçamento: {str(e)}")
            return None
    
    def test_step_2_convert_to_venda(self, orcamento_id):
        """Step 2: Convert orçamento to venda"""
        print("\n=== STEP 2: CONVERTER ORÇAMENTO EM VENDA ===")
        
        conversion_data = {
            "forma_pagamento": "pix",
            "numero_parcelas": 2,
            "tipo_pagamento": "parcelado"
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos/{orcamento_id}/converter-venda", 
                                   json=conversion_data, headers=self.get_headers())
            if response.status_code == 200:
                conversion_result = response.json()
                venda_id = conversion_result.get("venda_id")
                
                if venda_id:
                    self.created_vendas.append(venda_id)
                    self.log_test("Step 2 - Convert to Venda", True, f"Conversion successful, venda_id: {venda_id}")
                    print(f"   ✓ Venda ID: {venda_id}")
                    return venda_id
                else:
                    self.log_test("Step 2 - Convert to Venda", False, "Response missing venda_id field", {"response": conversion_result})
                    return None
            else:
                self.log_test("Step 2 - Convert to Venda", False, f"Conversion failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            self.log_test("Step 2 - Convert to Venda", False, f"Error converting orçamento: {str(e)}")
            return None
    
    def test_step_3_verify_orcamento_after_conversion(self, orcamento_id, expected_venda_id):
        """Step 3: Verify orçamento has venda_id after conversion"""
        print("\n=== STEP 3: VERIFICAR ORÇAMENTO APÓS CONVERSÃO ===")
        
        try:
            response = requests.get(f"{self.base_url}/orcamentos/{orcamento_id}", headers=self.get_headers())
            if response.status_code == 200:
                orcamento = response.json()
                
                # Check status
                if orcamento.get("status") == "vendido":
                    status_ok = True
                    print(f"   ✓ Status: {orcamento.get('status')}")
                else:
                    status_ok = False
                    print(f"   ❌ Status: {orcamento.get('status')} (expected: vendido)")
                
                # Check venda_id field - THIS IS THE CRITICAL CHECK
                if orcamento.get("venda_id") == expected_venda_id:
                    venda_id_ok = True
                    print(f"   ✓ venda_id: {orcamento.get('venda_id')}")
                else:
                    venda_id_ok = False
                    print(f"   ❌ venda_id: {orcamento.get('venda_id')} (expected: {expected_venda_id})")
                
                if status_ok and venda_id_ok:
                    self.log_test("Step 3 - Verify Orçamento", True, 
                                f"✅ Orçamento has status='vendido' and venda_id='{expected_venda_id}'")
                    return True
                else:
                    self.log_test("Step 3 - Verify Orçamento", False, 
                                "Orçamento missing required fields after conversion", 
                                {"orcamento": orcamento})
                    return False
            else:
                self.log_test("Step 3 - Verify Orçamento", False, 
                            f"Failed to fetch orçamento: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Step 3 - Verify Orçamento", False, f"Error verifying orçamento: {str(e)}")
            return False
    
    def test_step_4_fetch_contas_receber(self, venda_id):
        """Step 4: Fetch contas a receber vinculadas"""
        print("\n=== STEP 4: BUSCAR CONTAS A RECEBER VINCULADAS ===")
        
        try:
            response = requests.get(f"{self.base_url}/vendas/{venda_id}/contas-receber", headers=self.get_headers())
            if response.status_code == 200:
                contas = response.json()
                
                # Should have 2 contas (2 parcelas)
                if len(contas) == 2:
                    # Verify each conta has correct structure
                    all_valid = True
                    for conta in contas:
                        if (conta.get("origem") != "venda" or 
                            conta.get("origem_id") != venda_id):
                            all_valid = False
                            break
                    
                    if all_valid:
                        self.log_test("Step 4 - Fetch Contas Receber", True, 
                                    f"✅ Found 2 contas a receber with origem='venda' and origem_id='{venda_id}'")
                        print(f"   ✓ Contas found: {len(contas)}")
                        for i, conta in enumerate(contas, 1):
                            print(f"   ✓ Conta {i}: {conta.get('numero')} - Status: {conta.get('status')}")
                        return True
                    else:
                        self.log_test("Step 4 - Fetch Contas Receber", False, 
                                    "Contas structure validation failed", {"contas": contas})
                        return False
                else:
                    self.log_test("Step 4 - Fetch Contas Receber", False, 
                                f"Expected 2 contas, got {len(contas)}", {"contas": contas})
                    return False
            else:
                self.log_test("Step 4 - Fetch Contas Receber", False, 
                            f"Failed to fetch contas: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Step 4 - Fetch Contas Receber", False, f"Error fetching contas: {str(e)}")
            return False
    
    def test_step_5_list_orcamentos(self, orcamento_id, expected_venda_id):
        """Step 5: List orçamentos and verify venda_id appears"""
        print("\n=== STEP 5: LISTAR ORÇAMENTOS ===")
        
        try:
            response = requests.get(f"{self.base_url}/orcamentos", headers=self.get_headers())
            if response.status_code == 200:
                orcamentos = response.json()
                
                # Find our orçamento in the list
                our_orcamento = None
                for orc in orcamentos:
                    if orc.get("id") == orcamento_id:
                        our_orcamento = orc
                        break
                
                if our_orcamento:
                    if our_orcamento.get("venda_id") == expected_venda_id:
                        self.log_test("Step 5 - List Orçamentos", True, 
                                    f"✅ Orçamento appears in list with venda_id='{expected_venda_id}'")
                        return True
                    else:
                        self.log_test("Step 5 - List Orçamentos", False, 
                                    f"Orçamento in list missing venda_id: {our_orcamento.get('venda_id')}")
                        return False
                else:
                    self.log_test("Step 5 - List Orçamentos", False, 
                                "Orçamento not found in list")
                    return False
            else:
                self.log_test("Step 5 - List Orçamentos", False, 
                            f"Failed to list orçamentos: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Step 5 - List Orçamentos", False, f"Error listing orçamentos: {str(e)}")
            return False
    
    def run_complete_flow_test(self):
        """Run the complete flow test"""
        print("🎯 TESTE COMPLETO: ORÇAMENTO → VENDA → CONTAS A RECEBER VINCULADAS")
        print("=" * 80)
        print("FLUXO DE TESTE:")
        print("1. Criar orçamento com pelo menos 1 item")
        print("2. Converter orçamento em venda (pix, 2 parcelas)")
        print("3. Verificar se orçamento tem venda_id após conversão")
        print("4. Buscar contas a receber vinculadas")
        print("5. Verificar se orçamento aparece na lista com venda_id")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Check prerequisites
        self.check_prerequisites()
        
        # Step 1: Create orçamento
        orcamento_id = self.test_step_1_create_orcamento()
        if not orcamento_id:
            print("❌ Failed at Step 1. Cannot continue.")
            return False
        
        # Step 2: Convert to venda
        venda_id = self.test_step_2_convert_to_venda(orcamento_id)
        if not venda_id:
            print("❌ Failed at Step 2. Cannot continue.")
            return False
        
        # Step 3: Verify orçamento after conversion (CRITICAL TEST)
        step3_success = self.test_step_3_verify_orcamento_after_conversion(orcamento_id, venda_id)
        
        # Step 4: Fetch contas a receber
        step4_success = self.test_step_4_fetch_contas_receber(venda_id)
        
        # Step 5: List orçamentos
        step5_success = self.test_step_5_list_orcamentos(orcamento_id, venda_id)
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 TESTE COMPLETO: ORÇAMENTO → VENDA → CONTAS A RECEBER - RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 VALIDAÇÕES CRÍTICAS:")
        
        # Check specific critical validations
        critical_tests = {
            "Step 3 - Verify Orçamento": "Orçamento tem venda_id após conversão",
            "Step 4 - Fetch Contas Receber": "Contas a receber são criadas automaticamente",
            "Step 2 - Convert to Venda": "Conversão retorna venda_id",
            "Step 5 - List Orçamentos": "Orçamento aparece na lista com venda_id"
        }
        
        for result in self.test_results:
            test_name = result["test"]
            if test_name in critical_tests:
                status = "✅" if result["success"] else "❌"
                description = critical_tests[test_name]
                print(f"   {status} {description}")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! The complete flow is working correctly.")
            print(f"   ✅ Frontend will be able to display linked accounts properly.")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = OrcamentoVendaContasTester()
    success = tester.run_complete_flow_test()
    tester.print_summary()
    
    sys.exit(0 if success else 1)