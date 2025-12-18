#!/usr/bin/env python3
"""
Script de Teste Completo de Autenticação
Testa o fluxo completo de login, criação de usuários, e validação de credenciais
"""

import requests
import json
from datetime import datetime

API_URL = "https://frontend-boost-10.preview.emergentagent.com/api"

class AuthenticationTester:
    def __init__(self):
        self.test_results = []
        self.admin_token = None
        
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
            print(f"   Details: {json.dumps(details, indent=2)}")
    
    def test_admin_login(self):
        """Test 1: Login com credenciais de admin existentes"""
        print("\n=== TEST 1: Admin Login ===")
        
        # Testar credenciais conhecidas
        credentials_to_test = [
            {"email": "edivancelestino@yahoo.com.br", "senha": "123456"},
            {"email": "admin@emilykids.com", "senha": "Admin@123"},
            {"email": "admin@emilyerp.com", "senha": "admin123"}
        ]
        
        for cred in credentials_to_test:
            try:
                response = requests.post(
                    f"{API_URL}/auth/login",
                    json=cred,
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    self.admin_token = data.get("access_token")
                    user = data.get("user", {})
                    
                    self.log_test(
                        "Admin Login",
                        True,
                        f"Login successful with {cred['email']}",
                        {
                            "email": user.get("email"),
                            "nome": user.get("nome"),
                            "papel": user.get("papel"),
                            "role_id": user.get("role_id"),
                            "has_token": bool(self.admin_token)
                        }
                    )
                    return True
                else:
                    print(f"   ⚠ Failed with {cred['email']}: {response.status_code}")
                    
            except Exception as e:
                print(f"   ⚠ Error with {cred['email']}: {str(e)}")
        
        self.log_test(
            "Admin Login",
            False,
            "All admin credentials failed",
            {"tried_credentials": len(credentials_to_test)}
        )
        return False
    
    def test_invalid_credentials(self):
        """Test 2: Login com credenciais inválidas"""
        print("\n=== TEST 2: Invalid Credentials ===")
        
        try:
            response = requests.post(
                f"{API_URL}/auth/login",
                json={"email": "invalid@test.com", "senha": "wrong"},
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_test(
                    "Invalid Credentials",
                    True,
                    "Correctly rejected invalid credentials",
                    {"status_code": response.status_code}
                )
                return True
            else:
                self.log_test(
                    "Invalid Credentials",
                    False,
                    f"Unexpected status code: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Invalid Credentials",
                False,
                f"Error: {str(e)}"
            )
            return False
    
    def test_wrong_password(self):
        """Test 3: Login com email válido mas senha errada"""
        print("\n=== TEST 3: Wrong Password ===")
        
        try:
            response = requests.post(
                f"{API_URL}/auth/login",
                json={"email": "edivancelestino@yahoo.com.br", "senha": "wrongpassword"},
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_test(
                    "Wrong Password",
                    True,
                    "Correctly rejected wrong password",
                    {"status_code": response.status_code}
                )
                return True
            else:
                self.log_test(
                    "Wrong Password",
                    False,
                    f"Unexpected status code: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Wrong Password",
                False,
                f"Error: {str(e)}"
            )
            return False
    
    def test_missing_fields(self):
        """Test 4: Login sem campos obrigatórios"""
        print("\n=== TEST 4: Missing Required Fields ===")
        
        test_cases = [
            {"email": "test@test.com"},  # Missing password
            {"senha": "password"},  # Missing email
            {}  # Missing both
        ]
        
        all_passed = True
        for i, test_case in enumerate(test_cases, 1):
            try:
                response = requests.post(
                    f"{API_URL}/auth/login",
                    json=test_case,
                    timeout=10
                )
                
                if response.status_code in [400, 422]:  # FastAPI validation error
                    print(f"   ✓ Case {i}: Correctly rejected - {response.status_code}")
                else:
                    print(f"   ✗ Case {i}: Unexpected status - {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                print(f"   ✗ Case {i}: Error - {str(e)}")
                all_passed = False
        
        self.log_test(
            "Missing Required Fields",
            all_passed,
            "Validation working correctly" if all_passed else "Some validations failed"
        )
        return all_passed
    
    def test_create_user(self):
        """Test 5: Criar novo usuário"""
        print("\n=== TEST 5: Create New User ===")
        
        if not self.admin_token:
            self.log_test(
                "Create New User",
                False,
                "No admin token available - skipping test"
            )
            return False
        
        new_user = {
            "email": f"test_user_{datetime.now().timestamp()}@test.com",
            "nome": "Test User",
            "senha": "Test@123",
            "papel": "vendedor"
        }
        
        try:
            response = requests.post(
                f"{API_URL}/usuarios",
                json=new_user,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_test(
                    "Create New User",
                    True,
                    "User created successfully",
                    {
                        "user_id": data.get("user_id"),
                        "email": new_user["email"]
                    }
                )
                
                # Test login with new user
                print("   Testing login with new user...")
                login_response = requests.post(
                    f"{API_URL}/auth/login",
                    json={"email": new_user["email"], "senha": new_user["senha"]},
                    timeout=10
                )
                
                if login_response.status_code == 200:
                    print("   ✓ New user can login successfully")
                    return True
                else:
                    print(f"   ✗ New user login failed: {login_response.status_code}")
                    return False
            else:
                self.log_test(
                    "Create New User",
                    False,
                    f"Failed to create user: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Create New User",
                False,
                f"Error: {str(e)}"
            )
            return False
    
    def test_weak_password(self):
        """Test 6: Senha fraca (menos de 6 caracteres)"""
        print("\n=== TEST 6: Weak Password ===")
        
        if not self.admin_token:
            self.log_test(
                "Weak Password",
                False,
                "No admin token available - skipping test"
            )
            return False
        
        weak_user = {
            "email": f"weak_pass_{datetime.now().timestamp()}@test.com",
            "nome": "Weak Password User",
            "senha": "123",  # Less than 6 characters
            "papel": "vendedor"
        }
        
        try:
            response = requests.post(
                f"{API_URL}/usuarios",
                json=weak_user,
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 400:
                self.log_test(
                    "Weak Password",
                    True,
                    "Correctly rejected weak password",
                    {"status_code": response.status_code}
                )
                return True
            else:
                self.log_test(
                    "Weak Password",
                    False,
                    f"Unexpected status code: {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test(
                "Weak Password",
                False,
                f"Error: {str(e)}"
            )
            return False
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("=" * 80)
        print("🔐 AUTHENTICATION TEST SUITE")
        print("=" * 80)
        
        # Run tests
        self.test_admin_login()
        self.test_invalid_credentials()
        self.test_wrong_password()
        self.test_missing_fields()
        self.test_create_user()
        self.test_weak_password()
        
        # Print summary
        print("\n" + "=" * 80)
        print("📊 TEST SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for t in self.test_results if t["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ PASSED: {passed}")
        print(f"❌ FAILED: {failed}")
        print(f"📈 SUCCESS RATE: {(passed / len(self.test_results) * 100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for test in self.test_results:
                if not test["success"]:
                    print(f"   ❌ {test['test']}: {test['message']}")
        
        print("=" * 80)
        
        return passed == len(self.test_results)

if __name__ == "__main__":
    tester = AuthenticationTester()
    success = tester.run_all_tests()
    exit(0 if success else 1)
