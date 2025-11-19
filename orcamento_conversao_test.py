#!/usr/bin/env python3
"""
Backend Test Suite for Orçamento Conversion Bug Fix - Critical Testing
Tests the critical budget conversion bug fix as per review request

CONTEXTO DA TAREFA:
Acabei de corrigir um bug no módulo de Orçamentos relacionado à conversão de orçamento em venda com itens editados.

BUG CORRIGIDO:
Quando o usuário converte um orçamento em venda através da modal interativa e edita os itens 
(adiciona, remove ou modifica quantidades), ao efetivar a venda, o card do orçamento no frontend 
não atualizava com os valores finais. O orçamento mantinha os valores originais, criando 
inconsistência entre o que foi vendido e o que está registrado no orçamento.

SOLUÇÃO IMPLEMENTADA:
Modificado o endpoint POST /api/orcamentos/{id}/converter-venda no arquivo /app/backend/server.py 
(linhas 5191-5204). Agora, além de atualizar o status para "vendido", o endpoint também atualiza:
- itens (com os itens finais editados)
- subtotal (recalculado)
- total (recalculado)
- desconto (editado ou original)
- frete (editado ou original)

TESTES OBRIGATÓRIOS:
1. Conversão com EDIÇÃO de itens
2. Conversão SEM edição de itens
3. Conversão com edição de desconto/frete
"""

import requests
import json
import uuid
from datetime import datetime, timedelta
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://erp-financial-1.preview.emergentagent.com/api"

class OrcamentoConversaoTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.token = None
        self.user_id = None
        self.test_results = []
        self.created_client_ids = []
        self.created_product_ids = []
        self.created_budget_ids = []
        self.created_sale_ids = []
        
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
    
    def setup_test_data(self):
        """Create test client and products for budget testing"""
        print("\n=== SETUP TEST DATA ===")
        
        # Create test client
        client_data = {
            "nome": "Cliente Teste Orçamento",
            "cpf_cnpj": "12345678901"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clientes", json=client_data, headers=self.get_headers())
            if response.status_code == 200:
                client_id = response.json()["id"]
                self.created_client_ids.append(client_id)
                print(f"   ✓ Test client created: {client_id}")
            else:
                print(f"   ⚠ Failed to create test client: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"   ⚠ Error creating test client: {str(e)}")
            return False
        
        # Create test products
        products = [
            {
                "sku": f"TEST-VESTIDO-{uuid.uuid4().hex[:8]}",
                "nome": "Vestido Teste",
                "preco_custo": 50.0,
                "preco_venda": 100.0,
                "estoque_atual": 10,
                "estoque_minimo": 1,
                "estoque_maximo": 50
            },
            {
                "sku": f"TEST-CAMISA-{uuid.uuid4().hex[:8]}",
                "nome": "Camisa Teste",
                "preco_custo": 30.0,
                "preco_venda": 80.0,
                "estoque_atual": 15,
                "estoque_minimo": 1,
                "estoque_maximo": 50
            },
            {
                "sku": f"TEST-CALCA-{uuid.uuid4().hex[:8]}",
                "nome": "Calça Teste",
                "preco_custo": 40.0,
                "preco_venda": 120.0,
                "estoque_atual": 8,
                "estoque_minimo": 1,
                "estoque_maximo": 30
            }
        ]
        
        for product in products:
            try:
                response = requests.post(f"{self.base_url}/produtos", json=product, headers=self.get_headers())
                if response.status_code == 200:
                    product_id = response.json()["id"]
                    self.created_product_ids.append(product_id)
                    print(f"   ✓ Test product created: {product['nome']} - {product_id}")
                else:
                    print(f"   ⚠ Failed to create test product {product['nome']}: {response.status_code} - {response.text}")
                    return False
            except Exception as e:
                print(f"   ⚠ Error creating test product {product['nome']}: {str(e)}")
                return False
        
        return len(self.created_client_ids) > 0 and len(self.created_product_ids) >= 3
    
    def create_test_budget(self, items, desconto=0, frete=0):
        """Create a test budget with specified items"""
        if not self.created_client_ids:
            return None
        
        budget_data = {
            "cliente_id": self.created_client_ids[0],
            "itens": items,
            "desconto": desconto,
            "frete": frete,
            "dias_validade": 30,
            "observacoes": "Orçamento de teste para conversão"
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos", json=budget_data, headers=self.get_headers())
            if response.status_code == 200:
                budget = response.json()
                self.created_budget_ids.append(budget["id"])
                return budget
            else:
                print(f"   ⚠ Failed to create test budget: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"   ⚠ Error creating test budget: {str(e)}")
            return None
    
    def get_budget_by_id(self, budget_id):
        """Get budget details by ID"""
        try:
            response = requests.get(f"{self.base_url}/orcamentos/{budget_id}", headers=self.get_headers())
            if response.status_code == 200:
                return response.json()
            else:
                print(f"   ⚠ Failed to get budget {budget_id}: {response.status_code}")
                return None
        except Exception as e:
            print(f"   ⚠ Error getting budget {budget_id}: {str(e)}")
            return None
    
    def test_conversao_com_edicao_itens(self):
        """
        Teste 1: Conversão com EDIÇÃO de itens
        1. Criar um orçamento com múltiplos produtos (ex: 2 produtos diferentes)
        2. Anotar o valor TOTAL original do orçamento
        3. Converter em venda EDITANDO os itens (remover 1 produto, alterar quantidade do outro)
        4. Verificar se o orçamento no banco de dados foi ATUALIZADO com:
           - Novos itens (lista modificada)
           - Novo subtotal
           - Novo total
           - Status "vendido"
        """
        print("\n=== TESTE 1: CONVERSÃO COM EDIÇÃO DE ITENS ===")
        print("🎯 CRITICAL TEST: Orçamento deve ser atualizado com itens editados")
        
        if len(self.created_product_ids) < 2:
            self.log_test("Conversão com Edição - Setup", False, "Insufficient test products")
            return
        
        # 1. Criar orçamento com múltiplos produtos
        original_items = [
            {
                "produto_id": self.created_product_ids[0],  # Vestido
                "quantidade": 2,
                "preco_unitario": 100.0
            },
            {
                "produto_id": self.created_product_ids[1],  # Camisa
                "quantidade": 1,
                "preco_unitario": 80.0
            }
        ]
        
        budget = self.create_test_budget(original_items, desconto=10, frete=15)
        if not budget:
            self.log_test("Conversão com Edição - Criar Orçamento", False, "Failed to create test budget")
            return
        
        # 2. Anotar valores originais
        original_total = budget["total"]
        original_subtotal = budget["subtotal"]
        original_items_count = len(budget["itens"])
        
        print(f"   📊 Orçamento Original:")
        print(f"      - ID: {budget['id']}")
        print(f"      - Itens: {original_items_count} produtos")
        print(f"      - Subtotal: R$ {original_subtotal:.2f}")
        print(f"      - Total: R$ {original_total:.2f}")
        print(f"      - Status: {budget['status']}")
        
        # 3. Converter editando itens (remover vestido, manter apenas camisa com quantidade alterada)
        edited_items = [
            {
                "produto_id": self.created_product_ids[1],  # Apenas camisa
                "quantidade": 3,  # Quantidade alterada
                "preco_unitario": 80.0
            }
        ]
        
        conversion_data = {
            "forma_pagamento": "pix",
            "itens": edited_items,
            "observacoes": "Conversão com itens editados - teste"
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos/{budget['id']}/converter-venda", 
                                   json=conversion_data, headers=self.get_headers())
            
            if response.status_code == 200:
                conversion_result = response.json()
                
                # 4. Verificar se orçamento foi atualizado
                updated_budget = self.get_budget_by_id(budget['id'])
                if not updated_budget:
                    self.log_test("Conversão com Edição - Verificar Atualização", False, "Failed to get updated budget")
                    return
                
                # Calcular valores esperados
                expected_subtotal = sum(item["quantidade"] * item["preco_unitario"] for item in edited_items)
                expected_total = expected_subtotal - budget["desconto"] + budget["frete"]  # Desconto e frete originais
                
                print(f"   📊 Orçamento Após Conversão:")
                print(f"      - Itens: {len(updated_budget['itens'])} produtos")
                print(f"      - Subtotal: R$ {updated_budget['subtotal']:.2f}")
                print(f"      - Total: R$ {updated_budget['total']:.2f}")
                print(f"      - Status: {updated_budget['status']}")
                
                # Validações críticas
                validations = {
                    "status_vendido": updated_budget["status"] == "vendido",
                    "itens_atualizados": len(updated_budget["itens"]) == len(edited_items),
                    "subtotal_correto": abs(updated_budget["subtotal"] - expected_subtotal) < 0.01,
                    "total_correto": abs(updated_budget["total"] - expected_total) < 0.01,
                    "itens_diferentes": updated_budget["itens"] != budget["itens"],
                    "produto_correto": updated_budget["itens"][0]["produto_id"] == edited_items[0]["produto_id"],
                    "quantidade_correta": updated_budget["itens"][0]["quantidade"] == edited_items[0]["quantidade"]
                }
                
                all_valid = all(validations.values())
                
                if all_valid:
                    self.log_test("Conversão com Edição de Itens", True, 
                                f"✅ ORÇAMENTO ATUALIZADO CORRETAMENTE: Status=vendido, Itens={len(edited_items)}, Subtotal=R${expected_subtotal:.2f}, Total=R${expected_total:.2f}")
                else:
                    failed_validations = [k for k, v in validations.items() if not v]
                    self.log_test("Conversão com Edição de Itens", False, 
                                f"❌ VALIDAÇÕES FALHARAM: {failed_validations}", 
                                {"expected_subtotal": expected_subtotal, "actual_subtotal": updated_budget["subtotal"],
                                 "expected_total": expected_total, "actual_total": updated_budget["total"],
                                 "validations": validations})
                
            else:
                self.log_test("Conversão com Edição de Itens", False, 
                            f"❌ Conversion failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_test("Conversão com Edição de Itens", False, f"Error during conversion: {str(e)}")
    
    def test_conversao_sem_edicao_itens(self):
        """
        Teste 2: Conversão SEM edição de itens
        1. Criar um orçamento
        2. Converter em venda SEM editar itens (apenas confirmar)
        3. Verificar se o orçamento mantém os mesmos itens/valores mas status muda para "vendido"
        """
        print("\n=== TESTE 2: CONVERSÃO SEM EDIÇÃO DE ITENS ===")
        print("🎯 Orçamento deve manter itens originais, apenas mudar status")
        
        if len(self.created_product_ids) < 1:
            self.log_test("Conversão sem Edição - Setup", False, "Insufficient test products")
            return
        
        # 1. Criar orçamento
        original_items = [
            {
                "produto_id": self.created_product_ids[0],  # Vestido
                "quantidade": 1,
                "preco_unitario": 100.0
            }
        ]
        
        budget = self.create_test_budget(original_items, desconto=5, frete=10)
        if not budget:
            self.log_test("Conversão sem Edição - Criar Orçamento", False, "Failed to create test budget")
            return
        
        # 2. Anotar valores originais
        original_total = budget["total"]
        original_subtotal = budget["subtotal"]
        original_items = budget["itens"]
        
        print(f"   📊 Orçamento Original:")
        print(f"      - ID: {budget['id']}")
        print(f"      - Subtotal: R$ {original_subtotal:.2f}")
        print(f"      - Total: R$ {original_total:.2f}")
        print(f"      - Status: {budget['status']}")
        
        # 3. Converter SEM editar itens
        conversion_data = {
            "forma_pagamento": "cartao",
            "observacoes": "Conversão sem edição - teste"
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos/{budget['id']}/converter-venda", 
                                   json=conversion_data, headers=self.get_headers())
            
            if response.status_code == 200:
                # Verificar se orçamento mantém valores originais
                updated_budget = self.get_budget_by_id(budget['id'])
                if not updated_budget:
                    self.log_test("Conversão sem Edição - Verificar Manutenção", False, "Failed to get updated budget")
                    return
                
                print(f"   📊 Orçamento Após Conversão:")
                print(f"      - Subtotal: R$ {updated_budget['subtotal']:.2f}")
                print(f"      - Total: R$ {updated_budget['total']:.2f}")
                print(f"      - Status: {updated_budget['status']}")
                
                # Validações críticas
                validations = {
                    "status_vendido": updated_budget["status"] == "vendido",
                    "subtotal_mantido": abs(updated_budget["subtotal"] - original_subtotal) < 0.01,
                    "total_mantido": abs(updated_budget["total"] - original_total) < 0.01,
                    "itens_mantidos": updated_budget["itens"] == original_items,
                    "desconto_mantido": updated_budget["desconto"] == budget["desconto"],
                    "frete_mantido": updated_budget["frete"] == budget["frete"]
                }
                
                all_valid = all(validations.values())
                
                if all_valid:
                    self.log_test("Conversão sem Edição de Itens", True, 
                                f"✅ ORÇAMENTO MANTIDO CORRETAMENTE: Status=vendido, valores preservados")
                else:
                    failed_validations = [k for k, v in validations.items() if not v]
                    self.log_test("Conversão sem Edição de Itens", False, 
                                f"❌ VALIDAÇÕES FALHARAM: {failed_validations}", 
                                {"validations": validations})
                
            else:
                self.log_test("Conversão sem Edição de Itens", False, 
                            f"❌ Conversion failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_test("Conversão sem Edição de Itens", False, f"Error during conversion: {str(e)}")
    
    def test_conversao_com_edicao_desconto_frete(self):
        """
        Teste 3: Conversão com edição de desconto/frete
        1. Criar um orçamento com desconto e frete
        2. Converter editando desconto e frete
        3. Verificar se o orçamento foi atualizado com novos valores de desconto/frete
        """
        print("\n=== TESTE 3: CONVERSÃO COM EDIÇÃO DE DESCONTO/FRETE ===")
        print("🎯 Orçamento deve ser atualizado com novos valores de desconto e frete")
        
        if len(self.created_product_ids) < 1:
            self.log_test("Conversão com Edição Desconto/Frete - Setup", False, "Insufficient test products")
            return
        
        # 1. Criar orçamento com desconto e frete
        original_items = [
            {
                "produto_id": self.created_product_ids[1],  # Camisa
                "quantidade": 2,
                "preco_unitario": 80.0
            }
        ]
        
        budget = self.create_test_budget(original_items, desconto=20, frete=25)
        if not budget:
            self.log_test("Conversão com Edição Desconto/Frete - Criar Orçamento", False, "Failed to create test budget")
            return
        
        # 2. Anotar valores originais
        original_desconto = budget["desconto"]
        original_frete = budget["frete"]
        original_total = budget["total"]
        
        print(f"   📊 Orçamento Original:")
        print(f"      - ID: {budget['id']}")
        print(f"      - Desconto: R$ {original_desconto:.2f}")
        print(f"      - Frete: R$ {original_frete:.2f}")
        print(f"      - Total: R$ {original_total:.2f}")
        print(f"      - Status: {budget['status']}")
        
        # 3. Converter editando desconto e frete
        new_desconto = 30.0
        new_frete = 15.0
        
        conversion_data = {
            "forma_pagamento": "boleto",
            "desconto": new_desconto,
            "frete": new_frete,
            "observacoes": "Conversão com desconto/frete editados - teste"
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos/{budget['id']}/converter-venda", 
                                   json=conversion_data, headers=self.get_headers())
            
            if response.status_code == 200:
                # Verificar se orçamento foi atualizado com novos valores
                updated_budget = self.get_budget_by_id(budget['id'])
                if not updated_budget:
                    self.log_test("Conversão com Edição Desconto/Frete - Verificar Atualização", False, "Failed to get updated budget")
                    return
                
                # Calcular total esperado
                expected_total = budget["subtotal"] - new_desconto + new_frete
                
                print(f"   📊 Orçamento Após Conversão:")
                print(f"      - Desconto: R$ {updated_budget['desconto']:.2f}")
                print(f"      - Frete: R$ {updated_budget['frete']:.2f}")
                print(f"      - Total: R$ {updated_budget['total']:.2f}")
                print(f"      - Status: {updated_budget['status']}")
                
                # Validações críticas
                validations = {
                    "status_vendido": updated_budget["status"] == "vendido",
                    "desconto_atualizado": abs(updated_budget["desconto"] - new_desconto) < 0.01,
                    "frete_atualizado": abs(updated_budget["frete"] - new_frete) < 0.01,
                    "total_recalculado": abs(updated_budget["total"] - expected_total) < 0.01,
                    "desconto_diferente": updated_budget["desconto"] != original_desconto,
                    "frete_diferente": updated_budget["frete"] != original_frete
                }
                
                all_valid = all(validations.values())
                
                if all_valid:
                    self.log_test("Conversão com Edição Desconto/Frete", True, 
                                f"✅ ORÇAMENTO ATUALIZADO CORRETAMENTE: Desconto=R${new_desconto:.2f}, Frete=R${new_frete:.2f}, Total=R${expected_total:.2f}")
                else:
                    failed_validations = [k for k, v in validations.items() if not v]
                    self.log_test("Conversão com Edição Desconto/Frete", False, 
                                f"❌ VALIDAÇÕES FALHARAM: {failed_validations}", 
                                {"expected_desconto": new_desconto, "actual_desconto": updated_budget["desconto"],
                                 "expected_frete": new_frete, "actual_frete": updated_budget["frete"],
                                 "expected_total": expected_total, "actual_total": updated_budget["total"],
                                 "validations": validations})
                
            else:
                self.log_test("Conversão com Edição Desconto/Frete", False, 
                            f"❌ Conversion failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            self.log_test("Conversão com Edição Desconto/Frete", False, f"Error during conversion: {str(e)}")
    
    def cleanup_test_data(self):
        """Clean up test data created during tests"""
        print("\n--- Cleaning up test data ---")
        
        # Clean up sales (if any were created)
        for sale_id in self.created_sale_ids:
            try:
                response = requests.delete(f"{self.base_url}/vendas/{sale_id}", headers=self.get_headers())
                if response.status_code == 200:
                    print(f"   ✓ Cleaned up sale {sale_id}")
                else:
                    print(f"   ⚠ Failed to cleanup sale {sale_id}: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Error cleaning up sale {sale_id}: {str(e)}")
        
        # Clean up budgets
        for budget_id in self.created_budget_ids:
            try:
                response = requests.delete(f"{self.base_url}/orcamentos/{budget_id}", headers=self.get_headers())
                if response.status_code == 200:
                    print(f"   ✓ Cleaned up budget {budget_id}")
                else:
                    print(f"   ⚠ Failed to cleanup budget {budget_id}: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Error cleaning up budget {budget_id}: {str(e)}")
        
        # Clean up products
        for product_id in self.created_product_ids:
            try:
                response = requests.delete(f"{self.base_url}/produtos/{product_id}", headers=self.get_headers())
                if response.status_code == 200:
                    print(f"   ✓ Cleaned up product {product_id}")
                else:
                    print(f"   ⚠ Failed to cleanup product {product_id}: {response.status_code}")
            except Exception as e:
                print(f"   ⚠ Error cleaning up product {product_id}: {str(e)}")
        
        # Clean up clients
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
        """Run all Orçamento Conversion tests as specified in review request"""
        print("🎯 TESTAR CORREÇÃO BUG CONVERSÃO ORÇAMENTO EM VENDA")
        print("=" * 80)
        print("CONTEXTO: Bug no módulo de Orçamentos - conversão com itens editados")
        print("PROBLEMA: Orçamento não atualizava com valores finais após conversão")
        print("CORREÇÃO: Endpoint agora atualiza itens, subtotal, total, desconto, frete")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Setup test data
        if not self.setup_test_data():
            print("❌ Test data setup failed. Cannot proceed with tests.")
            return False
        
        # Run the 3 mandatory tests from review request
        self.test_conversao_com_edicao_itens()           # Test 1: Conversion with item editing
        self.test_conversao_sem_edicao_itens()           # Test 2: Conversion without item editing
        self.test_conversao_com_edicao_desconto_frete()  # Test 3: Conversion with discount/freight editing
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 ORÇAMENTO CONVERSION BUG FIX - TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 FOCO DO TESTE:")
        print(f"   - Verificar que orçamento é ATUALIZADO com itens editados na conversão")
        print(f"   - Confirmar que subtotal e total são RECALCULADOS corretamente")
        print(f"   - Validar que desconto e frete editados são APLICADOS ao orçamento")
        print(f"   - Garantir que status muda para 'vendido' em todos os casos")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! Bug fix is working correctly.")
        
        print("\n" + "=" * 80)
    
if __name__ == "__main__":
    tester = OrcamentoConversaoTester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    # Optional cleanup
    # tester.cleanup_test_data()
    
    sys.exit(0 if success else 1)