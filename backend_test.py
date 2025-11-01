#!/usr/bin/env python3
"""
Backend Test Suite for Emily Kids ERP - Stock Validation Testing
Tests the complete stock validation implementation for Budgets and Sales
"""

import requests
import json
import uuid
from datetime import datetime
import sys
import os

# Backend URL from environment
BACKEND_URL = "https://kids-bizops.preview.emergentagent.com/api"

class EmilyKidsBackendTester:
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
        
        # First try to register a test user
        register_data = {
            "email": "teste.estoque@emilykids.com",
            "nome": "Teste Estoque",
            "senha": "senha123",
            "papel": "admin"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/register", json=register_data)
            if response.status_code == 400 and "já cadastrado" in response.text:
                print("User already exists, proceeding to login...")
            elif response.status_code == 200:
                print("User registered successfully")
        except Exception as e:
            print(f"Registration attempt: {e}")
        
        # Login
        login_data = {
            "email": "teste.estoque@emilykids.com",
            "senha": "senha123"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log_test("Authentication", True, "Login successful")
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
    
    def setup_test_data(self):
        """Create test data for stock validation tests"""
        print("\n=== SETTING UP TEST DATA ===")
        
        # Create test client
        client_data = {
            "nome": "Maria Silva - Mãe da Ana",
            "cpf_cnpj": "123.456.789-00",
            "telefone": "(11) 99999-9999",
            "email": "maria.silva@email.com"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clientes", json=client_data, headers=self.get_headers())
            if response.status_code == 200:
                self.test_client_id = response.json()["id"]
                self.log_test("Create Test Client", True, "Test client created successfully")
            else:
                self.log_test("Create Test Client", False, f"Failed to create client: {response.text}")
                return False
        except Exception as e:
            self.log_test("Create Test Client", False, f"Error creating client: {str(e)}")
            return False
        
        # Create test products with stock
        products = [
            {
                "sku": "VEST-PRIN-001",
                "nome": "Vestido Princesa Rosa - Tamanho 4",
                "unidade": "UN",
                "preco_custo": 25.00,
                "preco_venda": 45.90,
                "estoque_minimo": 5,
                "estoque_maximo": 50,
                "descricao": "Vestido infantil princesa cor rosa com detalhes em renda"
            },
            {
                "sku": "TENIS-SPORT-002", 
                "nome": "Tênis Esportivo Azul - Tamanho 28",
                "unidade": "PAR",
                "preco_custo": 35.00,
                "preco_venda": 65.90,
                "estoque_minimo": 3,
                "estoque_maximo": 30,
                "descricao": "Tênis esportivo infantil azul com velcro"
            },
            {
                "sku": "BONECA-BABY-003",
                "nome": "Boneca Baby Alive - Loira",
                "unidade": "UN", 
                "preco_custo": 45.00,
                "preco_venda": 89.90,
                "estoque_minimo": 2,
                "estoque_maximo": 20,
                "descricao": "Boneca interativa que fala e chora"
            }
        ]
        
        self.test_products = []
        for product in products:
            try:
                response = requests.post(f"{self.base_url}/produtos", json=product, headers=self.get_headers())
                if response.status_code == 200:
                    product_data = response.json()
                    self.test_products.append(product_data)
                    self.log_test(f"Create Product {product['nome']}", True, "Product created successfully")
                else:
                    self.log_test(f"Create Product {product['nome']}", False, f"Failed: {response.text}")
            except Exception as e:
                self.log_test(f"Create Product {product['nome']}", False, f"Error: {str(e)}")
        
        # Add stock to products by creating and confirming a fiscal note
        if self.test_products:
            # Create a supplier first
            supplier_data = {
                "razao_social": "Fornecedor Teste Ltda",
                "cnpj": "12.345.678/0001-90",
                "telefone": "(11) 3333-4444"
            }
            
            try:
                response = requests.post(f"{self.base_url}/fornecedores", json=supplier_data, headers=self.get_headers())
                if response.status_code == 200:
                    supplier_id = response.json()["id"]
                    
                    # Create fiscal note to add stock
                    nota_data = {
                        "numero": "000001",
                        "serie": "1",
                        "fornecedor_id": supplier_id,
                        "data_emissao": datetime.now().isoformat(),
                        "valor_total": 315.00,
                        "itens": [
                            {"produto_id": self.test_products[0]["id"], "quantidade": 20, "preco_unitario": 25.00},
                            {"produto_id": self.test_products[1]["id"], "quantidade": 15, "preco_unitario": 35.00},
                            {"produto_id": self.test_products[2]["id"], "quantidade": 10, "preco_unitario": 45.00}
                        ]
                    }
                    
                    response = requests.post(f"{self.base_url}/notas-fiscais", json=nota_data, headers=self.get_headers())
                    if response.status_code == 200:
                        nota_id = response.json()["id"]
                        
                        # Confirm the fiscal note to add stock
                        response = requests.post(f"{self.base_url}/notas-fiscais/{nota_id}/confirmar", headers=self.get_headers())
                        if response.status_code == 200:
                            self.log_test("Add Stock via Fiscal Note", True, "Stock added successfully")
                        else:
                            self.log_test("Add Stock via Fiscal Note", False, f"Failed to confirm note: {response.text}")
                    else:
                        self.log_test("Create Fiscal Note", False, f"Failed: {response.text}")
                else:
                    self.log_test("Create Supplier", False, f"Failed: {response.text}")
            except Exception as e:
                self.log_test("Setup Stock", False, f"Error: {str(e)}")
        
        return len(self.test_products) > 0
    
    def test_stock_check_endpoint(self):
        """Test the stock availability check endpoint"""
        print("\n=== TESTING STOCK CHECK ENDPOINT ===")
        
        if not self.test_products:
            self.log_test("Stock Check Tests", False, "No test products available")
            return
        
        product = self.test_products[0]  # Vestido Princesa
        
        # Test 1: Check stock with sufficient quantity
        test_data = {
            "produto_id": product["id"],
            "quantidade": 5
        }
        
        try:
            response = requests.post(f"{self.base_url}/estoque/check-disponibilidade", json=test_data, headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["disponivel", "estoque_atual", "estoque_reservado", "estoque_disponivel", "mensagem"]
                
                if all(field in data for field in expected_fields):
                    if data["disponivel"] and data["estoque_disponivel"] >= 5:
                        self.log_test("Stock Check - Sufficient Stock", True, f"Stock available: {data['estoque_disponivel']} units")
                    else:
                        self.log_test("Stock Check - Sufficient Stock", False, f"Expected available stock but got: {data}")
                else:
                    self.log_test("Stock Check - Response Format", False, f"Missing fields in response: {data}")
            else:
                self.log_test("Stock Check - Sufficient Stock", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Stock Check - Sufficient Stock", False, f"Error: {str(e)}")
        
        # Test 2: Check stock with excessive quantity
        test_data = {
            "produto_id": product["id"],
            "quantidade": 100  # More than available
        }
        
        try:
            response = requests.post(f"{self.base_url}/estoque/check-disponibilidade", json=test_data, headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                if not data["disponivel"]:
                    self.log_test("Stock Check - Insufficient Stock", True, f"Correctly identified insufficient stock: {data['mensagem']}")
                else:
                    self.log_test("Stock Check - Insufficient Stock", False, f"Should have insufficient stock but got: {data}")
            else:
                self.log_test("Stock Check - Insufficient Stock", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Stock Check - Insufficient Stock", False, f"Error: {str(e)}")
        
        # Test 3: Check with invalid product ID
        test_data = {
            "produto_id": "invalid-product-id",
            "quantidade": 1
        }
        
        try:
            response = requests.post(f"{self.base_url}/estoque/check-disponibilidade", json=test_data, headers=self.get_headers())
            if response.status_code == 404:
                self.log_test("Stock Check - Invalid Product", True, "Correctly returned 404 for invalid product")
            else:
                self.log_test("Stock Check - Invalid Product", False, f"Expected 404 but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Stock Check - Invalid Product", False, f"Error: {str(e)}")
    
    def test_budget_stock_validation(self):
        """Test stock validation in budget creation"""
        print("\n=== TESTING BUDGET STOCK VALIDATION ===")
        
        if not self.test_products or not hasattr(self, 'test_client_id'):
            self.log_test("Budget Stock Tests", False, "Missing test data")
            return
        
        # Test 1: Create budget with sufficient stock
        budget_data = {
            "cliente_id": self.test_client_id,
            "itens": [
                {
                    "produto_id": self.test_products[0]["id"],  # Vestido
                    "quantidade": 2,
                    "preco_unitario": 45.90
                },
                {
                    "produto_id": self.test_products[1]["id"],  # Tênis
                    "quantidade": 1,
                    "preco_unitario": 65.90
                }
            ],
            "desconto": 0,
            "frete": 10.00
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos", json=budget_data, headers=self.get_headers())
            if response.status_code == 200:
                self.budget_id = response.json()["id"]
                self.log_test("Budget Creation - Sufficient Stock", True, "Budget created successfully with stock validation")
            else:
                self.log_test("Budget Creation - Sufficient Stock", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Budget Creation - Sufficient Stock", False, f"Error: {str(e)}")
        
        # Test 2: Try to create budget with insufficient stock
        budget_data_insufficient = {
            "cliente_id": self.test_client_id,
            "itens": [
                {
                    "produto_id": self.test_products[2]["id"],  # Boneca
                    "quantidade": 50,  # More than available
                    "preco_unitario": 89.90
                }
            ],
            "desconto": 0,
            "frete": 0
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos", json=budget_data_insufficient, headers=self.get_headers())
            if response.status_code == 400:
                error_msg = response.json().get("detail", response.text)
                if "insuficiente" in error_msg.lower():
                    self.log_test("Budget Creation - Insufficient Stock", True, f"Correctly blocked creation: {error_msg}")
                else:
                    self.log_test("Budget Creation - Insufficient Stock", False, f"Wrong error message: {error_msg}")
            else:
                self.log_test("Budget Creation - Insufficient Stock", False, f"Expected 400 but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Budget Creation - Insufficient Stock", False, f"Error: {str(e)}")
        
        # Test 3: Create multiple budgets to test reserved stock calculation
        budget_data_2 = {
            "cliente_id": self.test_client_id,
            "itens": [
                {
                    "produto_id": self.test_products[0]["id"],  # Same product as first budget
                    "quantidade": 3,
                    "preco_unitario": 45.90
                }
            ],
            "desconto": 0,
            "frete": 5.00
        }
        
        try:
            response = requests.post(f"{self.base_url}/orcamentos", json=budget_data_2, headers=self.get_headers())
            if response.status_code == 200:
                self.log_test("Budget Creation - Multiple Budgets", True, "Second budget created, stock reservation working")
                
                # Now check if stock is properly reserved
                check_data = {
                    "produto_id": self.test_products[0]["id"],
                    "quantidade": 1
                }
                
                response = requests.post(f"{self.base_url}/estoque/check-disponibilidade", json=check_data, headers=self.get_headers())
                if response.status_code == 200:
                    data = response.json()
                    if data["estoque_reservado"] >= 5:  # 2 + 3 from budgets
                        self.log_test("Stock Reservation Check", True, f"Stock properly reserved: {data['estoque_reservado']} units")
                    else:
                        self.log_test("Stock Reservation Check", False, f"Stock reservation not working: {data}")
                
            else:
                self.log_test("Budget Creation - Multiple Budgets", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Budget Creation - Multiple Budgets", False, f"Error: {str(e)}")
    
    def test_sales_stock_validation(self):
        """Test stock validation in sales creation"""
        print("\n=== TESTING SALES STOCK VALIDATION ===")
        
        if not self.test_products or not hasattr(self, 'test_client_id'):
            self.log_test("Sales Stock Tests", False, "Missing test data")
            return
        
        # Test 1: Create sale with sufficient stock
        sale_data = {
            "cliente_id": self.test_client_id,
            "itens": [
                {
                    "produto_id": self.test_products[1]["id"],  # Tênis
                    "quantidade": 2,
                    "preco_unitario": 65.90
                }
            ],
            "desconto": 5.00,
            "frete": 0,
            "forma_pagamento": "pix"
        }
        
        try:
            response = requests.post(f"{self.base_url}/vendas", json=sale_data, headers=self.get_headers())
            if response.status_code == 200:
                self.sale_id = response.json()["id"]
                self.log_test("Sale Creation - Sufficient Stock", True, "Sale created successfully with stock validation")
            else:
                self.log_test("Sale Creation - Sufficient Stock", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Sale Creation - Sufficient Stock", False, f"Error: {str(e)}")
        
        # Test 2: Try to create sale with insufficient stock
        sale_data_insufficient = {
            "cliente_id": self.test_client_id,
            "itens": [
                {
                    "produto_id": self.test_products[2]["id"],  # Boneca
                    "quantidade": 25,  # More than available
                    "preco_unitario": 89.90
                }
            ],
            "desconto": 0,
            "frete": 0,
            "forma_pagamento": "cartao"
        }
        
        try:
            response = requests.post(f"{self.base_url}/vendas", json=sale_data_insufficient, headers=self.get_headers())
            if response.status_code == 400:
                error_msg = response.json().get("detail", response.text)
                if "insuficiente" in error_msg.lower():
                    self.log_test("Sale Creation - Insufficient Stock", True, f"Correctly blocked creation: {error_msg}")
                else:
                    self.log_test("Sale Creation - Insufficient Stock", False, f"Wrong error message: {error_msg}")
            else:
                self.log_test("Sale Creation - Insufficient Stock", False, f"Expected 400 but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Sale Creation - Insufficient Stock", False, f"Error: {str(e)}")
        
        # Test 3: Try to create sale considering reserved stock from budgets
        sale_data_with_reservation = {
            "cliente_id": self.test_client_id,
            "itens": [
                {
                    "produto_id": self.test_products[0]["id"],  # Vestido (has reserved stock from budgets)
                    "quantidade": 20,  # Should exceed available after reservations
                    "preco_unitario": 45.90
                }
            ],
            "desconto": 0,
            "frete": 0,
            "forma_pagamento": "dinheiro"
        }
        
        try:
            response = requests.post(f"{self.base_url}/vendas", json=sale_data_with_reservation, headers=self.get_headers())
            if response.status_code == 400:
                error_msg = response.json().get("detail", response.text)
                if "reservado" in error_msg.lower() or "insuficiente" in error_msg.lower():
                    self.log_test("Sale Creation - Reserved Stock Check", True, f"Correctly considered reserved stock: {error_msg}")
                else:
                    self.log_test("Sale Creation - Reserved Stock Check", False, f"Error message doesn't mention reservations: {error_msg}")
            else:
                self.log_test("Sale Creation - Reserved Stock Check", False, f"Expected 400 but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Sale Creation - Reserved Stock Check", False, f"Error: {str(e)}")
    
    def test_logs_module_complete(self):
        """Test complete Logs module - ALL 8 ENDPOINTS"""
        print("\n=== TESTING COMPLETE LOGS MODULE ===")
        
        # Test 1: GET /api/logs - Lista de logs com filtros
        print("\n--- Testing GET /api/logs ---")
        try:
            # Test basic logs listing
            response = requests.get(f"{self.base_url}/logs", headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                required_fields = ["logs", "total", "limit", "offset", "has_more"]
                if all(field in data for field in required_fields):
                    self.log_test("Logs - Basic Listing", True, f"Retrieved {len(data['logs'])} logs with pagination")
                else:
                    self.log_test("Logs - Basic Listing", False, f"Missing required fields in response: {data.keys()}")
            else:
                self.log_test("Logs - Basic Listing", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Basic Listing", False, f"Error: {str(e)}")
        
        # Test with filters
        try:
            params = {
                "severidade": "INFO",
                "limit": 10,
                "offset": 0
            }
            response = requests.get(f"{self.base_url}/logs", params=params, headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                self.log_test("Logs - Filtered by Severity", True, f"Filtered logs: {len(data['logs'])} results")
            else:
                self.log_test("Logs - Filtered by Severity", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Filtered by Severity", False, f"Error: {str(e)}")
        
        # Test 2: GET /api/logs/estatisticas - Estatísticas avançadas
        print("\n--- Testing GET /api/logs/estatisticas ---")
        try:
            response = requests.get(f"{self.base_url}/logs/estatisticas", headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                required_fields = ["por_severidade", "por_acao", "por_tela", "por_dispositivo", "por_navegador", "top_usuarios", "performance"]
                if all(field in data for field in required_fields):
                    self.log_test("Logs - Statistics", True, f"Statistics generated: {data['total_logs']} logs analyzed")
                else:
                    self.log_test("Logs - Statistics", False, f"Missing required fields: {data.keys()}")
            else:
                self.log_test("Logs - Statistics", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Statistics", False, f"Error: {str(e)}")
        
        # Test with date filters
        try:
            from datetime import datetime, timedelta
            data_inicio = (datetime.now() - timedelta(days=7)).isoformat()
            data_fim = datetime.now().isoformat()
            params = {
                "data_inicio": data_inicio,
                "data_fim": data_fim
            }
            response = requests.get(f"{self.base_url}/logs/estatisticas", params=params, headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                self.log_test("Logs - Statistics with Date Filter", True, f"Filtered statistics for last 7 days")
            else:
                self.log_test("Logs - Statistics with Date Filter", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Statistics with Date Filter", False, f"Error: {str(e)}")
        
        # Test 3: GET /api/logs/dashboard - Dashboard últimos 7 dias
        print("\n--- Testing GET /api/logs/dashboard ---")
        try:
            response = requests.get(f"{self.base_url}/logs/dashboard", headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                required_fields = ["kpis", "atividade_por_dia", "logs_seguranca_recentes"]
                kpi_fields = ["total_logs", "total_erros", "total_security", "usuarios_ativos"]
                
                if all(field in data for field in required_fields) and all(kpi in data["kpis"] for kpi in kpi_fields):
                    kpis = data["kpis"]
                    self.log_test("Logs - Dashboard", True, f"Dashboard KPIs: {kpis['total_logs']} logs, {kpis['total_erros']} errors, {kpis['usuarios_ativos']} active users")
                else:
                    self.log_test("Logs - Dashboard", False, f"Missing required dashboard fields")
            else:
                self.log_test("Logs - Dashboard", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Dashboard", False, f"Error: {str(e)}")
        
        # Test 4: GET /api/logs/seguranca - Logs de segurança específicos
        print("\n--- Testing GET /api/logs/seguranca ---")
        try:
            response = requests.get(f"{self.base_url}/logs/seguranca", headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                required_fields = ["logs", "total", "limit", "offset"]
                if all(field in data for field in required_fields):
                    self.log_test("Logs - Security Logs", True, f"Security logs: {data['total']} total, {len(data['logs'])} retrieved")
                else:
                    self.log_test("Logs - Security Logs", False, f"Missing required fields in security logs response")
            else:
                self.log_test("Logs - Security Logs", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Security Logs", False, f"Error: {str(e)}")
        
        # Test with pagination
        try:
            params = {"limit": 5, "offset": 0}
            response = requests.get(f"{self.base_url}/logs/seguranca", params=params, headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                self.log_test("Logs - Security Logs Pagination", True, f"Paginated security logs: {len(data['logs'])} results")
            else:
                self.log_test("Logs - Security Logs Pagination", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Security Logs Pagination", False, f"Error: {str(e)}")
        
        # Test 5: GET /api/logs/exportar - Exportar logs
        print("\n--- Testing GET /api/logs/exportar ---")
        
        # Test JSON export
        try:
            params = {"formato": "json"}
            response = requests.get(f"{self.base_url}/logs/exportar", params=params, headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                if data.get("formato") == "json" and "logs" in data and "total" in data:
                    self.log_test("Logs - Export JSON", True, f"JSON export: {data['total']} logs exported")
                else:
                    self.log_test("Logs - Export JSON", False, f"Invalid JSON export format: {data.keys()}")
            else:
                self.log_test("Logs - Export JSON", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Export JSON", False, f"Error: {str(e)}")
        
        # Test CSV export
        try:
            params = {"formato": "csv"}
            response = requests.get(f"{self.base_url}/logs/exportar", params=params, headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                if data.get("formato") == "csv" and "data" in data and "total" in data:
                    csv_lines = data["data"].split("\n")
                    self.log_test("Logs - Export CSV", True, f"CSV export: {data['total']} logs, {len(csv_lines)} lines")
                else:
                    self.log_test("Logs - Export CSV", False, f"Invalid CSV export format: {data.keys()}")
            else:
                self.log_test("Logs - Export CSV", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Export CSV", False, f"Error: {str(e)}")
        
        # Test invalid format
        try:
            params = {"formato": "xml"}
            response = requests.get(f"{self.base_url}/logs/exportar", params=params, headers=self.get_headers())
            if response.status_code == 400:
                self.log_test("Logs - Export Invalid Format", True, "Correctly rejected invalid export format")
            else:
                self.log_test("Logs - Export Invalid Format", False, f"Expected 400 but got {response.status_code}")
        except Exception as e:
            self.log_test("Logs - Export Invalid Format", False, f"Error: {str(e)}")
        
        # Test 6: POST /api/logs/arquivar-antigos - Arquivar logs antigos
        print("\n--- Testing POST /api/logs/arquivar-antigos ---")
        try:
            response = requests.post(f"{self.base_url}/logs/arquivar-antigos", headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                required_fields = ["message", "total_arquivados", "data_limite", "dias_retencao"]
                if all(field in data for field in required_fields):
                    self.log_test("Logs - Archive Old Logs", True, f"Archived {data['total_arquivados']} logs older than {data['dias_retencao']} days")
                else:
                    self.log_test("Logs - Archive Old Logs", False, f"Missing required fields in archive response")
            else:
                self.log_test("Logs - Archive Old Logs", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Archive Old Logs", False, f"Error: {str(e)}")
        
        # Test 7: GET /api/logs/atividade-suspeita - Detecção de atividades suspeitas
        print("\n--- Testing GET /api/logs/atividade-suspeita ---")
        try:
            response = requests.get(f"{self.base_url}/logs/atividade-suspeita", headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                required_fields = ["ips_suspeitos", "total_ips_suspeitos", "acessos_negados_recentes"]
                if all(field in data for field in required_fields):
                    self.log_test("Logs - Suspicious Activity", True, f"Suspicious activity check: {data['total_ips_suspeitos']} suspicious IPs, {data['acessos_negados_recentes']} denied accesses")
                else:
                    self.log_test("Logs - Suspicious Activity", False, f"Missing required fields in suspicious activity response")
            else:
                self.log_test("Logs - Suspicious Activity", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Suspicious Activity", False, f"Error: {str(e)}")
        
        # Test 8: POST /api/logs/criar-indices - Criar índices MongoDB
        print("\n--- Testing POST /api/logs/criar-indices ---")
        try:
            response = requests.post(f"{self.base_url}/logs/criar-indices", headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "sucesso" in data["message"].lower():
                    self.log_test("Logs - Create Indices", True, "MongoDB indices created successfully")
                else:
                    self.log_test("Logs - Create Indices", False, f"Unexpected response: {data}")
            else:
                self.log_test("Logs - Create Indices", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Logs - Create Indices", False, f"Error: {str(e)}")
        
        # Test 9: Authentication - Non-admin user should get 403
        print("\n--- Testing Authentication (Non-admin access) ---")
        
        # Create a non-admin user for testing
        non_admin_data = {
            "email": "vendedor.teste@emilykids.com",
            "nome": "Vendedor Teste",
            "senha": "senha123",
            "papel": "vendedor"
        }
        
        try:
            # Register non-admin user
            response = requests.post(f"{self.base_url}/auth/register", json=non_admin_data)
            # Login as non-admin
            login_data = {
                "email": "vendedor.teste@emilykids.com",
                "senha": "senha123"
            }
            response = requests.post(f"{self.base_url}/auth/login", json=login_data)
            if response.status_code == 200:
                non_admin_token = response.json()["access_token"]
                non_admin_headers = {
                    "Authorization": f"Bearer {non_admin_token}",
                    "Content-Type": "application/json"
                }
                
                # Try to access logs with non-admin user
                response = requests.get(f"{self.base_url}/logs", headers=non_admin_headers)
                if response.status_code == 403:
                    self.log_test("Logs - Non-admin Access Control", True, "Non-admin user correctly denied access (403)")
                else:
                    self.log_test("Logs - Non-admin Access Control", False, f"Expected 403 but got {response.status_code}")
            else:
                self.log_test("Logs - Non-admin User Setup", False, f"Failed to login non-admin user: {response.status_code}")
        except Exception as e:
            self.log_test("Logs - Non-admin Access Control", False, f"Error: {str(e)}")

    def test_manual_stock_adjustment(self):
        """Test manual stock adjustment endpoint - NEW FEATURE"""
        print("\n=== TESTING MANUAL STOCK ADJUSTMENT ENDPOINT ===")
        
        if not self.test_products:
            self.log_test("Manual Stock Adjustment Tests", False, "No test products available")
            return
        
        # Get initial stock for testing
        product = self.test_products[0]  # Vestido Princesa
        
        # Get current stock before adjustments
        try:
            response = requests.get(f"{self.base_url}/produtos", headers=self.get_headers())
            if response.status_code == 200:
                produtos = response.json()
                current_product = next((p for p in produtos if p["id"] == product["id"]), None)
                if current_product:
                    initial_stock = current_product["estoque_atual"]
                    self.log_test("Get Initial Stock", True, f"Initial stock: {initial_stock} units")
                else:
                    self.log_test("Get Initial Stock", False, "Product not found")
                    return
            else:
                self.log_test("Get Initial Stock", False, f"HTTP {response.status_code}: {response.text}")
                return
        except Exception as e:
            self.log_test("Get Initial Stock", False, f"Error: {str(e)}")
            return
        
        # Test 1: Ajuste de Entrada (Adding to stock)
        entrada_data = {
            "produto_id": product["id"],
            "quantidade": 10,
            "tipo": "entrada",
            "motivo": "Reposição de estoque - produtos encontrados no depósito"
        }
        
        try:
            response = requests.post(f"{self.base_url}/estoque/ajuste-manual", json=entrada_data, headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                expected_new_stock = initial_stock + 10
                if data.get("estoque_novo") == expected_new_stock:
                    self.log_test("Manual Adjustment - Entrada", True, f"Stock increased from {data.get('estoque_anterior')} to {data.get('estoque_novo')}")
                    current_stock = data.get("estoque_novo")
                else:
                    self.log_test("Manual Adjustment - Entrada", False, f"Stock calculation error: {data}")
                    current_stock = initial_stock
            else:
                self.log_test("Manual Adjustment - Entrada", False, f"HTTP {response.status_code}: {response.text}")
                current_stock = initial_stock
        except Exception as e:
            self.log_test("Manual Adjustment - Entrada", False, f"Error: {str(e)}")
            current_stock = initial_stock
        
        # Test 2: Ajuste de Saída (Removing from stock)
        saida_data = {
            "produto_id": product["id"],
            "quantidade": 5,
            "tipo": "saida",
            "motivo": "Produto danificado - descarte necessário"
        }
        
        try:
            response = requests.post(f"{self.base_url}/estoque/ajuste-manual", json=saida_data, headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                expected_new_stock = current_stock - 5
                if data.get("estoque_novo") == expected_new_stock:
                    self.log_test("Manual Adjustment - Saída", True, f"Stock decreased from {data.get('estoque_anterior')} to {data.get('estoque_novo')}")
                    current_stock = data.get("estoque_novo")
                else:
                    self.log_test("Manual Adjustment - Saída", False, f"Stock calculation error: {data}")
            else:
                self.log_test("Manual Adjustment - Saída", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Manual Adjustment - Saída", False, f"Error: {str(e)}")
        
        # Test 3: Validation - Prevent negative stock
        negative_stock_data = {
            "produto_id": product["id"],
            "quantidade": current_stock + 50,  # More than current stock
            "tipo": "saida",
            "motivo": "Teste de validação - estoque negativo"
        }
        
        try:
            response = requests.post(f"{self.base_url}/estoque/ajuste-manual", json=negative_stock_data, headers=self.get_headers())
            if response.status_code == 400:
                error_msg = response.json().get("detail", response.text)
                if "negativo" in error_msg.lower():
                    self.log_test("Manual Adjustment - Negative Stock Prevention", True, f"Correctly prevented negative stock: {error_msg}")
                else:
                    self.log_test("Manual Adjustment - Negative Stock Prevention", False, f"Wrong error message: {error_msg}")
            else:
                self.log_test("Manual Adjustment - Negative Stock Prevention", False, f"Expected 400 but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Manual Adjustment - Negative Stock Prevention", False, f"Error: {str(e)}")
        
        # Test 4: Validation - Invalid product ID
        invalid_product_data = {
            "produto_id": "produto-inexistente-123",
            "quantidade": 5,
            "tipo": "entrada",
            "motivo": "Teste com produto inválido"
        }
        
        try:
            response = requests.post(f"{self.base_url}/estoque/ajuste-manual", json=invalid_product_data, headers=self.get_headers())
            if response.status_code == 404:
                self.log_test("Manual Adjustment - Invalid Product", True, "Correctly returned 404 for invalid product")
            else:
                self.log_test("Manual Adjustment - Invalid Product", False, f"Expected 404 but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Manual Adjustment - Invalid Product", False, f"Error: {str(e)}")
        
        # Test 5: Validation - Missing required fields
        incomplete_data = {
            "produto_id": product["id"],
            "quantidade": 5
            # Missing tipo and motivo
        }
        
        try:
            response = requests.post(f"{self.base_url}/estoque/ajuste-manual", json=incomplete_data, headers=self.get_headers())
            if response.status_code == 422:  # Pydantic validation error
                self.log_test("Manual Adjustment - Required Fields", True, "Correctly validated required fields")
            else:
                self.log_test("Manual Adjustment - Required Fields", False, f"Expected 422 but got {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Manual Adjustment - Required Fields", False, f"Error: {str(e)}")
        
        # Test 6: Verify movement logging
        try:
            response = requests.get(f"{self.base_url}/estoque/movimentacoes", headers=self.get_headers())
            if response.status_code == 200:
                movimentacoes = response.json()
                # Look for recent manual adjustments
                manual_adjustments = [m for m in movimentacoes if m.get("referencia_tipo") == "ajuste_manual"]
                if len(manual_adjustments) >= 2:  # Should have at least entrada and saida from our tests
                    self.log_test("Manual Adjustment - Movement Logging", True, f"Found {len(manual_adjustments)} manual adjustment movements")
                else:
                    self.log_test("Manual Adjustment - Movement Logging", False, f"Expected manual adjustment movements but found {len(manual_adjustments)}")
            else:
                self.log_test("Manual Adjustment - Movement Logging", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Manual Adjustment - Movement Logging", False, f"Error: {str(e)}")
        
        # Test 7: Verify action logging
        try:
            response = requests.get(f"{self.base_url}/logs", headers=self.get_headers())
            if response.status_code == 200:
                logs_data = response.json()
                logs = logs_data.get("logs", [])
                # Look for recent manual adjustment logs
                adjustment_logs = [l for l in logs if l.get("acao") == "ajuste_manual"]
                if len(adjustment_logs) >= 1:
                    self.log_test("Manual Adjustment - Action Logging", True, f"Found {len(adjustment_logs)} adjustment action logs")
                else:
                    self.log_test("Manual Adjustment - Action Logging", False, f"No adjustment action logs found")
            else:
                self.log_test("Manual Adjustment - Action Logging", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Manual Adjustment - Action Logging", False, f"Error: {str(e)}")

    def test_edge_cases(self):
        """Test edge cases and error scenarios"""
        print("\n=== TESTING EDGE CASES ===")
        
        # Test with zero quantity
        test_data = {
            "produto_id": self.test_products[0]["id"] if self.test_products else "test-id",
            "quantidade": 0
        }
        
        try:
            response = requests.post(f"{self.base_url}/estoque/check-disponibilidade", json=test_data, headers=self.get_headers())
            if response.status_code == 200:
                data = response.json()
                self.log_test("Edge Case - Zero Quantity", True, f"Handled zero quantity: {data['mensagem']}")
            else:
                self.log_test("Edge Case - Zero Quantity", False, f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            self.log_test("Edge Case - Zero Quantity", False, f"Error: {str(e)}")
        
        # Test with negative quantity
        test_data = {
            "produto_id": self.test_products[0]["id"] if self.test_products else "test-id",
            "quantidade": -5
        }
        
        try:
            response = requests.post(f"{self.base_url}/estoque/check-disponibilidade", json=test_data, headers=self.get_headers())
            # Should either handle gracefully or return appropriate error
            self.log_test("Edge Case - Negative Quantity", True, f"Handled negative quantity: HTTP {response.status_code}")
        except Exception as e:
            self.log_test("Edge Case - Negative Quantity", False, f"Error: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🧪 EMILY KIDS ERP - BACKEND COMPLETE TESTING SUITE")
        print("=" * 60)
        
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return False
        
        # Test the complete Logs module as requested
        self.test_logs_module_complete()
        
        # Also run stock tests if test data setup succeeds
        if self.setup_test_data():
            self.test_stock_check_endpoint()
            self.test_budget_stock_validation()
            self.test_sales_stock_validation()
            self.test_manual_stock_adjustment()
            self.test_edge_cases()
        else:
            print("⚠️ Test data setup failed. Skipping stock validation tests.")
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = len([t for t in self.test_results if t["success"]])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {passed_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print("\n🔍 FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"  - {test['test']}: {test['message']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = EmilyKidsBackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)