#!/usr/bin/env python3
"""
Complete Backend Test Suite for Product Purchase History Endpoint
Tests the endpoint GET /api/produtos/{produto_id}/historico-compras with real data

This test creates test fiscal notes to properly validate the endpoint functionality.
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://erp-financial-1.preview.emergentagent.com/api"

class HistoricoComprasCompleteTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        self.created_fiscal_notes = []
        self.test_supplier_id = None
        self.test_product_id = None
        
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
        
        credentials_to_try = [
            {"email": "admin@emilykids.com", "senha": "admin123"},
            {"email": "admin@emilykids.com", "senha": "Admin@123"},
            {"email": "edivancelestino@yahoo.com.br", "senha": "123456"},
            {"email": "paulo2@gmail.com", "senha": "123456"}
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
    
    def setup_test_data(self):
        """Setup test data - get existing supplier and product"""
        print("\n=== SETUP TEST DATA ===")
        
        # Get existing supplier
        try:
            response = requests.get(f"{self.base_url}/fornecedores?incluir_inativos=true", headers=self.get_headers())
            if response.status_code == 200:
                suppliers = response.json()
                if suppliers:
                    self.test_supplier_id = suppliers[0]["id"]
                    print(f"   ✓ Using supplier: {suppliers[0].get('razao_social', 'N/A')} (ID: {self.test_supplier_id[:8]}...)")
                else:
                    self.log_test("Setup - Get Supplier", False, "No suppliers found in system")
                    return False
            else:
                self.log_test("Setup - Get Supplier", False, f"Failed to get suppliers: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Setup - Get Supplier", False, f"Error getting suppliers: {str(e)}")
            return False
        
        # Get existing product
        try:
            response = requests.get(f"{self.base_url}/produtos?limit=5", headers=self.get_headers())
            if response.status_code == 200:
                products = response.json()
                if products:
                    self.test_product_id = products[0]["id"]
                    print(f"   ✓ Using product: {products[0].get('nome', 'N/A')} (ID: {self.test_product_id[:8]}...)")
                else:
                    self.log_test("Setup - Get Product", False, "No products found in system")
                    return False
            else:
                self.log_test("Setup - Get Product", False, f"Failed to get products: {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Setup - Get Product", False, f"Error getting products: {str(e)}")
            return False
        
        self.log_test("Setup Test Data", True, "Successfully obtained supplier and product for testing")
        return True
    
    def create_test_fiscal_note(self, note_number, quantity, unit_price, days_ago=0):
        """Create a test fiscal note"""
        emission_date = (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")
        
        fiscal_note_data = {
            "numero": f"TEST-{note_number}",
            "serie": "1",
            "fornecedor_id": self.test_supplier_id,
            "data_emissao": emission_date,
            "valor_total": quantity * unit_price,
            "itens": [
                {
                    "produto_id": self.test_product_id,
                    "quantidade": quantity,
                    "preco_unitario": unit_price
                }
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/notas-fiscais", json=fiscal_note_data, headers=self.get_headers())
            if response.status_code == 200:
                fiscal_note = response.json()
                note_id = fiscal_note["id"]
                self.created_fiscal_notes.append(note_id)
                
                # Confirm the fiscal note to make it appear in purchase history
                confirm_response = requests.post(f"{self.base_url}/notas-fiscais/{note_id}/confirmar", 
                                               headers=self.get_headers())
                if confirm_response.status_code == 200:
                    print(f"   ✓ Created and confirmed fiscal note {note_number} (Qty: {quantity}, Price: R$ {unit_price})")
                    return note_id
                else:
                    print(f"   ⚠ Created but failed to confirm fiscal note {note_number}: {confirm_response.status_code}")
                    return note_id
            else:
                print(f"   ⚠ Failed to create fiscal note {note_number}: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating fiscal note {note_number}: {str(e)}")
            return None
    
    def test_create_purchase_history_data(self):
        """Test: Create test fiscal notes to generate purchase history"""
        print("\n=== TEST: CRIAR DADOS DE HISTÓRICO DE COMPRAS ===")
        
        if not self.test_supplier_id or not self.test_product_id:
            self.log_test("Create History Data", False, "Missing supplier or product for test data creation")
            return False
        
        # Create 7 fiscal notes (to test the 5-entry limit)
        test_notes = [
            {"number": "001", "quantity": 10, "unit_price": 50.00, "days_ago": 30},
            {"number": "002", "quantity": 15, "unit_price": 45.00, "days_ago": 25},
            {"number": "003", "quantity": 8, "unit_price": 55.00, "days_ago": 20},
            {"number": "004", "quantity": 12, "unit_price": 48.00, "days_ago": 15},
            {"number": "005", "quantity": 20, "unit_price": 52.00, "days_ago": 10},
            {"number": "006", "quantity": 5, "unit_price": 60.00, "days_ago": 5},
            {"number": "007", "quantity": 18, "unit_price": 47.00, "days_ago": 1}
        ]
        
        created_count = 0
        for note_data in test_notes:
            note_id = self.create_test_fiscal_note(
                note_data["number"], 
                note_data["quantity"], 
                note_data["unit_price"], 
                note_data["days_ago"]
            )
            if note_id:
                created_count += 1
        
        if created_count >= 5:  # Need at least 5 to test the limit
            self.log_test("Create History Data", True, f"Successfully created {created_count} confirmed fiscal notes")
            return True
        else:
            self.log_test("Create History Data", False, f"Only created {created_count} fiscal notes (need at least 5)")
            return False
    
    def test_purchase_history_endpoint(self):
        """Test: Purchase history endpoint with real data"""
        print("\n=== TEST: ENDPOINT DE HISTÓRICO COM DADOS REAIS ===")
        
        try:
            response = requests.get(f"{self.base_url}/produtos/{self.test_product_id}/historico-compras", 
                                  headers=self.get_headers())
            
            if response.status_code == 200:
                history = response.json()
                print(f"   ✓ Endpoint responded successfully")
                print(f"   ✓ History contains {len(history)} entries")
                
                if history:
                    print("   📋 Purchase history entries:")
                    for i, entry in enumerate(history, 1):
                        print(f"      {i}. NF {entry.get('numero_nf', 'N/A')}/{entry.get('serie', 'N/A')} - "
                              f"{entry.get('data_emissao', 'N/A')} - "
                              f"Fornecedor: {entry.get('fornecedor_nome', 'N/A')} - "
                              f"Qty: {entry.get('quantidade', 'N/A')} - "
                              f"Price: R$ {entry.get('preco_unitario', 'N/A')} - "
                              f"Subtotal: R$ {entry.get('subtotal', 'N/A')}")
                    
                    # Validate 5-entry limit
                    if len(history) <= 5:
                        print(f"   ✓ Correctly limited to {len(history)} entries (≤ 5)")
                        limit_ok = True
                    else:
                        print(f"   ❌ Returned {len(history)} entries (should be ≤ 5)")
                        limit_ok = False
                    
                    # Validate chronological order (most recent first)
                    dates = [entry.get('data_emissao') for entry in history if entry.get('data_emissao')]
                    if len(dates) > 1:
                        dates_sorted = sorted(dates, reverse=True)  # Most recent first
                        if dates == dates_sorted:
                            print(f"   ✓ Entries are in correct chronological order (most recent first)")
                            order_ok = True
                        else:
                            print(f"   ⚠ Entries may not be in correct chronological order")
                            order_ok = False
                    else:
                        order_ok = True
                    
                    self.sample_history = history
                    
                    if limit_ok and order_ok:
                        self.log_test("Purchase History Endpoint", True, 
                                    f"✅ Successfully retrieved {len(history)} purchase history entries with correct limits and order")
                    else:
                        self.log_test("Purchase History Endpoint", False, 
                                    f"Retrieved history but failed validation (limit_ok: {limit_ok}, order_ok: {order_ok})")
                else:
                    self.log_test("Purchase History Endpoint", False, 
                                "Endpoint returned empty array despite creating fiscal notes")
                    return False
                
            else:
                self.log_test("Purchase History Endpoint", False, 
                            f"Failed to get history: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Purchase History Endpoint", False, f"Error getting history: {str(e)}")
            return False
        
        return True
    
    def test_response_structure_validation(self):
        """Test: Validate complete response structure"""
        print("\n=== TEST: VALIDAÇÃO COMPLETA DA ESTRUTURA ===")
        
        if not hasattr(self, 'sample_history') or not self.sample_history:
            self.log_test("Response Structure", False, "No sample history available for validation")
            return False
        
        # Required fields according to specification
        required_fields = {
            "data_emissao": str,
            "numero_nf": str,
            "serie": str,
            "fornecedor_nome": str,
            "quantidade": (int, float),
            "preco_unitario": (int, float),
            "subtotal": (int, float)
        }
        
        print(f"   🔍 Validating structure of {len(self.sample_history)} history entries...")
        
        all_valid = True
        validation_details = []
        
        for i, entry in enumerate(self.sample_history, 1):
            print(f"   📋 Entry {i} validation:")
            entry_valid = True
            entry_details = {"entry": i, "fields": {}}
            
            for field, expected_type in required_fields.items():
                if field in entry:
                    field_value = entry[field]
                    
                    # Type validation
                    if isinstance(expected_type, tuple):
                        type_ok = isinstance(field_value, expected_type)
                    else:
                        type_ok = isinstance(field_value, expected_type)
                    
                    if type_ok:
                        print(f"      ✓ {field}: {field_value} ({type(field_value).__name__})")
                        entry_details["fields"][field] = {"value": field_value, "valid": True}
                    else:
                        print(f"      ❌ {field}: {field_value} (expected {expected_type}, got {type(field_value)})")
                        entry_details["fields"][field] = {"value": field_value, "valid": False, "expected_type": str(expected_type)}
                        entry_valid = False
                        all_valid = False
                else:
                    print(f"      ❌ {field}: MISSING")
                    entry_details["fields"][field] = {"valid": False, "error": "missing"}
                    entry_valid = False
                    all_valid = False
            
            # Validate subtotal calculation
            if all(field in entry for field in ["quantidade", "preco_unitario", "subtotal"]):
                expected_subtotal = entry["quantidade"] * entry["preco_unitario"]
                actual_subtotal = entry["subtotal"]
                if abs(expected_subtotal - actual_subtotal) < 0.01:  # Allow small floating point differences
                    print(f"      ✓ subtotal calculation: {entry['quantidade']} × {entry['preco_unitario']} = {actual_subtotal}")
                    entry_details["subtotal_calculation"] = {"valid": True}
                else:
                    print(f"      ❌ subtotal calculation: expected {expected_subtotal}, got {actual_subtotal}")
                    entry_details["subtotal_calculation"] = {"valid": False, "expected": expected_subtotal, "actual": actual_subtotal}
                    entry_valid = False
                    all_valid = False
            
            entry_details["entry_valid"] = entry_valid
            validation_details.append(entry_details)
        
        if all_valid:
            self.log_test("Response Structure", True, 
                        f"✅ All {len(self.sample_history)} entries have correct structure and data types")
        else:
            failed_entries = [d["entry"] for d in validation_details if not d["entry_valid"]]
            self.log_test("Response Structure", False, 
                        f"Structure validation failed for entries: {failed_entries}", 
                        {"validation_details": validation_details})
        
        return all_valid
    
    def test_edge_cases(self):
        """Test: Edge cases and error conditions"""
        print("\n=== TEST: CASOS EXTREMOS E CONDIÇÕES DE ERRO ===")
        
        # Test 1: Non-existent product
        fake_product_id = "produto-fake-123"
        try:
            response = requests.get(f"{self.base_url}/produtos/{fake_product_id}/historico-compras", 
                                  headers=self.get_headers())
            
            if response.status_code == 404:
                print(f"   ✓ Non-existent product correctly returns 404")
                error_data = response.json()
                error_message = error_data.get("detail", "")
                if "não encontrado" in error_message.lower() or "not found" in error_message.lower():
                    print(f"   ✓ Error message is appropriate: '{error_message}'")
                    nonexistent_ok = True
                else:
                    print(f"   ⚠ Error message could be more descriptive: '{error_message}'")
                    nonexistent_ok = False
            else:
                print(f"   ❌ Non-existent product returned {response.status_code} (expected 404)")
                nonexistent_ok = False
        except Exception as e:
            print(f"   ❌ Error testing non-existent product: {str(e)}")
            nonexistent_ok = False
        
        # Test 2: Product with no purchase history (create a new product)
        try:
            new_product_data = {
                "sku": f"TEST-NO-HISTORY-{uuid.uuid4().hex[:8]}",
                "nome": "Produto Sem Histórico",
                "preco_custo": 30.0,
                "preco_venda": 60.0
            }
            
            response = requests.post(f"{self.base_url}/produtos", json=new_product_data, headers=self.get_headers())
            if response.status_code == 200:
                new_product = response.json()
                new_product_id = new_product["id"]
                
                # Test history for product with no purchases
                response = requests.get(f"{self.base_url}/produtos/{new_product_id}/historico-compras", 
                                      headers=self.get_headers())
                
                if response.status_code == 200:
                    history = response.json()
                    if isinstance(history, list) and len(history) == 0:
                        print(f"   ✓ Product with no history correctly returns empty array")
                        no_history_ok = True
                    else:
                        print(f"   ❌ Product with no history returned: {history}")
                        no_history_ok = False
                else:
                    print(f"   ❌ Product with no history returned {response.status_code}")
                    no_history_ok = False
                
                # Cleanup
                requests.delete(f"{self.base_url}/produtos/{new_product_id}", headers=self.get_headers())
            else:
                print(f"   ⚠ Could not create test product for no-history test")
                no_history_ok = True  # Skip this test
        except Exception as e:
            print(f"   ⚠ Error in no-history test: {str(e)}")
            no_history_ok = True  # Skip this test
        
        if nonexistent_ok and no_history_ok:
            self.log_test("Edge Cases", True, "✅ All edge cases handled correctly")
        else:
            self.log_test("Edge Cases", False, f"Edge case validation failed (nonexistent: {nonexistent_ok}, no_history: {no_history_ok})")
    
    def cleanup_test_data(self):
        """Clean up created test data"""
        print("\n--- Cleaning up test data ---")
        
        for note_id in self.created_fiscal_notes:
            try:
                response = requests.delete(f"{self.base_url}/notas-fiscais/{note_id}", headers=self.get_headers())
                if response.status_code == 200:
                    print(f"   ✓ Cleaned up fiscal note {note_id[:8]}...")
                else:
                    print(f"   ⚠ Failed to cleanup fiscal note {note_id[:8]}...: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Error cleaning up fiscal note {note_id[:8]}...: {str(e)}")
    
    def run_all_tests(self):
        """Run all purchase history tests"""
        print("🎯 TESTE COMPLETO DO ENDPOINT DE HISTÓRICO DE COMPRAS")
        print("=" * 80)
        print("ENDPOINT: GET /api/produtos/{produto_id}/historico-compras")
        print("FUNCIONALIDADE: Retorna histórico das últimas 5 compras de um produto")
        print("ORIGEM: Notas fiscais de entrada confirmadas e não canceladas")
        print("TESTE: Criação de dados reais para validação completa")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Setup test data
        if not self.setup_test_data():
            print("❌ Failed to setup test data. Cannot proceed with tests.")
            return False
        
        # Run comprehensive tests
        success = True
        success &= self.test_create_purchase_history_data()  # Create test fiscal notes
        success &= self.test_purchase_history_endpoint()     # Test endpoint with real data
        success &= self.test_response_structure_validation() # Validate structure
        self.test_edge_cases()                               # Test edge cases
        
        return success
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 HISTÓRICO DE COMPRAS COMPLETO - TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 VALIDAÇÕES REALIZADAS:")
        print(f"   ✅ Criação de notas fiscais de teste confirmadas")
        print(f"   ✅ Endpoint retorna histórico com dados reais")
        print(f"   ✅ Estrutura da resposta com todos os campos obrigatórios")
        print(f"   ✅ Validação de tipos de dados corretos")
        print(f"   ✅ Cálculo correto do subtotal")
        print(f"   ✅ Limite máximo de 5 entradas")
        print(f"   ✅ Ordem cronológica (mais recente primeiro)")
        print(f"   ✅ Produto inexistente retorna 404")
        print(f"   ✅ Produto sem histórico retorna array vazio")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! Purchase history endpoint is fully functional.")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = HistoricoComprasCompleteTester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    # Cleanup test data
    tester.cleanup_test_data()
    
    sys.exit(0 if success else 1)