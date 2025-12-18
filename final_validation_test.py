#!/usr/bin/env python3
"""
Final Validation Test for Clientes and Fornecedores Corrections
Validates all corrections mentioned in the review request with proper stock setup
"""

import requests
import json
import uuid
from datetime import datetime
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://fintech-erp-3.preview.emergentagent.com/api"

class FinalValidationTester:
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
        """Authenticate and get JWT token"""
        print("\n=== AUTHENTICATION TEST ===")
        
        # Login with admin credentials as specified in review request
        login_data = {
            "email": "admin@emilykids.com",
            "senha": "admin123"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_test("Authentication", True, "Admin login successful")
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
    
    def setup_complete_test_environment(self):
        """Setup complete test environment with stock"""
        print("\n=== SETTING UP COMPLETE TEST ENVIRONMENT ===")
        
        # Create test supplier first
        fornecedor_data = {
            "razao_social": "Fornecedor Teste Estoque LTDA",
            "cnpj": "98.765.432/0001-10",
            "telefone": "(11) 4444-5555",
            "email": "fornecedor.estoque@empresa.com"
        }
        
        try:
            response = requests.post(f"{self.base_url}/fornecedores", json=fornecedor_data, headers=self.get_headers())
            if response.status_code == 200:
                self.stock_supplier_id = response.json()["id"]
                self.log_test("Setup - Create Stock Supplier", True, f"Stock supplier created: {self.stock_supplier_id}")
            else:
                self.log_test("Setup - Create Stock Supplier", False, f"Failed: {response.text}")
                return False
        except Exception as e:
            self.log_test("Setup - Create Stock Supplier", False, f"Error: {str(e)}")
            return False
        
        # Create test product
        produto_data = {
            "sku": "PROD-FINAL-TEST-001",
            "nome": "Produto Final Test",
            "unidade": "UN",
            "preco_custo": 15.00,
            "preco_venda": 30.00,
            "estoque_minimo": 1,
            "estoque_maximo": 100,
            "ativo": True
        }
        
        try:
            response = requests.post(f"{self.base_url}/produtos", json=produto_data, headers=self.get_headers())
            if response.status_code == 200:
                self.test_produto_id = response.json()["id"]
                self.log_test("Setup - Create Test Product", True, f"Test product created: {self.test_produto_id}")
            else:
                self.log_test("Setup - Create Test Product", False, f"Failed: {response.text}")
                return False
        except Exception as e:
            self.log_test("Setup - Create Test Product", False, f"Error: {str(e)}")
            return False
        
        # Add stock via nota fiscal
        nota_data = {
            "numero": "NF-STOCK-001",
            "serie": "1",
            "fornecedor_id": self.stock_supplier_id,
            "data_emissao": datetime.now().isoformat(),
            "valor_total": 150.00,  # 10 * 15.00
            "itens": [
                {"produto_id": self.test_produto_id, "quantidade": 10, "preco_unitario": 15.00}
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/notas-fiscais", json=nota_data, headers=self.get_headers())
            if response.status_code == 200:
                nota_id = response.json()["id"]
                
                # Confirm the nota fiscal to add stock
                response = requests.post(f"{self.base_url}/notas-fiscais/{nota_id}/confirmar", headers=self.get_headers())
                if response.status_code == 200:
                    self.log_test("Setup - Add Stock via Nota Fiscal", True, "Stock added successfully (10 units)")
                    return True
                else:
                    self.log_test("Setup - Confirm Nota Fiscal", False, f"Failed to confirm: {response.text}")
                    return False
            else:
                self.log_test("Setup - Create Stock Nota Fiscal", False, f"Failed: {response.text}")
                return False
        except Exception as e:
            self.log_test("Setup - Add Stock", False, f"Error: {str(e)}")
            return False

    def test_final_clientes_validation(self):
        """Final validation of all Clientes corrections"""
        print("\n=== FINAL CLIENTES VALIDATION ===")
        
        # Create test client
        cliente_data = {
            "nome": "Cliente Teste",
            "cpf_cnpj": "111.222.333-44",
            "telefone": "(11) 99999-8888",
            "email": "cliente.final.teste@email.com"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clientes", json=cliente_data, headers=self.get_headers())
            if response.status_code == 200:
                self.final_client_data = response.json()
                self.final_client_id = self.final_client_data["id"]
                
                # ✅ Correction 1: Verify ativo field is True by default
                if self.final_client_data.get("ativo") == True:
                    self.log_test("✅ Clientes - Campo ativo=True por padrão", True, "Campo ativo corretamente definido como True na criação")
                else:
                    self.log_test("❌ Clientes - Campo ativo=True por padrão", False, f"Campo ativo incorreto: {self.final_client_data.get('ativo')}")
            else:
                self.log_test("Clientes - Criação", False, f"HTTP {response.status_code}: {response.text}")
                return
        except Exception as e:
            self.log_test("Clientes - Criação", False, f"Error: {str(e)}")
            return
        
        # ✅ Correction 2: Test UPDATE preserves ativo field
        update_data = {
            "nome": "Cliente Teste Atualizado Final",
            "cpf_cnpj": "111.222.333-44",
            "telefone": "(11) 99999-7777",
            "email": "cliente.final.atualizado@email.com"
        }
        
        try:
            response = requests.put(f"{self.base_url}/clientes/{self.final_client_id}", json=update_data, headers=self.get_headers())
            if response.status_code == 200:
                # Verify ativo field is preserved
                response = requests.get(f"{self.base_url}/clientes", headers=self.get_headers())
                if response.status_code == 200:
                    clientes = response.json()
                    updated_client = next((c for c in clientes if c["id"] == self.final_client_id), None)
                    if updated_client and updated_client.get("ativo") == True:
                        self.log_test("✅ Clientes - Preservação campo ativo no UPDATE", True, "Campo ativo preservado corretamente durante UPDATE")
                    else:
                        self.log_test("❌ Clientes - Preservação campo ativo no UPDATE", False, f"Campo ativo não preservado: {updated_client.get('ativo') if updated_client else 'Cliente não encontrado'}")
                else:
                    self.log_test("Clientes - Verificação UPDATE", False, f"Falha na verificação: {response.status_code}")
            else:
                self.log_test("Clientes - UPDATE", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Clientes - UPDATE", False, f"Error: {str(e)}")
        
        # Test filter functionality
        # Default listing (only active)
        try:
            response = requests.get(f"{self.base_url}/clientes", headers=self.get_headers())
            if response.status_code == 200:
                clientes_ativos = response.json()
                active_count = len(clientes_ativos)
                
                # Listing with incluir_inativos=true
                params = {"incluir_inativos": "true"}
                response = requests.get(f"{self.base_url}/clientes", params=params, headers=self.get_headers())
                if response.status_code == 200:
                    todos_clientes = response.json()
                    total_count = len(todos_clientes)
                    
                    if total_count >= active_count:
                        self.log_test("✅ Clientes - Filtro incluir_inativos", True, f"Filtro funcionando: {active_count} ativos, {total_count} total")
                    else:
                        self.log_test("❌ Clientes - Filtro incluir_inativos", False, f"Filtro com problema: {active_count} ativos > {total_count} total")
                else:
                    self.log_test("Clientes - Listagem completa", False, f"HTTP {response.status_code}: {response.text}")
            else:
                self.log_test("Clientes - Listagem ativa", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Clientes - Filtros", False, f"Error: {str(e)}")
        
        # Test dependency validation with orçamento
        if hasattr(self, 'test_produto_id'):
            orcamento_data = {
                "cliente_id": self.final_client_id,
                "itens": [
                    {
                        "produto_id": self.test_produto_id,
                        "quantidade": 2,
                        "preco_unitario": 30.00
                    }
                ],
                "desconto": 0,
                "frete": 0,
                "observacoes": "Orçamento para teste de dependência"
            }
            
            try:
                response = requests.post(f"{self.base_url}/orcamentos", json=orcamento_data, headers=self.get_headers())
                if response.status_code == 200:
                    orcamento_id = response.json()["id"]
                    
                    # Try to deactivate client with open orçamento
                    response = requests.put(f"{self.base_url}/clientes/{self.final_client_id}/toggle-status", headers=self.get_headers())
                    if response.status_code == 400:
                        error_msg = response.json().get("detail", response.text)
                        if "orçamento" in error_msg.lower() or "orcamento" in error_msg.lower():
                            self.log_test("✅ Clientes - Validação de dependência (Orçamento)", True, f"Inativação corretamente impedida: {error_msg}")
                        else:
                            self.log_test("❌ Clientes - Validação de dependência (Orçamento)", False, f"Mensagem de erro incorreta: {error_msg}")
                    else:
                        self.log_test("❌ Clientes - Validação de dependência (Orçamento)", False, f"Inativação não foi impedida: {response.status_code}")
                else:
                    self.log_test("Clientes - Criação de orçamento para teste", False, f"Falha: {response.text}")
            except Exception as e:
                self.log_test("Clientes - Teste de dependência", False, f"Error: {str(e)}")
        
        # Test toggle-status functionality
        try:
            # First, clean up any orçamentos to allow deactivation
            response = requests.get(f"{self.base_url}/orcamentos", headers=self.get_headers())
            if response.status_code == 200:
                orcamentos = response.json()
                for orc in orcamentos:
                    if orc.get("cliente_id") == self.final_client_id:
                        # Cancel the orçamento
                        requests.put(f"{self.base_url}/orcamentos/{orc['id']}/cancelar", 
                                   json={"motivo": "Teste finalizado"}, headers=self.get_headers())
            
            # Now test toggle-status
            response = requests.put(f"{self.base_url}/clientes/{self.final_client_id}/toggle-status", headers=self.get_headers())
            if response.status_code == 200:
                # Verify client is inactive and excluded from default listing
                response = requests.get(f"{self.base_url}/clientes", headers=self.get_headers())
                if response.status_code == 200:
                    clientes_ativos = response.json()
                    inactive_in_default = any(c["id"] == self.final_client_id for c in clientes_ativos)
                    if not inactive_in_default:
                        self.log_test("✅ Clientes - Exclusão de inativos da listagem padrão", True, "Cliente inativo corretamente excluído da listagem padrão")
                    else:
                        self.log_test("❌ Clientes - Exclusão de inativos da listagem padrão", False, "Cliente inativo ainda aparece na listagem padrão")
                
                # Test reactivation
                response = requests.put(f"{self.base_url}/clientes/{self.final_client_id}/toggle-status", headers=self.get_headers())
                if response.status_code == 200:
                    self.log_test("✅ Clientes - Toggle-status (ativar/inativar)", True, "Funcionalidade toggle-status funcionando corretamente")
                else:
                    self.log_test("❌ Clientes - Toggle-status (reativação)", False, f"Falha na reativação: {response.status_code}")
            else:
                self.log_test("❌ Clientes - Toggle-status (inativação)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Clientes - Toggle-status", False, f"Error: {str(e)}")

    def test_final_fornecedores_validation(self):
        """Final validation of all Fornecedores corrections"""
        print("\n=== FINAL FORNECEDORES VALIDATION ===")
        
        # Create test supplier
        fornecedor_data = {
            "razao_social": "Fornecedor Teste LTDA",
            "cnpj": "55.666.777/0001-88",
            "ie": "987.654.321.098",
            "telefone": "(11) 5555-6666",
            "email": "fornecedor.final.teste@empresa.com"
        }
        
        try:
            response = requests.post(f"{self.base_url}/fornecedores", json=fornecedor_data, headers=self.get_headers())
            if response.status_code == 200:
                self.final_supplier_data = response.json()
                self.final_supplier_id = self.final_supplier_data["id"]
                
                # ✅ Correction 1: Verify ativo field is True by default
                if self.final_supplier_data.get("ativo") == True:
                    self.log_test("✅ Fornecedores - Campo ativo=True por padrão", True, "Campo ativo corretamente definido como True na criação")
                else:
                    self.log_test("❌ Fornecedores - Campo ativo=True por padrão", False, f"Campo ativo incorreto: {self.final_supplier_data.get('ativo')}")
            else:
                self.log_test("Fornecedores - Criação", False, f"HTTP {response.status_code}: {response.text}")
                return
        except Exception as e:
            self.log_test("Fornecedores - Criação", False, f"Error: {str(e)}")
            return
        
        # ✅ Correction 2: Test UPDATE preserves ativo field
        update_data = {
            "razao_social": "Fornecedor Teste LTDA - Atualizado Final",
            "cnpj": "55.666.777/0001-88",
            "ie": "987.654.321.098",
            "telefone": "(11) 5555-7777",
            "email": "fornecedor.final.atualizado@empresa.com"
        }
        
        try:
            response = requests.put(f"{self.base_url}/fornecedores/{self.final_supplier_id}", json=update_data, headers=self.get_headers())
            if response.status_code == 200:
                # Verify ativo field is preserved
                response = requests.get(f"{self.base_url}/fornecedores", headers=self.get_headers())
                if response.status_code == 200:
                    fornecedores = response.json()
                    updated_supplier = next((f for f in fornecedores if f["id"] == self.final_supplier_id), None)
                    if updated_supplier and updated_supplier.get("ativo") == True:
                        self.log_test("✅ Fornecedores - Preservação campo ativo no UPDATE", True, "Campo ativo preservado corretamente durante UPDATE")
                    else:
                        self.log_test("❌ Fornecedores - Preservação campo ativo no UPDATE", False, f"Campo ativo não preservado: {updated_supplier.get('ativo') if updated_supplier else 'Fornecedor não encontrado'}")
                else:
                    self.log_test("Fornecedores - Verificação UPDATE", False, f"Falha na verificação: {response.status_code}")
            else:
                self.log_test("Fornecedores - UPDATE", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Fornecedores - UPDATE", False, f"Error: {str(e)}")
        
        # Test filter functionality
        try:
            response = requests.get(f"{self.base_url}/fornecedores", headers=self.get_headers())
            if response.status_code == 200:
                fornecedores_ativos = response.json()
                active_count = len(fornecedores_ativos)
                
                # Listing with incluir_inativos=true
                params = {"incluir_inativos": "true"}
                response = requests.get(f"{self.base_url}/fornecedores", params=params, headers=self.get_headers())
                if response.status_code == 200:
                    todos_fornecedores = response.json()
                    total_count = len(todos_fornecedores)
                    
                    if total_count >= active_count:
                        self.log_test("✅ Fornecedores - Filtro incluir_inativos", True, f"Filtro funcionando: {active_count} ativos, {total_count} total")
                    else:
                        self.log_test("❌ Fornecedores - Filtro incluir_inativos", False, f"Filtro com problema: {active_count} ativos > {total_count} total")
                else:
                    self.log_test("Fornecedores - Listagem completa", False, f"HTTP {response.status_code}: {response.text}")
            else:
                self.log_test("Fornecedores - Listagem ativa", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Fornecedores - Filtros", False, f"Error: {str(e)}")
        
        # Test dependency validation with nota fiscal
        if hasattr(self, 'test_produto_id'):
            nota_data = {
                "numero": "NF-DEP-TEST-001",
                "serie": "1",
                "fornecedor_id": self.final_supplier_id,
                "data_emissao": datetime.now().isoformat(),
                "valor_total": 45.00,  # 3 * 15.00
                "itens": [
                    {"produto_id": self.test_produto_id, "quantidade": 3, "preco_unitario": 15.00}
                ]
            }
            
            try:
                response = requests.post(f"{self.base_url}/notas-fiscais", json=nota_data, headers=self.get_headers())
                if response.status_code == 200:
                    nota_id = response.json()["id"]
                    
                    # Try to deactivate supplier with pending nota fiscal
                    response = requests.put(f"{self.base_url}/fornecedores/{self.final_supplier_id}/toggle-status", headers=self.get_headers())
                    if response.status_code == 400:
                        error_msg = response.json().get("detail", response.text)
                        # ✅ Correction 4: Verify error message uses razao_social
                        if "razao_social" in error_msg.lower() or "Fornecedor Teste LTDA - Atualizado Final" in error_msg:
                            self.log_test("✅ Fornecedores - Mensagens de erro usam razao_social", True, f"Mensagem de erro correta com razao_social: {error_msg}")
                        else:
                            self.log_test("❌ Fornecedores - Mensagens de erro usam razao_social", False, f"Mensagem não usa razao_social: {error_msg}")
                        
                        if "nota" in error_msg.lower() and ("fiscal" in error_msg.lower() or "pendente" in error_msg.lower()):
                            self.log_test("✅ Fornecedores - Validação de dependência (Nota Fiscal)", True, f"Inativação corretamente impedida: {error_msg}")
                        else:
                            self.log_test("❌ Fornecedores - Validação de dependência (Nota Fiscal)", False, f"Mensagem de erro incorreta: {error_msg}")
                    else:
                        self.log_test("❌ Fornecedores - Validação de dependência (Nota Fiscal)", False, f"Inativação não foi impedida: {response.status_code}")
                else:
                    self.log_test("Fornecedores - Criação de nota fiscal para teste", False, f"Falha: {response.text}")
            except Exception as e:
                self.log_test("Fornecedores - Teste de dependência", False, f"Error: {str(e)}")
        
        # Test toggle-status functionality (after cleaning up dependencies)
        try:
            # Clean up nota fiscal to allow deactivation
            response = requests.get(f"{self.base_url}/notas-fiscais", headers=self.get_headers())
            if response.status_code == 200:
                notas = response.json()
                for nota in notas:
                    if nota.get("fornecedor_id") == self.final_supplier_id:
                        # Cancel the nota fiscal
                        requests.post(f"{self.base_url}/notas-fiscais/{nota['id']}/cancelar", 
                                    json={"motivo": "Teste finalizado"}, headers=self.get_headers())
            
            # Now test toggle-status
            response = requests.put(f"{self.base_url}/fornecedores/{self.final_supplier_id}/toggle-status", headers=self.get_headers())
            if response.status_code == 200:
                # Verify supplier is inactive and excluded from default listing
                response = requests.get(f"{self.base_url}/fornecedores", headers=self.get_headers())
                if response.status_code == 200:
                    fornecedores_ativos = response.json()
                    inactive_in_default = any(f["id"] == self.final_supplier_id for f in fornecedores_ativos)
                    if not inactive_in_default:
                        self.log_test("✅ Fornecedores - Exclusão de inativos da listagem padrão", True, "Fornecedor inativo corretamente excluído da listagem padrão")
                    else:
                        self.log_test("❌ Fornecedores - Exclusão de inativos da listagem padrão", False, "Fornecedor inativo ainda aparece na listagem padrão")
                
                # Test reactivation
                response = requests.put(f"{self.base_url}/fornecedores/{self.final_supplier_id}/toggle-status", headers=self.get_headers())
                if response.status_code == 200:
                    self.log_test("✅ Fornecedores - Toggle-status (ativar/inativar)", True, "Funcionalidade toggle-status funcionando corretamente")
                else:
                    self.log_test("❌ Fornecedores - Toggle-status (reativação)", False, f"Falha na reativação: {response.status_code}")
            else:
                self.log_test("❌ Fornecedores - Toggle-status (inativação)", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Fornecedores - Toggle-status", False, f"Error: {str(e)}")

    def print_final_summary(self):
        """Print final test summary"""
        print("\n" + "="*80)
        print("🎯 RESULTADO FINAL - VALIDAÇÃO DAS CORREÇÕES")
        print("="*80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"Total de Testes: {len(self.test_results)}")
        print(f"✅ Aprovados: {passed}")
        print(f"❌ Reprovados: {failed}")
        print(f"Taxa de Sucesso: {(passed/len(self.test_results)*100):.1f}%")
        
        # Show corrections validation
        print(f"\n📋 VALIDAÇÃO DAS CORREÇÕES APLICADAS:")
        
        corrections = [
            "Campo ativo=True por padrão",
            "Preservação campo ativo no UPDATE", 
            "Filtro incluir_inativos",
            "Exclusão de inativos da listagem padrão",
            "Toggle-status (ativar/inativar)",
            "Validação de dependência",
            "Mensagens de erro usam razao_social"
        ]
        
        for correction in corrections:
            correction_tests = [r for r in self.test_results if correction in r["test"]]
            if correction_tests:
                passed_correction = sum(1 for t in correction_tests if t["success"])
                total_correction = len(correction_tests)
                status = "✅" if passed_correction == total_correction else "❌" if passed_correction == 0 else "⚠️"
                print(f"   {status} {correction}: {passed_correction}/{total_correction}")
        
        if failed > 0:
            print(f"\n❌ TESTES REPROVADOS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   - {result['test']}: {result['message']}")
        
        print("\n" + "="*80)
        
        # Final verdict
        if failed == 0:
            print("🎉 TODAS AS CORREÇÕES VALIDADAS COM SUCESSO!")
        elif failed <= 2:
            print("⚠️ CORREÇÕES MAJORITARIAMENTE VALIDADAS - PEQUENOS AJUSTES NECESSÁRIOS")
        else:
            print("❌ CORREÇÕES PRECISAM DE REVISÃO")
        
        print("="*80)

    def run_final_validation(self):
        """Run final validation test suite"""
        print("🚀 VALIDAÇÃO FINAL DAS CORREÇÕES - CLIENTES E FORNECEDORES")
        print("Testando todas as correções mencionadas na review request")
        print(f"Backend URL: {self.base_url}")
        print("="*80)
        
        # Authentication is required for all tests
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Setup complete test environment with stock
        if not self.setup_complete_test_environment():
            print("⚠️ Test environment setup failed. Some tests may not work properly.")
        
        # Run final validation tests
        self.test_final_clientes_validation()
        self.test_final_fornecedores_validation()
        
        # Print final summary
        self.print_final_summary()
        return True

if __name__ == "__main__":
    tester = FinalValidationTester()
    success = tester.run_final_validation()
    sys.exit(0 if success else 1)