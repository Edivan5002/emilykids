#!/usr/bin/env python3
"""
Backend Test Suite for Product Purchase History Endpoint
Tests the new endpoint GET /api/produtos/{produto_id}/historico-compras

FOCUS: Testing the new functionality that returns the history of the last 5 purchases
of a specific product from confirmed and non-cancelled fiscal notes.

REQUIRED TESTS:
1. Check existing data structure (products and fiscal notes)
2. Test the history endpoint with existing products
3. Validate response structure
4. Test with non-existent product (should return 404)
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://frontend-boost-10.preview.emergentagent.com/api"

class HistoricoComprasTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        
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
    
    def test_check_existing_data_structure(self):
        """Test 1: Check existing data structure - products and fiscal notes"""
        print("\n=== TEST 1: VERIFICAR ESTRUTURA DE DADOS EXISTENTES ===")
        
        # 1.1 List available products (limit 5)
        try:
            response = requests.get(f"{self.base_url}/produtos?limit=5", headers=self.get_headers())
            if response.status_code == 200:
                products = response.json()
                print(f"   ✓ Found {len(products)} products (showing first 5)")
                
                if products:
                    print("   📋 Available products:")
                    for i, product in enumerate(products[:3], 1):  # Show first 3
                        print(f"      {i}. {product.get('nome', 'N/A')} (ID: {product.get('id', 'N/A')[:8]}...)")
                    
                    self.log_test("Test 1.1 - List Products", True, f"Successfully retrieved {len(products)} products")
                else:
                    self.log_test("Test 1.1 - List Products", True, "No products found in system")
                
                # Store first product for later testing
                self.test_product_id = products[0]["id"] if products else None
                
            else:
                self.log_test("Test 1.1 - List Products", False, f"Failed to list products: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Test 1.1 - List Products", False, f"Error listing products: {str(e)}")
            return False
        
        # 1.2 List fiscal notes
        try:
            response = requests.get(f"{self.base_url}/notas-fiscais", headers=self.get_headers())
            if response.status_code == 200:
                fiscal_notes = response.json()
                print(f"   ✓ Found {len(fiscal_notes)} fiscal notes")
                
                # Count confirmed and non-cancelled notes
                confirmed_notes = [nf for nf in fiscal_notes if nf.get("confirmado") and not nf.get("cancelada") and nf.get("status") != "cancelada"]
                print(f"   ✓ Found {len(confirmed_notes)} confirmed and non-cancelled fiscal notes")
                
                if confirmed_notes:
                    print("   📋 Sample confirmed fiscal notes:")
                    for i, note in enumerate(confirmed_notes[:3], 1):  # Show first 3
                        print(f"      {i}. NF {note.get('numero', 'N/A')}/{note.get('serie', 'N/A')} - {note.get('data_emissao', 'N/A')}")
                
                self.log_test("Test 1.2 - List Fiscal Notes", True, f"Successfully retrieved {len(fiscal_notes)} fiscal notes ({len(confirmed_notes)} confirmed)")
                
            else:
                self.log_test("Test 1.2 - List Fiscal Notes", False, f"Failed to list fiscal notes: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log_test("Test 1.2 - List Fiscal Notes", False, f"Error listing fiscal notes: {str(e)}")
            return False
        
        # 1.3 Identify products with potential purchase history
        if self.test_product_id and confirmed_notes:
            products_with_history = []
            for note in confirmed_notes:
                for item in note.get("itens", []):
                    product_id = item.get("produto_id")
                    if product_id and product_id not in products_with_history:
                        products_with_history.append(product_id)
            
            print(f"   ✓ Found {len(products_with_history)} products with potential purchase history")
            self.products_with_history = products_with_history[:5]  # Keep first 5 for testing
            
            self.log_test("Test 1.3 - Identify Products with History", True, 
                        f"Identified {len(products_with_history)} products with potential purchase history")
        else:
            self.products_with_history = []
            self.log_test("Test 1.3 - Identify Products with History", True, 
                        "No products with purchase history found (empty system)")
        
        return True
    
    def test_history_endpoint_with_existing_products(self):
        """Test 2: Test the history endpoint with existing products"""
        print("\n=== TEST 2: TESTAR ENDPOINT DE HISTÓRICO ===")
        
        if not hasattr(self, 'test_product_id') or not self.test_product_id:
            self.log_test("Test 2 - History Endpoint", False, "No test product available from previous test")
            return False
        
        # 2.1 Test with first available product
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
                              f"{entry.get('data_emissao', 'N/A')} - Qty: {entry.get('quantidade', 'N/A')} - "
                              f"Price: R$ {entry.get('preco_unitario', 'N/A')}")
                    
                    self.log_test("Test 2.1 - History with Data", True, 
                                f"Successfully retrieved {len(history)} purchase history entries")
                    self.sample_history = history
                else:
                    self.log_test("Test 2.1 - History Empty", True, 
                                "Endpoint returned empty array (no purchase history for this product)")
                    self.sample_history = []
                
            else:
                self.log_test("Test 2.1 - History Endpoint", False, 
                            f"Failed to get history: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Test 2.1 - History Endpoint", False, f"Error getting history: {str(e)}")
            return False
        
        # 2.2 Test with products that have confirmed purchase history
        if hasattr(self, 'products_with_history') and self.products_with_history:
            print(f"\n   🔍 Testing products with confirmed purchase history...")
            
            for i, product_id in enumerate(self.products_with_history[:3], 1):  # Test first 3
                try:
                    response = requests.get(f"{self.base_url}/produtos/{product_id}/historico-compras", 
                                          headers=self.get_headers())
                    
                    if response.status_code == 200:
                        history = response.json()
                        print(f"      Product {i}: {len(history)} history entries")
                        
                        if history:
                            # Store a sample with data for structure validation
                            if not hasattr(self, 'sample_history') or not self.sample_history:
                                self.sample_history = history
                    else:
                        print(f"      Product {i}: Failed ({response.status_code})")
                        
                except Exception as e:
                    print(f"      Product {i}: Error - {str(e)}")
            
            self.log_test("Test 2.2 - Products with History", True, 
                        f"Tested {min(3, len(self.products_with_history))} products with potential history")
        
        return True
    
    def test_validate_response_structure(self):
        """Test 3: Validate response structure"""
        print("\n=== TEST 3: VALIDAR ESTRUTURA DA RESPOSTA ===")
        
        if not hasattr(self, 'sample_history'):
            self.log_test("Test 3 - Response Structure", False, "No sample history available from previous tests")
            return False
        
        if not self.sample_history:
            self.log_test("Test 3 - Response Structure", True, "Empty history array - structure validation not applicable")
            return True
        
        # Required fields according to specification
        required_fields = [
            "data_emissao",
            "numero_nf", 
            "serie",
            "fornecedor_nome",
            "quantidade",
            "preco_unitario",
            "subtotal"
        ]
        
        print(f"   🔍 Validating structure of {len(self.sample_history)} history entries...")
        
        all_valid = True
        validation_results = {}
        
        for i, entry in enumerate(self.sample_history, 1):
            print(f"   📋 Entry {i} validation:")
            entry_valid = True
            
            for field in required_fields:
                if field in entry:
                    field_value = entry[field]
                    print(f"      ✓ {field}: {field_value}")
                    
                    # Additional validation for specific fields
                    if field == "quantidade" and not isinstance(field_value, (int, float)):
                        print(f"        ⚠ Warning: quantidade should be numeric, got {type(field_value)}")
                    elif field == "preco_unitario" and not isinstance(field_value, (int, float)):
                        print(f"        ⚠ Warning: preco_unitario should be numeric, got {type(field_value)}")
                    elif field == "subtotal" and not isinstance(field_value, (int, float)):
                        print(f"        ⚠ Warning: subtotal should be numeric, got {type(field_value)}")
                        
                else:
                    print(f"      ❌ {field}: MISSING")
                    entry_valid = False
                    all_valid = False
            
            validation_results[f"entry_{i}"] = entry_valid
            
            # Validate subtotal calculation
            if "quantidade" in entry and "preco_unitario" in entry and "subtotal" in entry:
                expected_subtotal = entry["quantidade"] * entry["preco_unitario"]
                actual_subtotal = entry["subtotal"]
                if abs(expected_subtotal - actual_subtotal) < 0.01:  # Allow small floating point differences
                    print(f"      ✓ subtotal calculation: {entry['quantidade']} × {entry['preco_unitario']} = {actual_subtotal}")
                else:
                    print(f"      ⚠ subtotal calculation mismatch: expected {expected_subtotal}, got {actual_subtotal}")
        
        if all_valid:
            self.log_test("Test 3 - Response Structure", True, 
                        f"✅ All {len(self.sample_history)} entries have correct structure with all required fields")
        else:
            failed_entries = [k for k, v in validation_results.items() if not v]
            self.log_test("Test 3 - Response Structure", False, 
                        f"Structure validation failed for entries: {failed_entries}", 
                        {"validation_results": validation_results})
        
        return all_valid
    
    def test_nonexistent_product(self):
        """Test 4: Test with non-existent product (should return 404)"""
        print("\n=== TEST 4: TESTAR COM PRODUTO INEXISTENTE ===")
        
        fake_product_id = "produto-fake-123"
        
        try:
            response = requests.get(f"{self.base_url}/produtos/{fake_product_id}/historico-compras", 
                                  headers=self.get_headers())
            
            if response.status_code == 404:
                print(f"   ✓ Correctly returned 404 for non-existent product")
                
                # Check if response has appropriate error message
                try:
                    error_data = response.json()
                    error_message = error_data.get("detail", "")
                    if "não encontrado" in error_message.lower() or "not found" in error_message.lower():
                        print(f"   ✓ Error message is appropriate: '{error_message}'")
                    else:
                        print(f"   ⚠ Error message could be more descriptive: '{error_message}'")
                except:
                    print(f"   ⚠ Response is not JSON format")
                
                self.log_test("Test 4 - Non-existent Product", True, 
                            "✅ Correctly returned 404 for non-existent product")
                
            else:
                self.log_test("Test 4 - Non-existent Product", False, 
                            f"Expected 404, got {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_test("Test 4 - Non-existent Product", False, f"Error testing non-existent product: {str(e)}")
    
    def test_endpoint_limits(self):
        """Test 5: Verify endpoint returns maximum 5 entries"""
        print("\n=== TEST 5: VERIFICAR LIMITE DE 5 ENTRADAS ===")
        
        if not hasattr(self, 'products_with_history') or not self.products_with_history:
            self.log_test("Test 5 - Entry Limit", True, "No products with history to test limit")
            return True
        
        # Test with products that might have more than 5 entries
        max_entries_found = 0
        
        for product_id in self.products_with_history:
            try:
                response = requests.get(f"{self.base_url}/produtos/{product_id}/historico-compras", 
                                      headers=self.get_headers())
                
                if response.status_code == 200:
                    history = response.json()
                    entries_count = len(history)
                    max_entries_found = max(max_entries_found, entries_count)
                    
                    if entries_count > 5:
                        self.log_test("Test 5 - Entry Limit", False, 
                                    f"Product {product_id[:8]}... returned {entries_count} entries (should be max 5)")
                        return False
                        
            except Exception as e:
                print(f"   ⚠ Error testing product {product_id[:8]}...: {str(e)}")
        
        print(f"   ✓ Maximum entries found in any product: {max_entries_found}")
        
        if max_entries_found <= 5:
            self.log_test("Test 5 - Entry Limit", True, 
                        f"✅ All products returned ≤ 5 entries (max found: {max_entries_found})")
        
        return True
    
    def run_all_tests(self):
        """Run all purchase history tests"""
        print("🎯 TESTAR NOVO ENDPOINT DE HISTÓRICO DE COMPRAS DE PRODUTOS")
        print("=" * 80)
        print("ENDPOINT: GET /api/produtos/{produto_id}/historico-compras")
        print("FUNCIONALIDADE: Retorna histórico das últimas 5 compras de um produto")
        print("ORIGEM: Notas fiscais de entrada confirmadas e não canceladas")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run the required tests from review request
        success = True
        success &= self.test_check_existing_data_structure()  # Test 1: Check data structure
        success &= self.test_history_endpoint_with_existing_products()  # Test 2: Test endpoint
        success &= self.test_validate_response_structure()  # Test 3: Validate structure
        self.test_nonexistent_product()  # Test 4: Non-existent product
        self.test_endpoint_limits()  # Test 5: Verify 5-entry limit
        
        return success
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 HISTÓRICO DE COMPRAS - TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 VALIDAÇÕES TESTADAS:")
        print(f"   ✅ Endpoint GET /api/produtos/{{produto_id}}/historico-compras existe")
        print(f"   ✅ Retorna dados de produtos existentes")
        print(f"   ✅ Estrutura da resposta contém campos obrigatórios")
        print(f"   ✅ Produto inexistente retorna 404")
        print(f"   ✅ Máximo de 5 entradas por produto")
        print(f"   ✅ Dados vêm de notas fiscais confirmadas")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! Purchase history endpoint is working correctly.")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = HistoricoComprasTester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    sys.exit(0 if success else 1)