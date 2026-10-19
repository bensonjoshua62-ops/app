#!/usr/bin/env python3
"""
IGRIS Chat Image Upload Feature Test Suite
Tests the newly implemented image upload functionality in the chat system.
"""

import asyncio
import httpx
import json
import base64
import os
from datetime import datetime
from typing import Dict, Any

# Backend URL from frontend environment
BACKEND_URL = "https://igris-trading-fix.preview.emergentagent.com/api"

# Test credentials
ADMIN_EMAIL = "admin@igris.com"
ADMIN_PASSWORD = "admin123"

# Simple 1x1 pixel PNG for testing (base64 encoded)
TEST_IMAGE_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="

class ChatImageTester:
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
    
    async def test_text_only_chat(self):
        """Test 1: Text-only chat (existing functionality)"""
        print("\n=== Test 1: Text-only Chat ===")
        
        try:
            test_message = {"message": "What is Bitcoin?"}
            
            response = await self.client.post(
                f"{BACKEND_URL}/settings/chat",
                headers=self.get_auth_headers(),
                json=test_message
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                response_text = data.get("response", "")
                source = data.get("source", "")
                
                if response_text and source:
                    self.log_test("Text-only Chat", "PASS", 
                                f"Response received. Source: {source}, Length: {len(response_text)} chars")
                else:
                    self.log_test("Text-only Chat", "FAIL", f"Missing response or source fields: {data}")
                    
            else:
                self.log_test("Text-only Chat", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Text-only Chat", "FAIL", f"Exception: {str(e)}")
    
    async def test_chat_with_image(self):
        """Test 2: Chat with image (new feature)"""
        print("\n=== Test 2: Chat with Image ===")
        
        try:
            test_message = {
                "message": "What do you see in this image?",
                "image": TEST_IMAGE_BASE64
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/settings/chat",
                headers=self.get_auth_headers(),
                json=test_message
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                response_text = data.get("response", "")
                source = data.get("source", "")
                
                if response_text and source:
                    self.log_test("Chat with Image", "PASS", 
                                f"Image processed successfully. Source: {source}, Response length: {len(response_text)} chars")
                else:
                    self.log_test("Chat with Image", "FAIL", f"Missing response or source fields: {data}")
                    
            else:
                self.log_test("Chat with Image", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Chat with Image", "FAIL", f"Exception: {str(e)}")
    
    async def test_image_only_chat(self):
        """Test 3: Image-only (no text message)"""
        print("\n=== Test 3: Image-only Chat ===")
        
        try:
            test_message = {
                "message": "",
                "image": TEST_IMAGE_BASE64
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/settings/chat",
                headers=self.get_auth_headers(),
                json=test_message
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                response_text = data.get("response", "")
                source = data.get("source", "")
                
                if response_text and source:
                    self.log_test("Image-only Chat", "PASS", 
                                f"Image-only analysis successful. Source: {source}, Response length: {len(response_text)} chars")
                else:
                    self.log_test("Image-only Chat", "FAIL", f"Missing response or source fields: {data}")
                    
            else:
                self.log_test("Image-only Chat", "FAIL", f"Status: {response.status_code}, Response: {response.text}")
                
        except Exception as e:
            self.log_test("Image-only Chat", "FAIL", f"Exception: {str(e)}")
    
    async def test_error_case_no_input(self):
        """Test 4: Error case - neither message nor image"""
        print("\n=== Test 4: Error Case - No Input ===")
        
        try:
            test_message = {
                "message": "",
                "image": None
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/settings/chat",
                headers=self.get_auth_headers(),
                json=test_message
            )
            
            if response.status_code == 400:
                data = response.json()
                detail = data.get("detail", "")
                
                if "Message or image is required" in detail:
                    self.log_test("Error Case - No Input", "PASS", 
                                f"Correctly returned 400 error: {detail}")
                else:
                    self.log_test("Error Case - No Input", "FAIL", 
                                f"Wrong error message: {detail}")
                    
            else:
                self.log_test("Error Case - No Input", "FAIL", 
                            f"Expected 400 status, got {response.status_code}: {response.text}")
                
        except Exception as e:
            self.log_test("Error Case - No Input", "FAIL", f"Exception: {str(e)}")
    
    async def test_invalid_image_format(self):
        """Test 5: Invalid image format"""
        print("\n=== Test 5: Invalid Image Format ===")
        
        try:
            test_message = {
                "message": "What do you see?",
                "image": "invalid_base64_data"
            }
            
            response = await self.client.post(
                f"{BACKEND_URL}/settings/chat",
                headers=self.get_auth_headers(),
                json=test_message
            )
            
            # Should either return 400 error or handle gracefully with error response
            if response.status_code == 400:
                self.log_test("Invalid Image Format", "PASS", "Correctly rejected invalid image format")
            elif response.status_code == 200:
                data = response.json()
                response_text = data.get("response", "")
                if "error" in response_text.lower() or "invalid" in response_text.lower():
                    self.log_test("Invalid Image Format", "PASS", "Gracefully handled invalid image")
                else:
                    self.log_test("Invalid Image Format", "WARN", "Accepted invalid image without error")
            else:
                self.log_test("Invalid Image Format", "FAIL", f"Unexpected status: {response.status_code}")
                
        except Exception as e:
            self.log_test("Invalid Image Format", "FAIL", f"Exception: {str(e)}")
    
    async def run_all_tests(self):
        """Run all chat image tests"""
        print(f"🚀 Starting IGRIS Chat Image Upload Tests")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        # Authenticate first
        if not await self.authenticate_admin():
            print("❌ Authentication failed - cannot proceed with tests")
            return
        
        # Run all test scenarios
        await self.test_text_only_chat()
        await self.test_chat_with_image()
        await self.test_image_only_chat()
        await self.test_error_case_no_input()
        await self.test_invalid_image_format()
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 CHAT IMAGE TEST SUMMARY")
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
    async with ChatImageTester() as tester:
        passed, failed, warnings = await tester.run_all_tests()
        
        # Exit with appropriate code
        if failed > 0:
            return 1
        else:
            return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)