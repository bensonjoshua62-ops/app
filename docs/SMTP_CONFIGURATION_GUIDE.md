# IGRIS SMTP Email Configuration Guide

## Current Issue
The default SMTP provider (`jcelerita.com`) has email deliverability issues due to domain reputation. Emails may not reach recipients' inboxes.

## Solution
Configure a more reliable SMTP provider using the admin dashboard.

---

## Option 1: Gmail (Recommended for Testing)

### Prerequisites
- A Gmail account
- 2-Factor Authentication enabled on your Google account
- An "App Password" generated

### How to Get Gmail App Password
1. Go to https://myaccount.google.com/apppasswords
2. Sign in to your Google account
3. Select "Mail" as the app
4. Select "Other (Custom name)" and enter "IGRIS"
5. Click "Generate"
6. Copy the 16-character password shown

### Configuration
| Field | Value |
|-------|-------|
| SMTP Host | `smtp.gmail.com` |
| SMTP Port | `587` |
| SMTP Username | `your-email@gmail.com` |
| SMTP Password | Your 16-character App Password |
| Sender Email | `your-email@gmail.com` |
| Sender Name | `IGRIS Trading` |
| Use TLS | ✅ Enabled |

---

## Option 2: SendGrid (Recommended for Production)

### Prerequisites
- A SendGrid account (free tier available: 100 emails/day)
- API Key created in SendGrid dashboard

### How to Set Up SendGrid
1. Sign up at https://sendgrid.com
2. Complete email sender verification
3. Go to Settings → API Keys → Create API Key
4. Copy the API key (shown only once!)

### Configuration
| Field | Value |
|-------|-------|
| SMTP Host | `smtp.sendgrid.net` |
| SMTP Port | `587` |
| SMTP Username | `apikey` |
| SMTP Password | Your SendGrid API Key |
| Sender Email | Your verified sender email |
| Sender Name | `IGRIS Trading` |
| Use TLS | ✅ Enabled |

---

## Option 3: Outlook/Office365

### Configuration
| Field | Value |
|-------|-------|
| SMTP Host | `smtp.office365.com` |
| SMTP Port | `587` |
| SMTP Username | `your-email@outlook.com` |
| SMTP Password | Your account password |
| Sender Email | `your-email@outlook.com` |
| Sender Name | `IGRIS Trading` |
| Use TLS | ✅ Enabled |

---

## Option 4: Mailgun (For Developers)

### Configuration
| Field | Value |
|-------|-------|
| SMTP Host | `smtp.mailgun.org` |
| SMTP Port | `587` |
| SMTP Username | From Mailgun dashboard |
| SMTP Password | From Mailgun dashboard |
| Sender Email | Your verified domain sender |
| Sender Name | `IGRIS Trading` |
| Use TLS | ✅ Enabled |

---

## How to Configure in IGRIS

1. **Log in as Admin** (`admin@igris.com`)
2. Navigate to **Email Templates** in the sidebar
3. You'll see the **SMTP Email Configuration** section
4. **Quick Provider Setup**: Click on Gmail, SendGrid, Outlook, Mailgun, or Custom
   - This auto-fills the host and port
5. Fill in your credentials:
   - SMTP Username
   - SMTP Password
   - Sender Email
   - Sender Name
6. Check **"Use TLS"** if using port 587
7. Click **"Save SMTP Settings"**
8. Click **"Test Connection"** to verify

---

## Testing Your Configuration

### Via Dashboard
1. After saving, click **"Test Connection"**
2. Success: "SMTP connection successful"
3. Failure: Check error message and verify credentials

### Via API (Advanced)
```bash
curl -X POST "https://your-domain.com/api/admin/smtp-test-send" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'
```

---

## Troubleshooting

### "Authentication failed"
- Verify username and password
- For Gmail: Use App Password, not regular password
- For SendGrid: Username must be `apikey`

### "Connection refused"
- Check host and port are correct
- Ensure TLS setting matches port (587 = TLS, 465 = SSL)

### "Emails not received"
- Check spam/junk folder
- Verify sender email is valid
- SendGrid: Ensure sender is verified

### "Rate limit exceeded"
- Free tiers have daily limits
- Gmail: ~500/day, SendGrid: ~100/day free
- Upgrade account for higher limits

---

## Provider Comparison

| Provider | Free Tier | Pros | Cons |
|----------|-----------|------|------|
| Gmail | 500/day | Easy setup | Requires App Password |
| SendGrid | 100/day | Best deliverability | Account verification |
| Outlook | 300/day | Microsoft integration | May hit spam filters |
| Mailgun | 5,000/month | Developer friendly | Domain verification needed |

---

## Recommended Setup

**For Testing**: Gmail with App Password
**For Production**: SendGrid with verified domain

---

*Last Updated: January 2025*
*IGRIS Trading Platform - SMTP Configuration Guide v1.0*
