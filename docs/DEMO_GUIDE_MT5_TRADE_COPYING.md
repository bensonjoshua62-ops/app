# IGRIS MT5 Connection & Trade Copying Demo Guide

## Overview
This comprehensive guide demonstrates how to connect your MT5 account to IGRIS and set up automatic trade copying via CopyFactory.

---

## Part 1: Prerequisites

Before starting, ensure you have:
- ✅ An approved IGRIS account
- ✅ An MT5 trading account (Exness, JustMarkets, or other supported brokers)
- ✅ Your MT5 login credentials (account number, password, server name)

---

## Part 2: Connecting Your MT5 Account

### Step 1: Navigate to MT5 Section
1. Log in to your IGRIS dashboard
2. Click **"MT5"** in the sidebar menu
3. You'll see the MT5 Account Management page

### Step 2: Connect MT5 Account
1. Click the **"Connect MT5 Account"** button
2. Fill in your MT5 credentials:
   - **Login**: Your MT5 account number (e.g., `2002791386`)
   - **Password**: Your MT5 investor or main password
   - **Server**: Your broker's MT5 server (e.g., `JustMarkets-Live`, `Exness-MT5Real10`)
3. Click **"Connect"**

### Step 3: Verify Connection
- ✅ Success message appears: "MT5 account connected successfully!"
- ✅ Your account balance and equity are displayed
- ✅ Account appears in the "Connected Accounts" list

---

## Part 3: Automatic Subscriber Setup

### How CopyFactory Works
When you connect an MT5 account to IGRIS:
1. **Automatic Subscriber Creation**: Your account is automatically registered as a CopyFactory subscriber
2. **Strategy Subscription**: Your account subscribes to the master trading strategy
3. **Lot Size Configuration**: Your preferred lot size is applied

### Setting Your Lot Size
1. Navigate to **Settings** in the sidebar
2. Find the **"Trading Lot Size"** section
3. Choose a preset (0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1.0) or enter a custom value
4. Click **"Save Lot Size"**

**Important**: This lot size will be used for all copied trades on your subscriber account.

---

## Part 4: Understanding Trade Copying

### The Flow
```
Provider/Master Account → Executes Trade
        ↓
    CopyFactory → Detects Trade
        ↓
Your Subscriber Account → Receives Copied Trade (with your lot size)
```

### What Gets Copied
- ✅ Buy/Sell orders
- ✅ Entry price (market price at execution)
- ✅ Stop Loss and Take Profit levels
- ✅ Trade modifications and closures

### What's Customizable
- 📊 Your own lot size (independent of master)
- 🛡️ Risk management settings

---

## Part 5: Monitoring Your Trades

### Dashboard Overview
The **Home** tab shows:
- 💰 MT5 Balance & Equity
- 📈 Open Positions (real-time)
- 📊 AI Signal status
- 🛡️ Risk Management level

### Open Positions
- View all currently open trades
- See symbol, volume, entry price
- Monitor profit/loss in real-time

### Trade History
Navigate to **MT5 Trades** (admin section) to see:
- Historical trades
- Copied trade records
- Performance metrics

---

## Part 6: Receiving Trade Signals

### EA Signals Webhook
IGRIS can receive signals from MetaTrader Expert Advisors:

1. **Webhook URL**: `https://your-domain.com/api/signals/webhook`
2. **API Key**: Found in the EA Signals section (when no signals exist)

### Signal Format
```json
{
  "symbol": "XAUUSD",
  "action": "BUY",
  "entry_price": 2050.00,
  "stop_loss": 2040.00,
  "take_profit": 2070.00
}
```

### Signal Flow
```
EA Signal → IGRIS Webhook → Master Account → Your Subscriber Account
```

---

## Part 7: Troubleshooting

### "Invalid credentials" Error
- Verify your MT5 login number
- Check password (investor password works)
- Confirm server name exactly as shown in MT5

### Account Shows "Disconnected"
- Check your MT5 platform is online
- Verify account isn't disabled
- Try reconnecting the account

### Trades Not Copying
- Ensure your lot size is set
- Verify subscriber status is active
- Check master account has active positions

### Balance Shows $0
- Connection may be initializing
- Refresh the page after 30 seconds
- Try disconnecting and reconnecting

---

## Part 8: Best Practices

### Risk Management
- 🎯 Start with small lot sizes (0.01)
- 📊 Monitor open positions regularly
- 🛡️ Set appropriate risk level in Settings

### Account Management
- ✅ Keep only necessary accounts connected
- 📱 Enable notifications for trade alerts
- 🔄 Regularly check trade history

---

## Quick Reference

| Feature | Location |
|---------|----------|
| Connect MT5 | MT5 → Connect Account |
| Set Lot Size | Settings → Trading Lot Size |
| View Positions | Home → Open Positions |
| Trade History | MT5 Trades (Admin) |
| EA Signals | EA Signals → Setup |

---

## Support

If you encounter issues:
1. Check the **Support** section in the dashboard
2. Contact admin via the support form
3. Review this guide for common solutions

---

*Last Updated: January 2025*
*IGRIS Trading Platform - MT5 & Trade Copying Guide v1.0*
