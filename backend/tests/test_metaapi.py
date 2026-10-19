#!/usr/bin/env python3
"""
MetaAPI Integration and Chat Image Upload Test Suite
Tests the newly implemented MetaAPI features and chat with image functionality.
"""

import asyncio
import httpx
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any

# Backend URL from frontend environment
BACKEND_URL = "https://igris-trading-fix.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@igris.com"
ADMIN_PASSWORD = "admin123"

class MetaAPITester:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.admin_token = None
        self.user_id = None
        self.test_results = []
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
    
    def log_test(self, test_name: str, status: str, details: str = ""):
        """Log test result"""
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status_symbol = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⚠️"
        print(f"{status_symbol} {test_name}: {status}")
        if details:
            print(f"   Details: {details}")
    
    async def authenticate_admin(self) -> bool:
        """Authenticate as admin and get token"""
        try:
            response = await self.client.post(
                f"{BACKEND_URL}/auth/signin",
                json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.user_id = data.get("user", {}).get("id")
                self.log_test("Admin Authentication", "PASS", f"Token obtained, User ID: {self.user_id}")
                return True
            else:
                self.log_test("Admin Authentication", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Admin Authentication", "FAIL", f"Exception: {str(e)}")
            return False
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.admin_token}"}
    
    async def test_metaapi_admin_settings_get(self):
        """Test GET /api/metaapi/admin/settings"""
        print("\n=== Testing MetaAPI Admin Settings GET ===")
        
        try:
            response = await self.client.get(
                f"{BACKEND_URL}/metaapi/admin/settings",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ["api_token", "is_configured"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    is_configured = data.get("is_configured", False)
                    api_token = data.get("api_token", "")
                    
                    self.log_test("MetaAPI Admin Settings GET", "PASS", 
                                f"is_configured: {is_configured}, api_token: {api_token}")
                else:
                    self.log_test("MetaAPI Admin Settings GET", "FAIL", f"Missing fields: {missing_fields}")
                    
            else:
                self.log_test("MetaAPI Admin Settings GET", "FAIL", f"Status: {response.status_code}")
        
        except Exception as e:
            self.log_test("MetaAPI Admin Settings GET", "FAIL", f"Exception: {str(e)}")
    
    async def test_metaapi_admin_settings_post(self):
        """Test POST /api/metaapi/admin/settings"""
        print("\n=== Testing MetaAPI Admin Settings POST ===")
        
        try:
            test_token = "test_token_12345"
            response = await self.client.post(
                f"{BACKEND_URL}/metaapi/admin/settings",
                headers=self.get_auth_headers(),
                json={"api_token": test_token}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                success = data.get("success", False)
                message = data.get("message", "")
                
                if success and "saved successfully" in message:
                    self.log_test("MetaAPI Admin Settings POST", "PASS", f"Settings saved: {message}")
                else:
                    self.log_test("MetaAPI Admin Settings POST", "FAIL", f"Unexpected response: {data}")
            else:
                self.log_test("MetaAPI Admin Settings POST", "FAIL", f"Status: {response.status_code}")
                
        except Exception as e:
            self.log_test("MetaAPI Admin Settings POST", "FAIL", f"Exception: {str(e)}")
    
    async def test_metaapi_status(self):
        """Test GET /api/metaapi/status"""
        print("\n=== Testing MetaAPI Status ===")
        
        try:
            response = await self.client.get(
                f"{BACKEND_URL}/metaapi/status",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ["configured", "message"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if not missing_fields:
                    configured = data.get("configured", False)
                    message = data.get("message", "")
                    
                    self.log_test("MetaAPI Status", "PASS", 
                                f"configured: {configured}, message: {message}")
                else:
                    self.log_test("MetaAPI Status", "FAIL", f"Missing fields: {missing_fields}")
                    
            else:
                self.log_test("MetaAPI Status", "FAIL", f"Status: {response.status_code}")
        
        except Exception as e:
            self.log_test("MetaAPI Status", "FAIL", f"Exception: {str(e)}")
    
    async def test_metaapi_user_accounts(self):
        """Test GET /api/metaapi/accounts"""
        print("\n=== Testing MetaAPI User Accounts ===")
        
        try:
            response = await self.client.get(
                f"{BACKEND_URL}/metaapi/accounts",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Should return accounts array
                if "accounts" in data and isinstance(data["accounts"], list):
                    accounts_count = len(data["accounts"])
                    self.log_test("MetaAPI User Accounts", "PASS", 
                                f"Retrieved {accounts_count} MT5 accounts")
                else:
                    self.log_test("MetaAPI User Accounts", "FAIL", f"Expected accounts array, got: {data}")
                    
            else:
                self.log_test("MetaAPI User Accounts", "FAIL", f"Status: {response.status_code}")
        
        except Exception as e:
            self.log_test("MetaAPI User Accounts", "FAIL", f"Exception: {str(e)}")
    
    async def test_mt5_connect_without_valid_token(self):
        """Test POST /api/metaapi/connect - should fail without valid MetaAPI token"""
        print("\n=== Testing MT5 Connect (Expected to Fail) ===")
        
        try:
            connect_data = {
                "account_name": "Test Account",
                "server": "Demo Server",
                "login": "12345",
                "password": "testpass"
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/metaapi/connect",
                headers=self.get_auth_headers(),
                json=connect_data
            )
            
            if response.status_code == 400:
                data = response.json()
                detail = data.get("detail", "")
                
                if ("MetaAPI not configured" in detail or 
                    "not configured" in detail or 
                    "account access token" in detail):
                    self.log_test("MT5 Connect (Expected Fail)", "PASS", 
                                f"Correctly failed with: {detail}")
                else:
                    self.log_test("MT5 Connect (Expected Fail)", "FAIL", 
                                f"Failed but with unexpected error: {detail}")
            elif response.status_code == 200:
                # This would be unexpected if MetaAPI is not properly configured
                self.log_test("MT5 Connect (Expected Fail)", "WARN", 
                            "Unexpectedly succeeded - MetaAPI might be configured")
            else:
                self.log_test("MT5 Connect (Expected Fail)", "FAIL", 
                            f"Unexpected status code: {response.status_code}")
                
        except Exception as e:
            self.log_test("MT5 Connect (Expected Fail)", "FAIL", f"Exception: {str(e)}")
    
    async def test_chat_with_text_only(self):
        """Test POST /api/settings/chat with text message only"""
        print("\n=== Testing Chat with Text Only ===")
        
        try:
            chat_data = {
                "message": "Hello, what is your name?",
                "image": None
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/settings/chat",
                headers=self.get_auth_headers(),
                json=chat_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                response_text = data.get("response", "")
                source = data.get("source", "")
                
                if response_text and source:
                    self.log_test("Chat with Text Only", "PASS", 
                                f"Response received. Source: {source}, Length: {len(response_text)}")
                else:
                    self.log_test("Chat with Text Only", "FAIL", f"Missing response or source: {data}")
                    
            else:
                self.log_test("Chat with Text Only", "FAIL", f"Status: {response.status_code}")
        
        except Exception as e:
            self.log_test("Chat with Text Only", "FAIL", f"Exception: {str(e)}")
    
    async def test_chat_with_image(self):
        """Test POST /api/settings/chat with image data"""
        print("\n=== Testing Chat with Image ===")
        
        try:
            # Small 1x1 pixel PNG image in base64
            test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            
            chat_data = {
                "message": "",
                "image": test_image
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/settings/chat",
                headers=self.get_auth_headers(),
                json=chat_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                response_text = data.get("response", "")
                source = data.get("source", "")
                
                if response_text and source:
                    self.log_test("Chat with Image", "PASS", 
                                f"Image analysis response received. Source: {source}, Length: {len(response_text)}")
                else:
                    self.log_test("Chat with Image", "FAIL", f"Missing response or source: {data}")
                    
            else:
                self.log_test("Chat with Image", "FAIL", f"Status: {response.status_code}")
        
        except Exception as e:
            self.log_test("Chat with Image", "FAIL", f"Exception: {str(e)}")
    
    async def test_chat_with_both_text_and_image(self):
        """Test POST /api/settings/chat with both text and image"""
        print("\n=== Testing Chat with Text and Image ===")
        
        try:
            # Small 1x1 pixel PNG image in base64
            test_image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
            
            chat_data = {
                "message": "What do you see in this image?",
                "image": test_image
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/settings/chat",
                headers=self.get_auth_headers(),
                json=chat_data
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                response_text = data.get("response", "")
                source = data.get("source", "")
                
                if response_text and source:
                    self.log_test("Chat with Text and Image", "PASS", 
                                f"Combined analysis response received. Source: {source}, Length: {len(response_text)}")
                else:
                    self.log_test("Chat with Text and Image", "FAIL", f"Missing response or source: {data}")
                    
            else:
                self.log_test("Chat with Text and Image", "FAIL", f"Status: {response.status_code}")
        
        except Exception as e:
            self.log_test("Chat with Text and Image", "FAIL", f"Exception: {str(e)}")
    
    async def test_chat_validation_error(self):
        """Test POST /api/settings/chat with no message or image (should fail)"""
        print("\n=== Testing Chat Validation Error ===")
        
        try:
            chat_data = {
                "message": "",
                "image": None
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/settings/chat",
                headers=self.get_auth_headers(),
                json=chat_data
            )
            
            if response.status_code == 400:
                data = response.json()
                detail = data.get("detail", "")
                
                if "Message or image is required" in detail:
                    self.log_test("Chat Validation Error", "PASS", 
                                f"Correctly failed validation: {detail}")
                else:
                    self.log_test("Chat Validation Error", "FAIL", 
                                f"Failed but with unexpected error: {detail}")
            else:
                self.log_test("Chat Validation Error", "FAIL", 
                            f"Expected 400 error, got: {response.status_code}")
        
        except Exception as e:
            self.log_test("Chat Validation Error", "FAIL", f"Exception: {str(e)}")
    
    async def run_all_tests(self):
        """Run all MetaAPI and chat image tests"""
        print(f"🚀 Starting MetaAPI and Chat Image Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Authenticate first
        if not await self.authenticate_admin():
            print("❌ Authentication failed - cannot proceed with tests")
            return
        
        # Run MetaAPI tests
        await self.test_metaapi_admin_settings_get()
        await self.test_metaapi_admin_settings_post()
        await self.test_metaapi_status()
        await self.test_metaapi_user_accounts()
        await self.test_mt5_connect_without_valid_token()
        
        # Run chat with image tests
        await self.test_chat_with_text_only()
        await self.test_chat_with_image()
        await self.test_chat_with_both_text_and_image()
        await self.test_chat_validation_error()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = len([r for r in self.test_results if r["status"] == "PASS"])
        failed = len([r for r in self.test_results if r["status"] == "FAIL"])
        warnings = len([r for r in self.test_results if r["status"] == "WARN"])
        total = len(self.test_results)
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"⚠️  Warnings: {warnings}")
        print(f"📈 Total: {total}")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if result["status"] == "FAIL":
                    print(f"   • {result['test']}: {result['details']}")
        
        if warnings > 0:
            print("\n⚠️  WARNINGS:")
            for result in self.test_results:
                if result["status"] == "WARN":
                    print(f"   • {result['test']}: {result['details']}")
        
        print(f"\n🎯 Success Rate: {(passed/total)*100:.1f}%")
        
        return passed, failed, warnings


async def main():
    """Main test runner"""
    async with MetaAPITester() as tester:
        passed, failed, warnings = await tester.run_all_tests()
        
        # Exit with appropriate code
        if failed > 0:
            sys.exit(1)
        else:
            sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())