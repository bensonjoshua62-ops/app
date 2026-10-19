"""
IGRIS Trading Platform - Backend API Tests
Tests for: Auth, Admin, MetaAPI endpoints
"""
import pytest
import requests
import os
import time
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://igris-trading-fix.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@igris.com"
ADMIN_PASSWORD = "admin123"

class TestHealthAndBasicEndpoints:
    """Basic health and status endpoint tests"""
    
    def test_api_root(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "IGRIS" in data["message"]
        print(f"✓ API root: {data['message']}")
    
    def test_status_endpoint(self):
        """Test status endpoint"""
        response = requests.get(f"{BASE_URL}/api/status")
        assert response.status_code == 200
        print("✓ Status endpoint working")


class TestAuthSignup:
    """User signup flow tests"""
    
    def test_signup_new_user(self):
        """Test new user signup - should require admin approval"""
        test_email = f"test_user_{uuid.uuid4().hex[:8]}@test.com"
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test User",
            "email": test_email,
            "password": "testpass123"
        })
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "approval" in data.get("message", "").lower() or "wait" in data.get("message", "").lower()
        print(f"✓ Signup successful for {test_email}, pending approval")
        return test_email
    
    def test_signup_duplicate_email(self):
        """Test signup with existing email should fail"""
        # First signup
        test_email = f"test_dup_{uuid.uuid4().hex[:8]}@test.com"
        requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test User",
            "email": test_email,
            "password": "testpass123"
        })
        
        # Second signup with same email
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test User 2",
            "email": test_email,
            "password": "testpass456"
        })
        assert response.status_code == 400
        data = response.json()
        assert "already" in data.get("detail", "").lower() or "registered" in data.get("detail", "").lower()
        print(f"✓ Duplicate email correctly rejected")
    
    def test_signup_invalid_email(self):
        """Test signup with invalid email format"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test User",
            "email": "invalid-email",
            "password": "testpass123"
        })
        assert response.status_code == 400 or response.status_code == 422
        print("✓ Invalid email correctly rejected")
    
    def test_signup_short_password(self):
        """Test signup with short password"""
        response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Test User",
            "email": f"test_{uuid.uuid4().hex[:8]}@test.com",
            "password": "123"
        })
        # 400 or 422 are both acceptable for validation errors
        assert response.status_code in [400, 422]
        print("✓ Short password correctly rejected")


class TestAuthSignin:
    """User signin flow tests"""
    
    def test_signin_admin(self):
        """Test admin signin"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["is_admin"] == True
        print(f"✓ Admin signin successful: {data['user']['email']}")
        return data["access_token"]
    
    def test_signin_invalid_credentials(self):
        """Test signin with wrong password"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "email": ADMIN_EMAIL,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials correctly rejected")
    
    def test_signin_nonexistent_user(self):
        """Test signin with non-existent email"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "email": "nonexistent@test.com",
            "password": "testpass123"
        })
        assert response.status_code == 401
        print("✓ Non-existent user correctly rejected")
    
    def test_signin_unapproved_user(self):
        """Test that unapproved users cannot signin"""
        # Create a new user
        test_email = f"test_unapproved_{uuid.uuid4().hex[:8]}@test.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Unapproved User",
            "email": test_email,
            "password": "testpass123"
        })
        assert signup_response.status_code == 200
        
        # Try to signin - should fail with 403
        signin_response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert signin_response.status_code == 403
        data = signin_response.json()
        assert "pending" in data.get("detail", "").lower() or "approval" in data.get("detail", "").lower()
        print(f"✓ Unapproved user correctly blocked from signin")


class TestAdminUserManagement:
    """Admin user management tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.admin_token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_get_all_users(self):
        """Test admin can get all users"""
        response = requests.get(f"{BASE_URL}/api/auth/admin/users", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin can view {len(data)} users")
    
    def test_get_pending_users(self):
        """Test admin can get pending users"""
        response = requests.get(f"{BASE_URL}/api/auth/admin/users/pending", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin can view {len(data)} pending users")
    
    def test_approve_user_flow(self):
        """Test full user approval flow"""
        # 1. Create a new user
        test_email = f"test_approve_{uuid.uuid4().hex[:8]}@test.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Approval Test User",
            "email": test_email,
            "password": "testpass123"
        })
        assert signup_response.status_code == 200
        user_id = signup_response.json()["user"]["id"]
        print(f"  Created user: {test_email} (ID: {user_id})")
        
        # 2. Verify user cannot login (pending approval)
        signin_response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert signin_response.status_code == 403
        print("  Verified: User cannot login before approval")
        
        # 3. Admin approves user
        approve_response = requests.put(
            f"{BASE_URL}/api/auth/admin/users/{user_id}/approve",
            headers=self.headers,
            json={"approved": True}
        )
        assert approve_response.status_code == 200
        print("  Admin approved user")
        
        # 4. Verify user can now login
        signin_response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert signin_response.status_code == 200
        assert "access_token" in signin_response.json()
        print(f"✓ Full approval flow working: {test_email}")
    
    def test_unauthorized_access_to_admin_endpoints(self):
        """Test that non-admin cannot access admin endpoints"""
        # Create and approve a regular user
        test_email = f"test_regular_{uuid.uuid4().hex[:8]}@test.com"
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "name": "Regular User",
            "email": test_email,
            "password": "testpass123"
        })
        user_id = signup_response.json()["user"]["id"]
        
        # Approve the user
        requests.put(
            f"{BASE_URL}/api/auth/admin/users/{user_id}/approve",
            headers=self.headers,
            json={"approved": True}
        )
        
        # Login as regular user
        signin_response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "email": test_email,
            "password": "testpass123"
        })
        regular_token = signin_response.json()["access_token"]
        regular_headers = {"Authorization": f"Bearer {regular_token}"}
        
        # Try to access admin endpoint
        response = requests.get(f"{BASE_URL}/api/auth/admin/users", headers=regular_headers)
        assert response.status_code == 403
        print("✓ Non-admin correctly blocked from admin endpoints")


class TestMetaAPIEndpoints:
    """MetaAPI integration tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for tests"""
        response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        self.admin_token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.admin_token}"}
    
    def test_metaapi_status(self):
        """Test MetaAPI status endpoint"""
        response = requests.get(f"{BASE_URL}/api/metaapi/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "configured" in data
        print(f"✓ MetaAPI status: configured={data['configured']}")
    
    def test_user_balance_endpoint(self):
        """Test user balance endpoint returns cached data"""
        response = requests.get(f"{BASE_URL}/api/metaapi/user/balance", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        # Should have balance fields
        assert "balance" in data or "connected" in data
        print(f"✓ User balance endpoint: connected={data.get('connected', False)}, balance={data.get('balance', 0)}")
    
    def test_copyfactory_status(self):
        """Test CopyFactory status endpoint"""
        response = requests.get(f"{BASE_URL}/api/metaapi/copyfactory/status", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "strategy_configured" in data
        assert "copy_trading_active" in data
        print(f"✓ CopyFactory status: strategy_configured={data['strategy_configured']}, active={data['copy_trading_active']}")
    
    def test_get_user_accounts(self):
        """Test getting user MT5 accounts"""
        response = requests.get(f"{BASE_URL}/api/metaapi/accounts", headers=self.headers)
        assert response.status_code == 200
        data = response.json()
        assert "accounts" in data
        print(f"✓ User accounts: {len(data['accounts'])} accounts found")
    
    def test_lot_size_endpoint(self):
        """Test lot size get/set endpoints"""
        # Get current lot size
        get_response = requests.get(f"{BASE_URL}/api/metaapi/lot-size", headers=self.headers)
        assert get_response.status_code == 200
        current_lot = get_response.json().get("lot_size", 0.01)
        print(f"  Current lot size: {current_lot}")
        
        # Set new lot size
        new_lot = 0.05
        set_response = requests.post(
            f"{BASE_URL}/api/metaapi/lot-size",
            headers=self.headers,
            json={"lot_size": new_lot}
        )
        assert set_response.status_code == 200
        
        # Verify it was set
        verify_response = requests.get(f"{BASE_URL}/api/metaapi/lot-size", headers=self.headers)
        assert verify_response.json()["lot_size"] == new_lot
        print(f"✓ Lot size endpoint working: set to {new_lot}")


class TestSignalsEndpoint:
    """EA Signals endpoint tests"""
    
    def test_get_signals_public(self):
        """Test public signals endpoint"""
        response = requests.get(f"{BASE_URL}/api/signals")
        assert response.status_code == 200
        data = response.json()
        assert "signals" in data
        print(f"✓ Signals endpoint: {len(data['signals'])} signals")


class TestAuthMe:
    """Test /auth/me endpoint"""
    
    def test_get_current_user(self):
        """Test getting current user info"""
        # Login first
        signin_response = requests.post(f"{BASE_URL}/api/auth/signin", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        token = signin_response.json()["access_token"]
        
        # Get current user
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["is_admin"] == True
        print(f"✓ /auth/me endpoint: {data['email']}, admin={data['is_admin']}")
    
    def test_get_current_user_invalid_token(self):
        """Test /auth/me with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )
        assert response.status_code == 401
        print("✓ Invalid token correctly rejected")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
