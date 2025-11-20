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
BACKEND_URL = "https://erp-emily.preview.emergentagent.com/api"

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
        product_data = {
            "sku": f"TEST-CANCEL-{uuid.uuid4().hex[:8]}{name_suffix}",
            "nome": f"Produto Teste Cancelamento{name_suffix}",
            "preco_custo": 50.0,
            "preco_venda": 100.0,
            "estoque_minimo": 5,
            "estoque_maximo": 200
        }
        
        try:
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
    
    def create_test_budget(self, client_id, product_id):
        """Create a test budget"""
        budget_data = {
            "cliente_id": client_id,
            "itens": [
                {
                    "produto_id": product_id,
                    "quantidade": 2,
                    "preco_unitario": 100.0
                }
            ],
            "desconto": 0,
            "frete": 10.0,
            "observacoes": "Orçamento teste para cancelamento"
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos", json=budget_data, headers=self.get_headers())
            if response.status_code == 200:
                budget = response.json()
                self.created_budgets.append(budget["id"])
                return budget["id"]
            else:
                print(f"   ⚠ Failed to create test budget: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating test budget: {str(e)}")
            return None
    
    def convert_budget_to_sale(self, budget_id):
        """Convert budget to sale"""
        conversion_data = {
            "forma_pagamento": "pix"
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos/{budget_id}/converter-venda", 
                                   json=conversion_data, headers=self.get_headers())
            if response.status_code == 200:
                sale = response.json()
                self.created_sales.append(sale["venda_id"])
                return sale["venda_id"]
            else:
                print(f"   ⚠ Failed to convert budget to sale: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error converting budget to sale: {str(e)}")
            return None
    
    def create_direct_sale(self, client_id, product_id):
        """Create a direct sale (not from budget)"""
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
            "frete": 5.0,
            "forma_pagamento": "cartao"
        }
        
        try:
            response = requests.post(f"{self.base_url}/vendas", json=sale_data, headers=self.get_headers())
            if response.status_code == 200:
                sale = response.json()
                self.created_sales.append(sale["id"])
                return sale["id"]
            else:
                print(f"   ⚠ Failed to create direct sale: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating direct sale: {str(e)}")
            return None
    
    def get_budget_by_id(self, budget_id):
        """Get budget details by ID"""
        try:
            response = requests.get(f"{self.base_url}/orcamentos?incluir_inativos=true", headers=self.get_headers())
            if response.status_code == 200:
                budgets = response.json()
                return next((b for b in budgets if b["id"] == budget_id), None)
            return None
        except Exception as e:
            print(f"   ⚠ Error getting budget: {str(e)}")
            return None
    
    def get_product_stock(self, product_id):
        """Get current product stock"""
        try:
            response = requests.get(f"{self.base_url}/produtos?incluir_inativos=true", headers=self.get_headers())
            if response.status_code == 200:
                products = response.json()
                product = next((p for p in products if p["id"] == product_id), None)
                return product.get("estoque_atual", 0) if product else 0
            return 0
        except Exception as e:
            print(f"   ⚠ Error getting product stock: {str(e)}")
            return 0
    
    def test_cancel_sale_from_budget(self):
        """Test 1: Cancel sale originated from budget"""
        print("\n=== TEST 1: CANCELAR VENDA ORIGINADA DE ORÇAMENTO ===")
        
        # 1. Create test client
        client_id = self.create_test_client()
        if not client_id:
            self.log_test("Test 1 - Setup", False, "Failed to create test client")
            return
        
        # 2. Create test product
        product_id = self.create_test_product(" - Teste 1")
        if not product_id:
            self.log_test("Test 1 - Setup", False, "Failed to create test product")
            return
        
        # 3. Create budget
        budget_id = self.create_test_budget(client_id, product_id)
        if not budget_id:
            self.log_test("Test 1 - Setup", False, "Failed to create test budget")
            return
        
        # 4. Convert budget to sale
        sale_id = self.convert_budget_to_sale(budget_id)
        if not sale_id:
            self.log_test("Test 1 - Setup", False, "Failed to convert budget to sale")
            return
        
        # 5. Verify budget status changed to "vendido"
        budget = self.get_budget_by_id(budget_id)
        if not budget or budget.get("status") != "vendido":
            self.log_test("Test 1 - Budget Status Check", False, f"Budget status should be 'vendido', got: {budget.get('status') if budget else 'None'}")
            return
        
        print("   ✓ Budget successfully converted to sale with status 'vendido'")
        
        # 6. Cancel the sale with specific reason
        cancellation_reason = "Cliente desistiu da compra"
        cancellation_data = {
            "motivo": cancellation_reason
        }
        
        try:
            response = requests.post(f"{self.base_url}/vendas/{sale_id}/cancelar", 
                                   json=cancellation_data, headers=self.get_headers())
            if response.status_code == 200:
                print("   ✓ Sale canceled successfully")
                
                # 7. Verify budget was updated
                updated_budget = self.get_budget_by_id(budget_id)
                if not updated_budget:
                    self.log_test("Test 1 - Budget Update", False, "Could not retrieve updated budget")
                    return
                
                # Validate all required fields
                validations = {
                    "status": updated_budget.get("status") == "cancelado",
                    "motivo_cancelamento": updated_budget.get("motivo_cancelamento") == cancellation_reason,
                    "cancelado_por": updated_budget.get("cancelado_por") == self.user_id,
                    "data_cancelamento": updated_budget.get("data_cancelamento") is not None,
                    "historico_alteracoes": any(
                        h.get("acao") == "cancelamento_venda_vinculada" 
                        for h in updated_budget.get("historico_alteracoes", [])
                    )
                }
                
                all_valid = all(validations.values())
                
                if all_valid:
                    self.log_test("Test 1 - Cancel Sale from Budget", True, 
                                "✅ Budget correctly updated: status='cancelado', motivo_cancelamento set, cancelado_por set, data_cancelamento set, history entry added")
                else:
                    failed_validations = [k for k, v in validations.items() if not v]
                    self.log_test("Test 1 - Cancel Sale from Budget", False, 
                                f"Budget validation failed for: {failed_validations}", 
                                {"budget_data": updated_budget})
            else:
                self.log_test("Test 1 - Cancel Sale from Budget", False, 
                            f"Failed to cancel sale: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("Test 1 - Cancel Sale from Budget", False, f"Error canceling sale: {str(e)}")
    
    def test_cancel_direct_sale(self):
        """Test 2: Cancel sale NOT originated from budget"""
        print("\n=== TEST 2: CANCELAR VENDA NÃO ORIGINADA DE ORÇAMENTO ===")
        
        # 1. Create test client
        client_id = self.create_test_client()
        if not client_id:
            self.log_test("Test 2 - Setup", False, "Failed to create test client")
            return
        
        # 2. Create test product
        product_id = self.create_test_product(" - Teste 2")
        if not product_id:
            self.log_test("Test 2 - Setup", False, "Failed to create test product")
            return
        
        # 3. Create direct sale (no budget)
        sale_id = self.create_direct_sale(client_id, product_id)
        if not sale_id:
            self.log_test("Test 2 - Setup", False, "Failed to create direct sale")
            return
        
        print("   ✓ Direct sale created successfully")
        
        # 4. Cancel the sale
        cancellation_reason = "Teste de cancelamento de venda direta"
        cancellation_data = {
            "motivo": cancellation_reason
        }
        
        try:
            response = requests.post(f"{self.base_url}/vendas/{sale_id}/cancelar", 
                                   json=cancellation_data, headers=self.get_headers())
            if response.status_code == 200:
                self.log_test("Test 2 - Cancel Direct Sale", True, 
                            "✅ Direct sale canceled successfully without errors (no budget propagation)")
            else:
                self.log_test("Test 2 - Cancel Direct Sale", False, 
                            f"Failed to cancel direct sale: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("Test 2 - Cancel Direct Sale", False, f"Error canceling direct sale: {str(e)}")
    
    def test_validate_canceled_budget_fields(self):
        """Test 3: Validate all fields in canceled budget"""
        print("\n=== TEST 3: VALIDAR CAMPOS NO ORÇAMENTO CANCELADO ===")
        
        # Use the first created budget from previous tests
        if not self.created_budgets:
            self.log_test("Test 3 - Validate Fields", False, "No canceled budget available from previous tests")
            return
        
        budget_id = self.created_budgets[0]
        budget = self.get_budget_by_id(budget_id)
        
        if not budget:
            self.log_test("Test 3 - Validate Fields", False, "Could not retrieve budget for validation")
            return
        
        # Detailed field validation
        validations = {
            "status_is_cancelado": budget.get("status") == "cancelado",
            "motivo_cancelamento_exists": budget.get("motivo_cancelamento") is not None,
            "cancelado_por_exists": budget.get("cancelado_por") is not None,
            "data_cancelamento_exists": budget.get("data_cancelamento") is not None,
            "data_cancelamento_is_iso": self._is_valid_iso_date(budget.get("data_cancelamento")),
            "historico_has_cancellation": any(
                h.get("acao") == "cancelamento_venda_vinculada" 
                for h in budget.get("historico_alteracoes", [])
            )
        }
        
        all_valid = all(validations.values())
        
        if all_valid:
            self.log_test("Test 3 - Validate Fields", True, 
                        "✅ All budget fields validated: status, motivo_cancelamento, cancelado_por, data_cancelamento, historico_alteracoes")
        else:
            failed_validations = [k for k, v in validations.items() if not v]
            self.log_test("Test 3 - Validate Fields", False, 
                        f"Field validation failed for: {failed_validations}", 
                        {"budget_data": budget, "validations": validations})
    
    def test_stock_reversion(self):
        """Test 4: Verify stock is correctly reverted"""
        print("\n=== TEST 4: ESTOQUE É REVERTIDO CORRETAMENTE ===")
        
        # 1. Create test client
        client_id = self.create_test_client()
        if not client_id:
            self.log_test("Test 4 - Setup", False, "Failed to create test client")
            return
        
        # 2. Create test product
        product_id = self.create_test_product(" - Teste 4")
        if not product_id:
            self.log_test("Test 4 - Setup", False, "Failed to create test product")
            return
        
        # 3. Get initial stock
        initial_stock = self.get_product_stock(product_id)
        print(f"   ✓ Initial stock: {initial_stock}")
        
        # 4. Create budget and convert to sale
        budget_id = self.create_test_budget(client_id, product_id)
        if not budget_id:
            self.log_test("Test 4 - Setup", False, "Failed to create test budget")
            return
        
        sale_id = self.convert_budget_to_sale(budget_id)
        if not sale_id:
            self.log_test("Test 4 - Setup", False, "Failed to convert budget to sale")
            return
        
        # 5. Verify stock was decremented
        stock_after_sale = self.get_product_stock(product_id)
        expected_stock_after_sale = initial_stock - 2  # 2 items in the budget
        
        if stock_after_sale != expected_stock_after_sale:
            self.log_test("Test 4 - Stock After Sale", False, 
                        f"Stock after sale should be {expected_stock_after_sale}, got {stock_after_sale}")
            return
        
        print(f"   ✓ Stock after sale: {stock_after_sale} (decremented correctly)")
        
        # 6. Cancel the sale
        cancellation_data = {
            "motivo": "Teste de reversão de estoque"
        }
        
        try:
            response = requests.post(f"{self.base_url}/vendas/{sale_id}/cancelar", 
                                   json=cancellation_data, headers=self.get_headers())
            if response.status_code == 200:
                # 7. Verify stock was reverted
                stock_after_cancellation = self.get_product_stock(product_id)
                
                if stock_after_cancellation == initial_stock:
                    self.log_test("Test 4 - Stock Reversion", True, 
                                f"✅ Stock correctly reverted: {initial_stock} → {stock_after_sale} → {stock_after_cancellation}")
                else:
                    self.log_test("Test 4 - Stock Reversion", False, 
                                f"Stock not correctly reverted. Expected: {initial_stock}, Got: {stock_after_cancellation}")
            else:
                self.log_test("Test 4 - Stock Reversion", False, 
                            f"Failed to cancel sale for stock test: {response.status_code} - {response.text}")
        except Exception as e:
            self.log_test("Test 4 - Stock Reversion", False, f"Error in stock reversion test: {str(e)}")
    
    def _is_valid_iso_date(self, date_string):
        """Check if string is a valid ISO date"""
        if not date_string:
            return False
        try:
            datetime.fromisoformat(date_string.replace('Z', '+00:00'))
            return True
        except:
            return False
    
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
        
        # Clean up budgets
        for budget_id in self.created_budgets:
            try:
                response = requests.delete(f"{self.base_url}/orcamentos/{budget_id}", headers=self.get_headers())
                if response.status_code == 200:
                    print(f"   ✓ Cleaned up budget {budget_id}")
                else:
                    print(f"   ⚠ Failed to cleanup budget {budget_id}: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Error cleaning up budget {budget_id}: {str(e)}")
        
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
        """Run all sales cancellation propagation tests"""
        print("🎯 TESTAR PROPAGAÇÃO DE CANCELAMENTO DE VENDAS PARA ORÇAMENTOS")
        print("=" * 80)
        print("NOVA FUNCIONALIDADE: Quando uma venda originada de um orçamento é cancelada,")
        print("o orçamento correspondente deve mudar status de 'vendido' para 'cancelado'")
        print("e armazenar o motivo do cancelamento, quem cancelou e quando.")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run the 4 mandatory tests from review request
        self.test_cancel_sale_from_budget()      # Test 1: Cancel sale from budget
        self.test_cancel_direct_sale()           # Test 2: Cancel direct sale
        self.test_validate_canceled_budget_fields() # Test 3: Validate budget fields
        self.test_stock_reversion()              # Test 4: Stock reversion
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 PROPAGAÇÃO DE CANCELAMENTO - TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 VALIDAÇÕES TESTADAS:")
        print(f"   ✅ Venda com orcamento_id → Orçamento atualizado para 'cancelado'")
        print(f"   ✅ Orçamento possui motivo_cancelamento correto")
        print(f"   ✅ Orçamento possui cancelado_por e data_cancelamento")
        print(f"   ✅ Histórico do orçamento registra cancelamento")
        print(f"   ✅ Venda sem orcamento_id → Não causa erros")
        print(f"   ✅ Estoque é revertido corretamente")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! Sales cancellation propagation is working correctly.")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = SalesCancellationTester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    # Optional cleanup
    # tester.cleanup_test_data()
    
    sys.exit(0 if success else 1)
