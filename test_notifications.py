#!/usr/bin/env python3
"""
Test trade webhook and notifications specifically
"""

import asyncio
import httpx
import json

BACKEND_URL = "https://igris-trading-fix.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@igris.com"
ADMIN_PASSWORD = "admin123"

async def test_trade_notifications():
    async with httpx.AsyncClient(timeout=30.0) as client:
        # Authenticate
        auth_response = await client.post(
            f"{BACKEND_URL}/auth/signin",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        
        if auth_response.status_code != 200:
            print(f"❌ Auth failed: {auth_response.status_code}")
            return
        
        auth_data = auth_response.json()
        token = auth_data.get("access_token")
        user_id = auth_data.get("user", {}).get("id")
        headers = {"Authorization": f"Bearer {token}"}
        
        print(f"✅ Authenticated as user: {user_id}")
        
        # Test trade webhook
        trade_data = {
            "symbol": "GBPUSD",
            "type": "SELL",
            "volume": 0.2,
            "open_price": 1.26750
        }
        
        trade_response = await client.post(
            f"{BACKEND_URL}/trades/webhook",
            headers={"X-Api-Key": user_id},
            json=trade_data
        )
        
        if trade_response.status_code == 200:
            trade_result = trade_response.json()
            print(f"✅ Trade created: {trade_result.get('id')}")
            
            # Wait for notification to be created
            await asyncio.sleep(2)
            
            # Check notifications
            notif_response = await client.get(
                f"{BACKEND_URL}/notifications",
                headers=headers
            )
            
            print(f"Notifications response status: {notif_response.status_code}")
            
            if notif_response.status_code == 200:
                notifications = notif_response.json()
                print(f"✅ Retrieved {len(notifications)} notifications")
                
                trade_notifications = [n for n in notifications if n.get("type") == "trade_alert"]
                if trade_notifications:
                    print(f"✅ Found trade notification: {trade_notifications[0].get('title')}")
                else:
                    print("❌ No trade notifications found")
            else:
                print(f"❌ Failed to get notifications: {notif_response.status_code}")
                print(f"Response: {notif_response.text}")
        else:
            print(f"❌ Trade webhook failed: {trade_response.status_code}")
            print(f"Response: {trade_response.text}")

if __name__ == "__main__":
    asyncio.run(test_trade_notifications())