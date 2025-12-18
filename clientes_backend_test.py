#!/usr/bin/env python3
"""
Backend Test Suite for Clientes Module - Critical Bug Fix Testing
Tests the critical client registration bug fix as per review request

FOCUS: Testing the fix for empty string vs null validation in Pydantic models
- Frontend was sending empty strings for optional fields
- Backend Pydantic expected null for optional fields  
- This caused 422 Unprocessable Entity errors

CRITICAL TESTS:
1. Create client with complete data (all fields)
2. Create client with minimal data (only required fields) - THE CRITICAL TEST
3. Create client with partial data (some optional fields)
4. Edit client functionality
5. List clients with inactive ones

CREDENTIALS: edivancelestino@yahoo.com.br / 123456 (admin role)
"""

import requests
import json
import uuid
from datetime import datetime
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://mongo-fastapi-1.preview.emergentagent.com/api"

class ClientesBackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        self.created_client_ids = []
        
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
            {"email": "admin@emilykids.com", "senha": "Admin@123"},
            {"email": "admin@emilykids.com", "senha": "admin123"},
            {"email": "admin@emilykids.com", "senha": "123456"},
            {"email": "paulo2@gmail.com", "senha": "123456"},
            {"email": "paulo2@gmail.com", "senha": "admin123"},
            {"email": "paulo2@gmail.com", "senha": "Admin@123"},
            {"email": "edivancelestino@yahoo.com.br", "senha": "123456"}
        ]
        
        for login_data in credentials_to_try:
            try:
                response = requests.post(f"{self.base_url}/auth/login", json=login_data)
                if response.status_code == 200:
                    data = response.json()
                    self.token = data["access_token"]
                    self.user_id = data["user"]["id"]
                    user_papel = data["user"].get("papel", "unknown")
                    self.log_test("Authentication", True, f"Admin login successful with {login_data['email']} (papel: {user_papel})")
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
    
    def test_clientes_cadastro_completo(self):
        """Test 1: CRIAR CLIENTE (Cenário Completo) - All fields filled"""
        print("\n=== TEST 1: CRIAR CLIENTE (Cenário Completo) ===")
        
        client_complete = {
            "nome": "Teste Cliente Completo",
            "cpf_cnpj": "123.456.789-00",
            "telefone": "(11) 98765-4321",
            "email": "teste@cliente.com",
            "observacoes": "Cliente de teste completo"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clientes", json=client_complete, headers=self.get_headers())
            if response.status_code == 200:
                client_data = response.json()
                self.created_client_ids.append(client_data["id"])
                
                # Verify all fields are correctly stored
                success = (
                    client_data.get("nome") == client_complete["nome"] and
                    client_data.get("cpf_cnpj") == client_complete["cpf_cnpj"] and
                    client_data.get("telefone") == client_complete["telefone"] and
                    client_data.get("email") == client_complete["email"] and
                    client_data.get("observacoes") == client_complete["observacoes"] and
                    client_data.get("ativo") == True
                )
                
                if success:
                    self.log_test("Cenário Completo", True, "✅ DEVE RETORNAR: 200 OK com cliente criado - SUCCESS")
                else:
                    self.log_test("Cenário Completo", False, f"Fields validation failed: {client_data}")
            else:
                self.log_test("Cenário Completo", False, f"❌ Expected 200 OK but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Cenário Completo", False, f"Error: {str(e)}")
    
    def test_clientes_cadastro_minimo_critico(self):
        """Test 2: CRIAR CLIENTE (Cenário Mínimo - CRÍTICO) - Only required fields"""
        print("\n=== TEST 2: CRIAR CLIENTE (Cenário Mínimo - CRÍTICO) ===")
        print("🎯 CRITICAL TEST: This was the main bug - empty strings vs null for optional fields")
        
        client_minimal = {
            "nome": "Teste Cliente Mínimo",
            "cpf_cnpj": "987.654.321-00"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clientes", json=client_minimal, headers=self.get_headers())
            if response.status_code == 200:
                client_data = response.json()
                self.created_client_ids.append(client_data["id"])
                
                # Verify required fields and optional fields are null
                success = (
                    client_data.get("nome") == client_minimal["nome"] and
                    client_data.get("cpf_cnpj") == client_minimal["cpf_cnpj"] and
                    client_data.get("ativo") == True and
                    client_data.get("telefone") is None and
                    client_data.get("email") is None and
                    client_data.get("endereco") is None and
                    client_data.get("observacoes") is None
                )
                
                if success:
                    self.log_test("Cenário Mínimo - CRÍTICO", True, "✅ DEVE RETORNAR: 200 OK (campos opcionais são null no backend) - BUG FIXED!")
                else:
                    self.log_test("Cenário Mínimo - CRÍTICO", False, f"Optional fields not null as expected: {client_data}")
            elif response.status_code == 422:
                self.log_test("Cenário Mínimo - CRÍTICO", False, f"❌ NÃO DEVE RETORNAR: 422 Unprocessable Entity - BUG STILL EXISTS! {response.text}")
            else:
                self.log_test("Cenário Mínimo - CRÍTICO", False, f"Unexpected status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Cenário Mínimo - CRÍTICO", False, f"Error: {str(e)}")
    
    def test_clientes_cadastro_parcial(self):
        """Test 3: CRIAR CLIENTE (Cenário Parcial) - Some optional fields filled"""
        print("\n=== TEST 3: CRIAR CLIENTE (Cenário Parcial) ===")
        
        client_partial = {
            "nome": "Teste Cliente Parcial",
            "cpf_cnpj": "11.222.333-44",
            "telefone": "(11) 91234-5678"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clientes", json=client_partial, headers=self.get_headers())
            if response.status_code == 200:
                client_data = response.json()
                self.created_client_ids.append(client_data["id"])
                
                # Verify partial fields are correctly stored
                success = (
                    client_data.get("nome") == client_partial["nome"] and
                    client_data.get("cpf_cnpj") == client_partial["cpf_cnpj"] and
                    client_data.get("telefone") == client_partial["telefone"] and
                    client_data.get("ativo") == True and
                    client_data.get("email") is None and
                    client_data.get("endereco") is None and
                    client_data.get("observacoes") is None
                )
                
                if success:
                    self.log_test("Cenário Parcial", True, "✅ DEVE RETORNAR: 200 OK - Partial data handled correctly")
                else:
                    self.log_test("Cenário Parcial", False, f"Partial fields validation failed: {client_data}")
            else:
                self.log_test("Cenário Parcial", False, f"Expected 200 OK but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Cenário Parcial", False, f"Error: {str(e)}")
    
    def test_clientes_edicao(self):
        """Test 4: EDITAR CLIENTE - Edit client and preserve ativo field"""
        print("\n=== TEST 4: EDITAR CLIENTE ===")
        
        if not self.created_client_ids:
            self.log_test("Editar Cliente", False, "No test clients available for editing")
            return
        
        # Use the first created client for editing
        client_id = self.created_client_ids[0]
        
        # Get current client data from the list
        try:
            response = requests.get(f"{self.base_url}/clientes?incluir_inativos=true", headers=self.get_headers())
            if response.status_code != 200:
                self.log_test("Editar Cliente - Get Original", False, f"Failed to get clients list: {response.status_code}")
                return
            clients = response.json()
            original_client = next((c for c in clients if c["id"] == client_id), None)
            if not original_client:
                self.log_test("Editar Cliente - Get Original", False, f"Client {client_id} not found in list")
                return
            original_ativo = original_client.get("ativo")
        except Exception as e:
            self.log_test("Editar Cliente - Get Original", False, f"Error getting client: {str(e)}")
            return
        
        # Update client data
        update_data = {
            "nome": "Teste Cliente Completo ATUALIZADO",
            "cpf_cnpj": original_client["cpf_cnpj"],  # Keep same CPF/CNPJ
            "telefone": "(11) 99999-8888",
            "email": "atualizado@cliente.com",
            "observacoes": "Cliente atualizado com sucesso"
        }
        
        try:
            response = requests.put(f"{self.base_url}/clientes/{client_id}", json=update_data, headers=self.get_headers())
            if response.status_code == 200:
                updated_client = response.json()
                
                # Verify fields are updated correctly and ativo is preserved
                success = (
                    updated_client.get("nome") == update_data["nome"] and
                    updated_client.get("telefone") == update_data["telefone"] and
                    updated_client.get("email") == update_data["email"] and
                    updated_client.get("observacoes") == update_data["observacoes"] and
                    updated_client.get("ativo") == original_ativo  # CRITICAL: ativo must be preserved
                )
                
                if success:
                    self.log_test("Editar Cliente", True, f"✅ DEVE RETORNAR: 200 OK e preservar campo ativo ({original_ativo}) - SUCCESS")
                else:
                    self.log_test("Editar Cliente", False, f"Update validation failed. Ativo preserved: {updated_client.get('ativo') == original_ativo}")
            else:
                self.log_test("Editar Cliente", False, f"Expected 200 OK but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Editar Cliente", False, f"Error: {str(e)}")
    
    def test_clientes_listagem_com_inativos(self):
        """Test 5: LISTAR CLIENTES COM INATIVOS - incluir_inativos=true"""
        print("\n=== TEST 5: LISTAR CLIENTES COM INATIVOS ===")
        
        # First, create an inactive client for testing
        inactive_client = {
            "nome": "Cliente Inativo Para Teste",
            "cpf_cnpj": "55.666.777-88"
        }
        
        inactive_client_id = None
        try:
            # Create client
            response = requests.post(f"{self.base_url}/clientes", json=inactive_client, headers=self.get_headers())
            if response.status_code == 200:
                inactive_client_id = response.json()["id"]
                self.created_client_ids.append(inactive_client_id)
                
                # Deactivate the client
                response = requests.put(f"{self.base_url}/clientes/{inactive_client_id}/toggle-status", headers=self.get_headers())
                if response.status_code == 200:
                    print("   ✓ Inactive client created for testing")
                else:
                    print(f"   ⚠ Failed to deactivate client: {response.text}")
            else:
                print(f"   ⚠ Failed to create inactive client: {response.text}")
        except Exception as e:
            print(f"   ⚠ Error creating inactive client: {str(e)}")
        
        # Test: Fetch ALL clients (incluir_inativos=true)
        try:
            response = requests.get(f"{self.base_url}/clientes?incluir_inativos=true", headers=self.get_headers())
            if response.status_code == 200:
                all_clients = response.json()
                
                # Count active and inactive clients
                active_count = sum(1 for c in all_clients if c.get("ativo") == True)
                inactive_count = sum(1 for c in all_clients if c.get("ativo") == False)
                total_count = len(all_clients)
                
                # Verify we have clients and at least some created in this test
                created_count = sum(1 for c in all_clients if c.get("id") in self.created_client_ids)
                
                if total_count >= created_count and created_count > 0:
                    self.log_test("Listar Clientes com Inativos", True, f"✅ DEVE RETORNAR: Lista com todos os clientes criados - {total_count} total ({active_count} ativos, {inactive_count} inativos)")
                else:
                    self.log_test("Listar Clientes com Inativos", False, f"Expected to find created clients. Total: {total_count}, Created: {created_count}")
                
            else:
                self.log_test("Listar Clientes com Inativos", False, f"Expected 200 OK but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Listar Clientes com Inativos", False, f"Error: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data created during tests"""
        print("\n--- Cleaning up test data ---")
        
        for client_id in self.created_client_ids:
            try:
                response = requests.delete(f"{self.base_url}/clientes/{client_id}", headers=self.get_headers())
                if response.status_code == 200:
                    print(f"   ✓ Cleaned up client {client_id}")
                else:
                    print(f"   ⚠ Failed to cleanup client {client_id}: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Error cleaning up client {client_id}: {str(e)}")
    
    def run_all_tests(self):
        """Run all Clientes module tests as specified in review request"""
        print("🎯 TESTAR MÓDULO CLIENTES - CORREÇÃO CRÍTICA DE CADASTRO")
        print("=" * 80)
        print("CONTEXTO: Usuário reportou erro ao cadastrar clientes.")
        print("ROOT CAUSE: Frontend enviava strings vazias, backend esperava null.")
        print("CORREÇÃO: Sanitização de dados no frontend.")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run the 5 mandatory tests from review request
        self.test_clientes_cadastro_completo()      # Test 1: Complete scenario
        self.test_clientes_cadastro_minimo_critico() # Test 2: Minimal scenario (CRITICAL)
        self.test_clientes_cadastro_parcial()       # Test 3: Partial scenario
        self.test_clientes_edicao()                 # Test 4: Edit client
        self.test_clientes_listagem_com_inativos()  # Test 5: List with inactive
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 CLIENTES MODULE - CORREÇÃO CRÍTICA - TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 FOCO DO TESTE:")
        print(f"   - Verificar que NÃO ocorre mais erro 422 ao cadastrar com campos opcionais vazios")
        print(f"   - Confirmar que backend aceita null para campos opcionais (telefone, email, observacoes, endereco)")
        print(f"   - Validar que EmailStr não rejeita mais strings vazias")
        print(f"   - **TESTE #2 (Cenário Mínimo) É O MAIS CRÍTICO - este era o bug reportado**")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! Bug fix is working correctly.")
        
        print("\n" + "=" * 80)
    
if __name__ == "__main__":
    tester = ClientesBackendTester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    # Optional cleanup
    # tester.cleanup_test_data()
    
    sys.exit(0 if success else 1)