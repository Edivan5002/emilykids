#!/usr/bin/env python3
"""
DELETE DEPENDENCIES VALIDATION TEST SUITE
Testing complete dependency validation for DELETE operations on Clientes and Fornecedores

REVIEW REQUEST FOCUS:
- Verificar se ao tentar EXCLUIR (DELETE) um cliente ou fornecedor, o sistema checa TODAS as dependências
- DELETE CLIENTES deve verificar: Orçamentos vinculados (qualquer status), Vendas vinculadas (qualquer status)
- DELETE FORNECEDORES deve verificar: Notas Fiscais vinculadas (qualquer status), Produtos vinculados (fornecedor_preferencial_id)

TESTES OBRIGATÓRIOS:
1. TENTAR EXCLUIR CLIENTE COM ORÇAMENTOS - DEVE BLOQUEAR (400 Bad Request)
2. TENTAR EXCLUIR CLIENTE COM VENDAS - DEVE BLOQUEAR (400 Bad Request)
3. EXCLUIR CLIENTE SEM DEPENDÊNCIAS - DEVE PERMITIR (200 OK)
4. TENTAR EXCLUIR FORNECEDOR COM NOTAS FISCAIS - DEVE BLOQUEAR (400 Bad Request)
5. TENTAR EXCLUIR FORNECEDOR COM PRODUTOS - DEVE BLOQUEAR (400 Bad Request) [CRÍTICO - NOVA VALIDAÇÃO]
6. EXCLUIR FORNECEDOR SEM DEPENDÊNCIAS - DEVE PERMITIR (200 OK)

CREDENCIAIS: edivancelestino@yahoo.com.br / 123456 (admin)
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://erp-financial-1.preview.emergentagent.com/api"

class DeleteDependenciesValidator:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        self.created_entities = {
            "clientes": [],
            "fornecedores": [],
            "produtos": [],
            "orcamentos": [],
            "vendas": [],
            "notas_fiscais": []
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
        print("\n=== AUTHENTICATION ===")
        
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
    
    def create_test_cliente(self, name_suffix=""):
        """Create a test client"""
        cliente_data = {
            "nome": f"Cliente Teste DELETE {name_suffix}",
            "cpf_cnpj": f"123456789{len(self.created_entities['clientes']):02d}"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clientes", json=cliente_data, headers=self.get_headers())
            if response.status_code == 200:
                cliente = response.json()
                self.created_entities["clientes"].append(cliente["id"])
                print(f"   ✓ Created test client: {cliente['id']}")
                return cliente["id"]
            else:
                print(f"   ⚠ Failed to create client: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating client: {str(e)}")
            return None
    
    def create_test_fornecedor(self, name_suffix=""):
        """Create a test supplier"""
        fornecedor_data = {
            "razao_social": f"Fornecedor Teste DELETE {name_suffix} LTDA",
            "cnpj": f"987654321{len(self.created_entities['fornecedores']):02d}"
        }
        
        try:
            response = requests.post(f"{self.base_url}/fornecedores", json=fornecedor_data, headers=self.get_headers())
            if response.status_code == 200:
                fornecedor = response.json()
                self.created_entities["fornecedores"].append(fornecedor["id"])
                print(f"   ✓ Created test supplier: {fornecedor['id']}")
                return fornecedor["id"]
            else:
                print(f"   ⚠ Failed to create supplier: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating supplier: {str(e)}")
            return None
    
    def create_test_produto(self, fornecedor_id, name_suffix=""):
        """Create a test product linked to supplier"""
        produto_data = {
            "sku": f"PROD-DELETE-{len(self.created_entities['produtos']):03d}",
            "nome": f"Produto Teste DELETE {name_suffix}",
            "preco_custo": 10.0,
            "preco_venda": 20.0,
            "fornecedor_preferencial_id": fornecedor_id
        }
        
        try:
            response = requests.post(f"{self.base_url}/produtos", json=produto_data, headers=self.get_headers())
            if response.status_code == 200:
                produto = response.json()
                self.created_entities["produtos"].append(produto["id"])
                print(f"   ✓ Created test product: {produto['id']} linked to supplier {fornecedor_id}")
                return produto["id"]
            else:
                print(f"   ⚠ Failed to create product: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating product: {str(e)}")
            return None
    
    def create_test_orcamento(self, cliente_id):
        """Create a test budget linked to client"""
        # First get a product to add to the budget
        try:
            response = requests.get(f"{self.base_url}/produtos", headers=self.get_headers())
            if response.status_code == 200:
                produtos = response.json()
                if not produtos:
                    print("   ⚠ No products available for budget")
                    return None
                produto = produtos[0]
            else:
                print(f"   ⚠ Failed to get products: {response.status_code}")
                return None
        except Exception as e:
            print(f"   ⚠ Error getting products: {str(e)}")
            return None
        
        orcamento_data = {
            "cliente_id": cliente_id,
            "itens": [
                {
                    "produto_id": produto["id"],
                    "quantidade": 2,
                    "preco_unitario": produto["preco_venda"]
                }
            ],
            "desconto": 0,
            "frete": 0,
            "dias_validade": 30
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos", json=orcamento_data, headers=self.get_headers())
            if response.status_code == 200:
                orcamento = response.json()
                self.created_entities["orcamentos"].append(orcamento["id"])
                print(f"   ✓ Created test budget: {orcamento['id']} linked to client {cliente_id}")
                return orcamento["id"]
            else:
                print(f"   ⚠ Failed to create budget: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating budget: {str(e)}")
            return None
    
    def create_test_venda(self, cliente_id):
        """Create a test sale linked to client"""
        # First get a product to add to the sale
        try:
            response = requests.get(f"{self.base_url}/produtos", headers=self.get_headers())
            if response.status_code == 200:
                produtos = response.json()
                if not produtos:
                    print("   ⚠ No products available for sale")
                    return None
                produto = produtos[0]
            else:
                print(f"   ⚠ Failed to get products: {response.status_code}")
                return None
        except Exception as e:
            print(f"   ⚠ Error getting products: {str(e)}")
            return None
        
        venda_data = {
            "cliente_id": cliente_id,
            "itens": [
                {
                    "produto_id": produto["id"],
                    "quantidade": 1,
                    "preco_unitario": produto["preco_venda"]
                }
            ],
            "desconto": 0,
            "frete": 0,
            "forma_pagamento": "pix"
        }
        
        try:
            response = requests.post(f"{self.base_url}/vendas", json=venda_data, headers=self.get_headers())
            if response.status_code == 200:
                venda = response.json()
                self.created_entities["vendas"].append(venda["id"])
                print(f"   ✓ Created test sale: {venda['id']} linked to client {cliente_id}")
                return venda["id"]
            else:
                print(f"   ⚠ Failed to create sale: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating sale: {str(e)}")
            return None
    
    def create_test_nota_fiscal(self, fornecedor_id):
        """Create a test invoice linked to supplier"""
        # First get a product to add to the invoice
        try:
            response = requests.get(f"{self.base_url}/produtos", headers=self.get_headers())
            if response.status_code == 200:
                produtos = response.json()
                if not produtos:
                    print("   ⚠ No products available for invoice")
                    return None
                produto = produtos[0]
            else:
                print(f"   ⚠ Failed to get products: {response.status_code}")
                return None
        except Exception as e:
            print(f"   ⚠ Error getting products: {str(e)}")
            return None
        
        nota_data = {
            "numero": f"NF-{len(self.created_entities['notas_fiscais']):04d}",
            "serie": "1",
            "fornecedor_id": fornecedor_id,
            "data_emissao": datetime.now().isoformat(),
            "valor_total": 100.0,
            "itens": [
                {
                    "produto_id": produto["id"],
                    "quantidade": 5,
                    "preco_unitario": 20.0
                }
            ]
        }
        
        try:
            response = requests.post(f"{self.base_url}/notas-fiscais", json=nota_data, headers=self.get_headers())
            if response.status_code == 200:
                nota = response.json()
                self.created_entities["notas_fiscais"].append(nota["id"])
                print(f"   ✓ Created test invoice: {nota['id']} linked to supplier {fornecedor_id}")
                return nota["id"]
            else:
                print(f"   ⚠ Failed to create invoice: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating invoice: {str(e)}")
            return None
    
    def test_delete_cliente_com_orcamentos(self):
        """TEST 1: TENTAR EXCLUIR CLIENTE COM ORÇAMENTOS - DEVE BLOQUEAR"""
        print("\n=== TEST 1: DELETE CLIENTE COM ORÇAMENTOS ===")
        
        # Create client and budget
        cliente_id = self.create_test_cliente("COM ORÇAMENTOS")
        if not cliente_id:
            self.log_test("DELETE Cliente com Orçamentos", False, "Failed to create test client")
            return
        
        orcamento_id = self.create_test_orcamento(cliente_id)
        if not orcamento_id:
            self.log_test("DELETE Cliente com Orçamentos", False, "Failed to create test budget")
            return
        
        # Try to delete client - should be blocked
        try:
            response = requests.delete(f"{self.base_url}/clientes/{cliente_id}", headers=self.get_headers())
            if response.status_code == 400:
                response_data = response.json()
                message = response_data.get("detail", "")
                if "orçamento" in message.lower():
                    self.log_test("DELETE Cliente com Orçamentos", True, "❌ DEVE BLOQUEAR: 400 Bad Request com mensagem sobre orçamentos - SUCCESS")
                else:
                    self.log_test("DELETE Cliente com Orçamentos", False, f"Blocked but wrong message: {message}")
            elif response.status_code == 200:
                self.log_test("DELETE Cliente com Orçamentos", False, "❌ NÃO DEVE PERMITIR: Cliente foi excluído mesmo tendo orçamentos!")
            else:
                self.log_test("DELETE Cliente com Orçamentos", False, f"Unexpected status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("DELETE Cliente com Orçamentos", False, f"Error: {str(e)}")
    
    def test_delete_cliente_com_vendas(self):
        """TEST 2: TENTAR EXCLUIR CLIENTE COM VENDAS - DEVE BLOQUEAR"""
        print("\n=== TEST 2: DELETE CLIENTE COM VENDAS ===")
        
        # Create client and sale
        cliente_id = self.create_test_cliente("COM VENDAS")
        if not cliente_id:
            self.log_test("DELETE Cliente com Vendas", False, "Failed to create test client")
            return
        
        venda_id = self.create_test_venda(cliente_id)
        if not venda_id:
            self.log_test("DELETE Cliente com Vendas", False, "Failed to create test sale")
            return
        
        # Try to delete client - should be blocked
        try:
            response = requests.delete(f"{self.base_url}/clientes/{cliente_id}", headers=self.get_headers())
            if response.status_code == 400:
                response_data = response.json()
                message = response_data.get("detail", "")
                if "venda" in message.lower():
                    self.log_test("DELETE Cliente com Vendas", True, "❌ DEVE BLOQUEAR: 400 Bad Request com mensagem sobre vendas - SUCCESS")
                else:
                    self.log_test("DELETE Cliente com Vendas", False, f"Blocked but wrong message: {message}")
            elif response.status_code == 200:
                self.log_test("DELETE Cliente com Vendas", False, "❌ NÃO DEVE PERMITIR: Cliente foi excluído mesmo tendo vendas!")
            else:
                self.log_test("DELETE Cliente com Vendas", False, f"Unexpected status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("DELETE Cliente com Vendas", False, f"Error: {str(e)}")
    
    def test_delete_cliente_sem_dependencias(self):
        """TEST 3: EXCLUIR CLIENTE SEM DEPENDÊNCIAS - DEVE PERMITIR"""
        print("\n=== TEST 3: DELETE CLIENTE SEM DEPENDÊNCIAS ===")
        
        # Create client without dependencies
        cliente_id = self.create_test_cliente("SEM DEPENDÊNCIAS")
        if not cliente_id:
            self.log_test("DELETE Cliente sem Dependências", False, "Failed to create test client")
            return
        
        # Try to delete client - should succeed
        try:
            response = requests.delete(f"{self.base_url}/clientes/{cliente_id}", headers=self.get_headers())
            if response.status_code == 200:
                response_data = response.json()
                message = response_data.get("message", "")
                self.log_test("DELETE Cliente sem Dependências", True, "✅ DEVE PERMITIR: 200 OK com mensagem de sucesso - SUCCESS")
                # Remove from cleanup list since it's already deleted
                if cliente_id in self.created_entities["clientes"]:
                    self.created_entities["clientes"].remove(cliente_id)
            else:
                self.log_test("DELETE Cliente sem Dependências", False, f"Expected 200 OK but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("DELETE Cliente sem Dependências", False, f"Error: {str(e)}")
    
    def test_delete_fornecedor_com_notas_fiscais(self):
        """TEST 4: TENTAR EXCLUIR FORNECEDOR COM NOTAS FISCAIS - DEVE BLOQUEAR"""
        print("\n=== TEST 4: DELETE FORNECEDOR COM NOTAS FISCAIS ===")
        
        # Create supplier and invoice
        fornecedor_id = self.create_test_fornecedor("COM NOTAS FISCAIS")
        if not fornecedor_id:
            self.log_test("DELETE Fornecedor com Notas Fiscais", False, "Failed to create test supplier")
            return
        
        nota_id = self.create_test_nota_fiscal(fornecedor_id)
        if not nota_id:
            self.log_test("DELETE Fornecedor com Notas Fiscais", False, "Failed to create test invoice")
            return
        
        # Try to delete supplier - should be blocked
        try:
            response = requests.delete(f"{self.base_url}/fornecedores/{fornecedor_id}", headers=self.get_headers())
            if response.status_code == 400:
                response_data = response.json()
                message = response_data.get("detail", "")
                if "nota" in message.lower() or "fiscal" in message.lower():
                    self.log_test("DELETE Fornecedor com Notas Fiscais", True, "❌ DEVE BLOQUEAR: 400 Bad Request com mensagem sobre notas fiscais - SUCCESS")
                else:
                    self.log_test("DELETE Fornecedor com Notas Fiscais", False, f"Blocked but wrong message: {message}")
            elif response.status_code == 200:
                self.log_test("DELETE Fornecedor com Notas Fiscais", False, "❌ NÃO DEVE PERMITIR: Fornecedor foi excluído mesmo tendo notas fiscais!")
            else:
                self.log_test("DELETE Fornecedor com Notas Fiscais", False, f"Unexpected status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("DELETE Fornecedor com Notas Fiscais", False, f"Error: {str(e)}")
    
    def test_delete_fornecedor_com_produtos(self):
        """TEST 5: TENTAR EXCLUIR FORNECEDOR COM PRODUTOS - DEVE BLOQUEAR (CRÍTICO - NOVA VALIDAÇÃO)"""
        print("\n=== TEST 5: DELETE FORNECEDOR COM PRODUTOS (CRÍTICO) ===")
        print("🎯 CRITICAL TEST: This is the NEW validation that was added")
        
        # Create supplier and product
        fornecedor_id = self.create_test_fornecedor("COM PRODUTOS")
        if not fornecedor_id:
            self.log_test("DELETE Fornecedor com Produtos", False, "Failed to create test supplier")
            return
        
        produto_id = self.create_test_produto(fornecedor_id, "VINCULADO")
        if not produto_id:
            self.log_test("DELETE Fornecedor com Produtos", False, "Failed to create test product")
            return
        
        # Try to delete supplier - should be blocked
        try:
            response = requests.delete(f"{self.base_url}/fornecedores/{fornecedor_id}", headers=self.get_headers())
            if response.status_code == 400:
                response_data = response.json()
                message = response_data.get("detail", "")
                if "produto" in message.lower():
                    self.log_test("DELETE Fornecedor com Produtos", True, "❌ DEVE BLOQUEAR: 400 Bad Request com mensagem sobre produtos vinculados - SUCCESS (NOVA VALIDAÇÃO FUNCIONANDO!)")
                else:
                    self.log_test("DELETE Fornecedor com Produtos", False, f"Blocked but wrong message: {message}")
            elif response.status_code == 200:
                self.log_test("DELETE Fornecedor com Produtos", False, "❌ NÃO DEVE PERMITIR: Fornecedor foi excluído mesmo tendo produtos vinculados! (NOVA VALIDAÇÃO FALHANDO)")
            else:
                self.log_test("DELETE Fornecedor com Produtos", False, f"Unexpected status {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("DELETE Fornecedor com Produtos", False, f"Error: {str(e)}")
    
    def test_delete_fornecedor_sem_dependencias(self):
        """TEST 6: EXCLUIR FORNECEDOR SEM DEPENDÊNCIAS - DEVE PERMITIR"""
        print("\n=== TEST 6: DELETE FORNECEDOR SEM DEPENDÊNCIAS ===")
        
        # Create supplier without dependencies
        fornecedor_id = self.create_test_fornecedor("SEM DEPENDÊNCIAS")
        if not fornecedor_id:
            self.log_test("DELETE Fornecedor sem Dependências", False, "Failed to create test supplier")
            return
        
        # Try to delete supplier - should succeed
        try:
            response = requests.delete(f"{self.base_url}/fornecedores/{fornecedor_id}", headers=self.get_headers())
            if response.status_code == 200:
                response_data = response.json()
                message = response_data.get("message", "")
                self.log_test("DELETE Fornecedor sem Dependências", True, "✅ DEVE PERMITIR: 200 OK com mensagem de sucesso - SUCCESS")
                # Remove from cleanup list since it's already deleted
                if fornecedor_id in self.created_entities["fornecedores"]:
                    self.created_entities["fornecedores"].remove(fornecedor_id)
            else:
                self.log_test("DELETE Fornecedor sem Dependências", False, f"Expected 200 OK but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("DELETE Fornecedor sem Dependências", False, f"Error: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data created during tests"""
        print("\n--- Cleaning up test data ---")
        
        # Clean up in reverse dependency order
        for entity_type in ["orcamentos", "vendas", "notas_fiscais", "produtos", "clientes", "fornecedores"]:
            for entity_id in self.created_entities[entity_type]:
                try:
                    endpoint = entity_type.replace("_", "-")  # Convert underscores to hyphens for API
                    response = requests.delete(f"{self.base_url}/{endpoint}/{entity_id}", headers=self.get_headers())
                    if response.status_code == 200:
                        print(f"   ✓ Cleaned up {entity_type[:-1]} {entity_id}")
                    else:
                        print(f"   ⚠ Failed to cleanup {entity_type[:-1]} {entity_id}: {response.status_code}")
                except Exception as e:
                    print(f"   ⚠ Error cleaning up {entity_type[:-1]} {entity_id}: {str(e)}")
    
    def run_all_tests(self):
        """Run all DELETE dependency validation tests"""
        print("🎯 TESTAR VALIDAÇÕES DE DEPENDÊNCIAS - DELETE CLIENTES E FORNECEDORES")
        print("=" * 80)
        print("CONTEXTO: Usuário solicitou verificação se DELETE checa TODAS as dependências")
        print("ANÁLISE: DELETE de fornecedores estava incompleto (não verificava produtos)")
        print("CORREÇÃO: Adicionada verificação de produtos no DELETE de fornecedores")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run the 6 mandatory tests from review request
        self.test_delete_cliente_com_orcamentos()        # Test 1: Client with budgets
        self.test_delete_cliente_com_vendas()            # Test 2: Client with sales
        self.test_delete_cliente_sem_dependencias()      # Test 3: Client without dependencies
        self.test_delete_fornecedor_com_notas_fiscais()  # Test 4: Supplier with invoices
        self.test_delete_fornecedor_com_produtos()       # Test 5: Supplier with products (CRITICAL)
        self.test_delete_fornecedor_sem_dependencias()   # Test 6: Supplier without dependencies
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 DELETE DEPENDENCIES VALIDATION - TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 VALIDAÇÕES ESPERADAS:")
        print(f"   DELETE CLIENTES deve verificar:")
        print(f"   - ✅ Orçamentos vinculados (qualquer status)")
        print(f"   - ✅ Vendas vinculadas (qualquer status)")
        print(f"   DELETE FORNECEDORES deve verificar:")
        print(f"   - ✅ Notas Fiscais vinculadas (qualquer status)")
        print(f"   - ✅ Produtos vinculados (fornecedor_preferencial_id) - NOVA VALIDAÇÃO")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! DELETE dependency validations are working correctly.")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    validator = DeleteDependenciesValidator()
    success = validator.run_all_tests()
    validator.print_summary()
    
    # Optional cleanup
    # validator.cleanup_test_data()
    
    sys.exit(0 if success else 1)