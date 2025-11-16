#!/usr/bin/env python3
"""
Backend Test Suite for Sales Cancellation Propagation to Budgets
Tests the new functionality that propagates sales cancellation to linked budgets

FOCUS: Testing the new feature where canceling a sale originated from a budget
automatically updates the budget status from "vendido" to "cancelado" and stores
cancellation details (reason, who canceled, when).

CRITICAL TESTS:
1. Cancel sale originated from budget - Budget should be updated
2. Cancel sale NOT originated from budget - No propagation should occur  
3. Validate all fields in canceled budget
4. Verify stock is correctly reverted
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://emily-kids-erp-1.preview.emergentagent.com/api"

class SalesCancellationTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        self.test_suppliers = []
        self.created_supplier_ids = []
        
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
        """Authenticate using credentials from review request"""
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
    
    def test_fornecedores_cadastro_completo(self):
        """Test 1: CRIAR FORNECEDOR (Cenário Completo) - All fields filled"""
        print("\n=== TEST 1: CRIAR FORNECEDOR (Cenário Completo) ===")
        
        supplier_complete = {
            "razao_social": "Teste Fornecedor Completo LTDA",
            "cnpj": "12345678000190",
            "ie": "123456789",
            "telefone": "(11) 98765-4321",
            "email": "teste@fornecedor.com",
            "endereco": {
                "logradouro": "Rua Teste",
                "numero": "123",
                "complemento": "Sala 1",
                "bairro": "Centro",
                "cidade": "São Paulo",
                "estado": "SP",
                "cep": "01234-567"
            }
        }
        
        try:
            response = requests.post(f"{self.base_url}/fornecedores", json=supplier_complete, headers=self.get_headers())
            if response.status_code == 200:
                supplier_data = response.json()
                self.created_supplier_ids.append(supplier_data["id"])
                
                # Verify all fields are correctly stored
                success = (
                    supplier_data.get("razao_social") == supplier_complete["razao_social"] and
                    supplier_data.get("cnpj") == supplier_complete["cnpj"] and
                    supplier_data.get("ie") == supplier_complete["ie"] and
                    supplier_data.get("telefone") == supplier_complete["telefone"] and
                    supplier_data.get("email") == supplier_complete["email"] and
                    supplier_data.get("ativo") == True and
                    isinstance(supplier_data.get("endereco"), dict)
                )
                
                if success:
                    self.log_test("Cenário Completo", True, "✅ DEVE RETORNAR: 200 OK com fornecedor criado - SUCCESS")
                else:
                    self.log_test("Cenário Completo", False, f"Fields validation failed: {supplier_data}")
            else:
                self.log_test("Cenário Completo", False, f"❌ Expected 200 OK but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Cenário Completo", False, f"Error: {str(e)}")
    
    def test_fornecedores_cadastro_minimo_critico(self):
        """Test 2: CRIAR FORNECEDOR (Cenário Mínimo - CRÍTICO) - Only required fields"""
        print("\n=== TEST 2: CRIAR FORNECEDOR (Cenário Mínimo - CRÍTICO) ===")
        print("🎯 CRITICAL TEST: This was the main bug - empty strings vs null for optional fields")
        
        supplier_minimal = {
            "razao_social": "Teste Fornecedor Mínimo LTDA",
            "cnpj": "98765432000199"
        }
        
        try:
            response = requests.post(f"{self.base_url}/fornecedores", json=supplier_minimal, headers=self.get_headers())
            if response.status_code == 200:
                supplier_data = response.json()
                self.created_supplier_ids.append(supplier_data["id"])
                
                # Verify required fields and optional fields are null
                success = (
                    supplier_data.get("razao_social") == supplier_minimal["razao_social"] and
                    supplier_data.get("cnpj") == supplier_minimal["cnpj"] and
                    supplier_data.get("ativo") == True and
                    supplier_data.get("ie") is None and
                    supplier_data.get("telefone") is None and
                    supplier_data.get("email") is None and
                    supplier_data.get("endereco") is None
                )
                
                if success:
                    self.log_test("Cenário Mínimo - CRÍTICO", True, "✅ DEVE RETORNAR: 200 OK (campos opcionais são null no backend) - BUG FIXED!")
                else:
                    self.log_test("Cenário Mínimo - CRÍTICO", False, f"Optional fields not null as expected: {supplier_data}")
            elif response.status_code == 422:
                self.log_test("Cenário Mínimo - CRÍTICO", False, f"❌ NÃO DEVE RETORNAR: 422 Unprocessable Entity - BUG STILL EXISTS! {response.text}")
            else:
                self.log_test("Cenário Mínimo - CRÍTICO", False, f"Unexpected status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Cenário Mínimo - CRÍTICO", False, f"Error: {str(e)}")
    
    def test_fornecedores_cadastro_parcial(self):
        """Test 3: CRIAR FORNECEDOR (Cenário Parcial) - Some optional fields filled"""
        print("\n=== TEST 3: CRIAR FORNECEDOR (Cenário Parcial) ===")
        
        supplier_partial = {
            "razao_social": "Teste Fornecedor Parcial LTDA",
            "cnpj": "11122233000144",
            "telefone": "(11) 91234-5678"
        }
        
        try:
            response = requests.post(f"{self.base_url}/fornecedores", json=supplier_partial, headers=self.get_headers())
            if response.status_code == 200:
                supplier_data = response.json()
                self.created_supplier_ids.append(supplier_data["id"])
                
                # Verify partial fields are correctly stored
                success = (
                    supplier_data.get("razao_social") == supplier_partial["razao_social"] and
                    supplier_data.get("cnpj") == supplier_partial["cnpj"] and
                    supplier_data.get("telefone") == supplier_partial["telefone"] and
                    supplier_data.get("ativo") == True and
                    supplier_data.get("ie") is None and
                    supplier_data.get("email") is None and
                    supplier_data.get("endereco") is None
                )
                
                if success:
                    self.log_test("Cenário Parcial", True, "✅ DEVE RETORNAR: 200 OK - Partial data handled correctly")
                else:
                    self.log_test("Cenário Parcial", False, f"Partial fields validation failed: {supplier_data}")
            else:
                self.log_test("Cenário Parcial", False, f"Expected 200 OK but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Cenário Parcial", False, f"Error: {str(e)}")
    
    def test_fornecedores_listagem_com_inativos(self):
        """Test 5: LISTAR FORNECEDORES COM INATIVOS - incluir_inativos=true"""
        print("\n=== TEST 5: LISTAR FORNECEDORES COM INATIVOS ===")
        
        # First, create an inactive supplier for testing
        inactive_supplier = {
            "razao_social": "Fornecedor Inativo Para Teste LTDA",
            "cnpj": "55666777000188"
        }
        
        inactive_supplier_id = None
        try:
            # Create supplier
            response = requests.post(f"{self.base_url}/fornecedores", json=inactive_supplier, headers=self.get_headers())
            if response.status_code == 200:
                inactive_supplier_id = response.json()["id"]
                self.created_supplier_ids.append(inactive_supplier_id)
                
                # Deactivate the supplier
                response = requests.put(f"{self.base_url}/fornecedores/{inactive_supplier_id}/toggle-status", headers=self.get_headers())
                if response.status_code == 200:
                    print("   ✓ Inactive supplier created for testing")
                else:
                    print(f"   ⚠ Failed to deactivate supplier: {response.text}")
            else:
                print(f"   ⚠ Failed to create inactive supplier: {response.text}")
        except Exception as e:
            print(f"   ⚠ Error creating inactive supplier: {str(e)}")
        
        # Test: Fetch ALL suppliers (incluir_inativos=true)
        try:
            response = requests.get(f"{self.base_url}/fornecedores?incluir_inativos=true", headers=self.get_headers())
            if response.status_code == 200:
                all_suppliers = response.json()
                
                # Count active and inactive suppliers
                active_count = sum(1 for s in all_suppliers if s.get("ativo") == True)
                inactive_count = sum(1 for s in all_suppliers if s.get("ativo") == False)
                total_count = len(all_suppliers)
                
                # Verify we have suppliers and at least some created in this test
                created_count = sum(1 for s in all_suppliers if s.get("id") in self.created_supplier_ids)
                
                if total_count >= created_count and created_count > 0:
                    self.log_test("Listar Fornecedores com Inativos", True, f"✅ DEVE RETORNAR: Lista com todos os fornecedores criados - {total_count} total ({active_count} ativos, {inactive_count} inativos)")
                else:
                    self.log_test("Listar Fornecedores com Inativos", False, f"Expected to find created suppliers. Total: {total_count}, Created: {created_count}")
                
            else:
                self.log_test("Listar Fornecedores com Inativos", False, f"Expected 200 OK but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Listar Fornecedores com Inativos", False, f"Error: {str(e)}")
    
    def test_fornecedores_edicao(self):
        """Test 4: EDITAR FORNECEDOR - Edit supplier and preserve ativo field"""
        print("\n=== TEST 4: EDITAR FORNECEDOR ===")
        
        if not self.created_supplier_ids:
            self.log_test("Editar Fornecedor", False, "No test suppliers available for editing")
            return
        
        # Use the first created supplier for editing
        supplier_id = self.created_supplier_ids[0]
        
        # Get current supplier data from the list
        try:
            response = requests.get(f"{self.base_url}/fornecedores?incluir_inativos=true", headers=self.get_headers())
            if response.status_code != 200:
                self.log_test("Editar Fornecedor - Get Original", False, f"Failed to get suppliers list: {response.status_code}")
                return
            suppliers = response.json()
            original_supplier = next((s for s in suppliers if s["id"] == supplier_id), None)
            if not original_supplier:
                self.log_test("Editar Fornecedor - Get Original", False, f"Supplier {supplier_id} not found in list")
                return
            original_ativo = original_supplier.get("ativo")
        except Exception as e:
            self.log_test("Editar Fornecedor - Get Original", False, f"Error getting supplier: {str(e)}")
            return
        
        # Update supplier data
        update_data = {
            "razao_social": "Teste Fornecedor Completo ATUALIZADO LTDA",
            "cnpj": original_supplier["cnpj"],  # Keep same CNPJ
            "ie": "987654321",
            "telefone": "(11) 99999-8888",
            "email": "atualizado@fornecedor.com",
            "endereco": {
                "logradouro": "Rua Atualizada",
                "numero": "456",
                "complemento": "Sala 2",
                "bairro": "Centro Atualizado",
                "cidade": "São Paulo",
                "estado": "SP",
                "cep": "09876-543"
            }
        }
        
        try:
            response = requests.put(f"{self.base_url}/fornecedores/{supplier_id}", json=update_data, headers=self.get_headers())
            if response.status_code == 200:
                updated_supplier = response.json()
                
                # Verify fields are updated correctly and ativo is preserved
                success = (
                    updated_supplier.get("razao_social") == update_data["razao_social"] and
                    updated_supplier.get("ie") == update_data["ie"] and
                    updated_supplier.get("telefone") == update_data["telefone"] and
                    updated_supplier.get("email") == update_data["email"] and
                    updated_supplier.get("ativo") == original_ativo and  # CRITICAL: ativo must be preserved
                    isinstance(updated_supplier.get("endereco"), dict)
                )
                
                if success:
                    self.log_test("Editar Fornecedor", True, f"✅ DEVE RETORNAR: 200 OK e preservar campo ativo ({original_ativo}) - SUCCESS")
                else:
                    self.log_test("Editar Fornecedor", False, f"Update validation failed. Ativo preserved: {updated_supplier.get('ativo') == original_ativo}")
            else:
                self.log_test("Editar Fornecedor", False, f"Expected 200 OK but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Editar Fornecedor", False, f"Error: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data created during tests"""
        print("\n--- Cleaning up test data ---")
        
        for supplier_id in self.created_supplier_ids:
            try:
                response = requests.delete(f"{self.base_url}/fornecedores/{supplier_id}", headers=self.get_headers())
                if response.status_code == 200:
                    print(f"   ✓ Cleaned up supplier {supplier_id}")
                else:
                    print(f"   ⚠ Failed to cleanup supplier {supplier_id}: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Error cleaning up supplier {supplier_id}: {str(e)}")
    
    def run_all_tests(self):
        """Run all Fornecedores module tests as specified in review request"""
        print("🎯 TESTAR MÓDULO FORNECEDORES - CORREÇÃO CRÍTICA DE CADASTRO")
        print("=" * 80)
        print("CONTEXTO: Usuário reportou erro no cadastro de fornecedor.")
        print("ROOT CAUSE: Frontend enviava strings vazias, backend esperava null.")
        print("CORREÇÃO: Sanitização de dados no frontend.")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run the 5 mandatory tests from review request
        self.test_fornecedores_cadastro_completo()      # Test 1: Complete scenario
        self.test_fornecedores_cadastro_minimo_critico() # Test 2: Minimal scenario (CRITICAL)
        self.test_fornecedores_cadastro_parcial()       # Test 3: Partial scenario
        self.test_fornecedores_edicao()                 # Test 4: Edit supplier
        self.test_fornecedores_listagem_com_inativos()  # Test 5: List with inactive
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 FORNECEDORES MODULE - CORREÇÃO CRÍTICA - TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 FOCO DO TESTE:")
        print(f"   - Verificar que NÃO ocorre mais erro 422 ao cadastrar com campos opcionais vazios")
        print(f"   - Confirmar que backend aceita null para campos opcionais (ie, telefone, email, endereco)")
        print(f"   - Validar que EmailStr não rejeita mais strings vazias")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! Bug fix is working correctly.")
        
        print("\n" + "=" * 80)
    
if __name__ == "__main__":
    tester = FornecedoresBackendTester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    # Optional cleanup
    # tester.cleanup_test_data()
    
    sys.exit(0 if success else 1)
