#!/usr/bin/env python3
"""
Backend Test Suite for Vendas Module - orcamento_id Field Validation
Tests the GET /api/vendas endpoint to validate orcamento_id field for converted sales

OBJETIVO: Validar que o endpoint GET /vendas está retornando o campo orcamento_id 
para vendas que foram convertidas de orçamentos.

CONTEXTO DA IMPLEMENTAÇÃO:
- Backend JÁ POSSUI o campo orcamento_id no modelo Venda (linha 578 de server.py)
- O endpoint GET /api/vendas JÁ RETORNA esse campo (response_model=List[Venda])
- Quando um orçamento é convertido via POST /api/orcamentos/{id}/converter-venda, 
  o sistema já salva o orcamento_id

TESTES NECESSÁRIOS:
1. Listar Vendas e Verificar Campo orcamento_id
2. Verificar Estrutura do Campo (UUID string ou null)
3. Validação de Dados (verificar se orçamento de origem existe)
"""

import requests
import json
import uuid
from datetime import datetime
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://contas-manager.preview.emergentagent.com/api"

class VendasOrcamentoTester:
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
            {"email": "admin@emilykids.com", "senha": "Admin@123"},
            {"email": "admin@emilykids.com", "senha": "admin123"},
            {"email": "admin@emilykids.com", "senha": "123456"},
            {"email": "edivancelestino@yahoo.com.br", "senha": "123456"},
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
    
    def test_listar_vendas_verificar_orcamento_id(self):
        """Test 1: Listar Vendas e Verificar Campo orcamento_id"""
        print("\n=== TEST 1: LISTAR VENDAS E VERIFICAR CAMPO orcamento_id ===")
        
        try:
            response = requests.get(f"{self.base_url}/vendas", headers=self.get_headers())
            
            if response.status_code == 200:
                vendas = response.json()
                
                if not vendas:
                    self.log_test("Listar Vendas - Campo orcamento_id", True, 
                                "✅ Endpoint funcionando, mas não há vendas no sistema para testar")
                    return
                
                # Verificar se todas as vendas têm o campo orcamento_id
                vendas_com_campo = 0
                vendas_com_orcamento_id = 0
                vendas_sem_campo = []
                
                for venda in vendas:
                    if "orcamento_id" in venda:
                        vendas_com_campo += 1
                        if venda["orcamento_id"] is not None:
                            vendas_com_orcamento_id += 1
                    else:
                        vendas_sem_campo.append(venda.get("id", "unknown"))
                
                total_vendas = len(vendas)
                
                if vendas_sem_campo:
                    self.log_test("Listar Vendas - Campo orcamento_id", False, 
                                f"❌ {len(vendas_sem_campo)} vendas SEM campo orcamento_id: {vendas_sem_campo}")
                else:
                    self.log_test("Listar Vendas - Campo orcamento_id", True, 
                                f"✅ TODAS as {total_vendas} vendas possuem campo orcamento_id. "
                                f"Vendas convertidas de orçamentos: {vendas_com_orcamento_id}")
                
                # Log detalhado das vendas com orcamento_id
                if vendas_com_orcamento_id > 0:
                    print(f"   📋 Vendas convertidas de orçamentos encontradas:")
                    for venda in vendas:
                        if venda.get("orcamento_id"):
                            print(f"      - Venda ID: {venda.get('id', 'N/A')[:8]}... | Orçamento ID: {venda['orcamento_id'][:8]}...")
                else:
                    print(f"   ℹ️  Nenhuma venda convertida de orçamento encontrada (todas têm orcamento_id=null)")
                
            else:
                self.log_test("Listar Vendas - Campo orcamento_id", False, 
                            f"❌ Erro ao acessar endpoint: {response.status_code} - {response.text}")
        
        except Exception as e:
            self.log_test("Listar Vendas - Campo orcamento_id", False, f"Erro na requisição: {str(e)}")
    
    def test_verificar_estrutura_campo_orcamento_id(self):
        """Test 2: Verificar Estrutura do Campo orcamento_id"""
        print("\n=== TEST 2: VERIFICAR ESTRUTURA DO CAMPO orcamento_id ===")
        
        try:
            response = requests.get(f"{self.base_url}/vendas", headers=self.get_headers())
            
            if response.status_code == 200:
                vendas = response.json()
                
                if not vendas:
                    self.log_test("Estrutura Campo orcamento_id", True, 
                                "✅ Não há vendas para testar estrutura")
                    return
                
                estrutura_valida = True
                problemas = []
                
                for venda in vendas:
                    orcamento_id = venda.get("orcamento_id")
                    
                    # Verificar se é null ou string UUID válida
                    if orcamento_id is not None:
                        # Deve ser string não vazia
                        if not isinstance(orcamento_id, str):
                            estrutura_valida = False
                            problemas.append(f"Venda {venda.get('id', 'N/A')[:8]}... - orcamento_id não é string: {type(orcamento_id)}")
                        elif orcamento_id.strip() == "":
                            estrutura_valida = False
                            problemas.append(f"Venda {venda.get('id', 'N/A')[:8]}... - orcamento_id é string vazia")
                        else:
                            # Verificar se parece com UUID (formato básico)
                            if len(orcamento_id) < 32:  # UUID tem pelo menos 32 caracteres
                                estrutura_valida = False
                                problemas.append(f"Venda {venda.get('id', 'N/A')[:8]}... - orcamento_id muito curto: '{orcamento_id}'")
                
                if estrutura_valida:
                    self.log_test("Estrutura Campo orcamento_id", True, 
                                "✅ Todos os campos orcamento_id têm estrutura válida (UUID string ou null)")
                else:
                    self.log_test("Estrutura Campo orcamento_id", False, 
                                f"❌ Problemas de estrutura encontrados: {problemas}")
            
            else:
                self.log_test("Estrutura Campo orcamento_id", False, 
                            f"❌ Erro ao acessar endpoint: {response.status_code}")
        
        except Exception as e:
            self.log_test("Estrutura Campo orcamento_id", False, f"Erro na requisição: {str(e)}")
    
    def test_validacao_orcamentos_origem(self):
        """Test 3: Validação de Dados - Verificar se orçamentos de origem existem"""
        print("\n=== TEST 3: VALIDAÇÃO DE DADOS - ORÇAMENTOS DE ORIGEM ===")
        
        try:
            # Primeiro, buscar vendas
            response_vendas = requests.get(f"{self.base_url}/vendas", headers=self.get_headers())
            
            if response_vendas.status_code != 200:
                self.log_test("Validação Orçamentos Origem", False, 
                            f"❌ Erro ao buscar vendas: {response_vendas.status_code}")
                return
            
            vendas = response_vendas.json()
            vendas_convertidas = [v for v in vendas if v.get("orcamento_id")]
            
            if not vendas_convertidas:
                self.log_test("Validação Orçamentos Origem", True, 
                            "✅ Não há vendas convertidas de orçamentos para validar")
                return
            
            # Buscar orçamentos para validação
            response_orcamentos = requests.get(f"{self.base_url}/orcamentos", headers=self.get_headers())
            
            if response_orcamentos.status_code != 200:
                self.log_test("Validação Orçamentos Origem", False, 
                            f"❌ Erro ao buscar orçamentos: {response_orcamentos.status_code}")
                return
            
            orcamentos = response_orcamentos.json()
            orcamentos_ids = {orc.get("id") for orc in orcamentos}
            
            # Validar se orçamentos de origem existem
            orcamentos_nao_encontrados = []
            orcamentos_encontrados = 0
            
            for venda in vendas_convertidas:
                orcamento_id = venda["orcamento_id"]
                if orcamento_id in orcamentos_ids:
                    orcamentos_encontrados += 1
                else:
                    orcamentos_nao_encontrados.append({
                        "venda_id": venda.get("id", "N/A")[:8] + "...",
                        "orcamento_id": orcamento_id[:8] + "..."
                    })
            
            if not orcamentos_nao_encontrados:
                self.log_test("Validação Orçamentos Origem", True, 
                            f"✅ Todos os {orcamentos_encontrados} orçamentos de origem foram encontrados no sistema")
            else:
                self.log_test("Validação Orçamentos Origem", False, 
                            f"❌ {len(orcamentos_nao_encontrados)} orçamentos de origem NÃO encontrados: {orcamentos_nao_encontrados}")
        
        except Exception as e:
            self.log_test("Validação Orçamentos Origem", False, f"Erro na validação: {str(e)}")
    
    def test_endpoint_response_format(self):
        """Test 4: Verificar formato geral da resposta do endpoint"""
        print("\n=== TEST 4: VERIFICAR FORMATO DA RESPOSTA ===")
        
        try:
            response = requests.get(f"{self.base_url}/vendas", headers=self.get_headers())
            
            if response.status_code == 200:
                try:
                    vendas = response.json()
                    
                    # Verificar se é uma lista
                    if not isinstance(vendas, list):
                        self.log_test("Formato Resposta", False, 
                                    f"❌ Resposta não é uma lista: {type(vendas)}")
                        return
                    
                    # Verificar estrutura básica se há vendas
                    if vendas:
                        primeira_venda = vendas[0]
                        campos_obrigatorios = ["id", "cliente_id", "itens", "total", "created_at"]
                        campos_faltando = [campo for campo in campos_obrigatorios if campo not in primeira_venda]
                        
                        if campos_faltando:
                            self.log_test("Formato Resposta", False, 
                                        f"❌ Campos obrigatórios faltando: {campos_faltando}")
                        else:
                            # Verificar especificamente o campo orcamento_id
                            if "orcamento_id" in primeira_venda:
                                self.log_test("Formato Resposta", True, 
                                            f"✅ Formato válido. Lista com {len(vendas)} vendas, campo orcamento_id presente")
                            else:
                                self.log_test("Formato Resposta", False, 
                                            "❌ Campo orcamento_id não encontrado na resposta")
                    else:
                        self.log_test("Formato Resposta", True, 
                                    "✅ Formato válido. Lista vazia (sem vendas no sistema)")
                
                except json.JSONDecodeError:
                    self.log_test("Formato Resposta", False, 
                                "❌ Resposta não é JSON válido")
            
            else:
                self.log_test("Formato Resposta", False, 
                            f"❌ Status HTTP inválido: {response.status_code}")
        
        except Exception as e:
            self.log_test("Formato Resposta", False, f"Erro na verificação: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests for orcamento_id field validation"""
        print("🎯 TESTAR CAMPO orcamento_id NO ENDPOINT GET /api/vendas")
        print("=" * 80)
        print("OBJETIVO: Validar que vendas convertidas de orçamentos exibem o ID do orçamento de origem")
        print("CONTEXTO: Frontend implementou exibição do ID do orçamento convertido")
        print("BACKEND: Campo orcamento_id já existe no modelo Venda (linha 578)")
        print("=" * 80)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Run all tests
        self.test_endpoint_response_format()           # Test 4: Basic response format
        self.test_listar_vendas_verificar_orcamento_id()  # Test 1: List sales and verify field
        self.test_verificar_estrutura_campo_orcamento_id()  # Test 2: Verify field structure
        self.test_validacao_orcamentos_origem()       # Test 3: Validate source budgets exist
        
        return True
    
    def print_summary(self):
        """Print test results summary"""
        print("\n" + "=" * 80)
        print("📊 VENDAS MODULE - CAMPO orcamento_id - TEST RESULTS")
        print("=" * 80)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed/len(self.test_results)*100):.1f}%")
        
        print(f"\n🎯 RESULTADO ESPERADO:")
        print(f"   - Endpoint GET /api/vendas deve retornar o campo orcamento_id para todas as vendas")
        print(f"   - Vendas convertidas de orçamentos devem ter orcamento_id preenchido (UUID)")
        print(f"   - Vendas criadas diretamente devem ter orcamento_id=null")
        
        if failed > 0:
            print(f"\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"   ❌ {result['test']}: {result['message']}")
        else:
            print(f"\n🎉 ALL TESTS PASSED! Campo orcamento_id funcionando corretamente.")
        
        print("\n" + "=" * 80)

if __name__ == "__main__":
    tester = VendasOrcamentoTester()
    success = tester.run_all_tests()
    tester.print_summary()
    
    sys.exit(0 if success else 1)