# OAuth Testing Guide - Local Development

## Overview

यह guide आपको बताएगी कि local environment में OAuth1 और OAuth2 को कैसे test करें। OAuth providers को publicly accessible callback URL की जरूरत होती है, लेकिन आप localhost पर development कर रहे हैं।

---

## Table of Contents

1. [Problem Statement](#problem-statement)
2. [Solution Options](#solution-options)
3. [Option 1: Using ngrok (Recommended)](#option-1-using-ngrok-recommended)
4. [Option 2: Using localhost.run](#option-2-using-localhostrun)
5. [Option 3: Using Cloudflare Tunnel](#option-3-using-cloudflare-tunnel)
6. [Testing OAuth Flow](#testing-oauth-flow)
7. [Troubleshooting](#troubleshooting)

---

## Problem Statement

**OAuth की Challenge:**

```
User → Your App → OAuth Provider → Callback URL (http://localhost:3000/oauth/callback)
                                    ❌ Provider can't reach localhost
```

OAuth providers (Google, GitHub, Salesforce, etc.) को एक publicly accessible URL चाहिए होता है जहाँ वे authorization code के साथ redirect कर सकें। लेकिन `localhost:3000` publicly accessible नहीं है।

---

## Solution Options

### Quick Comparison

| Tool | Setup Time | Free Tier | Persistence | Best For |
|------|-----------|-----------|------------|----------|
| **ngrok** | 2 mins | ✅ Yes | URL changes | Quick testing |
| **localhost.run** | 30 secs | ✅ Yes | No install | One-time tests |
| **Cloudflare Tunnel** | 5 mins | ✅ Yes | Fixed URL | Long-term dev |

---

## Option 1: Using ngrok (Recommended)

### Step 1: Install ngrok

**macOS:**
```bash
brew install ngrok
```

**Linux:**
```bash
curl -s https://ngrok-agent.s3.amazonaws.com/ngrok.asc | \
  sudo tee /etc/apt/trusted.gpg.d/ngrok.asc >/dev/null && \
  echo "deb https://ngrok-agent.s3.amazonaws.com buster main" | \
  sudo tee /etc/apt/sources.list.d/ngrok.list && \
  sudo apt update && sudo apt install ngrok
```

**Windows:**
```bash
choco install ngrok
```

या direct download करें: https://ngrok.com/download

### Step 2: Sign up और Authentication

1. https://ngrok.com पर signup करें (free)
2. Dashboard से authtoken copy करें
3. Authtoken configure करें:

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

### Step 3: Start Your Server

```bash
# Terminal 1 - Start your Node.js server
node server.js
```

Server `http://localhost:3000` पर run हो रहा है।

### Step 4: Start ngrok

```bash
# Terminal 2 - Start ngrok tunnel
ngrok http 3000
```

**Output:**
```
ngrok

Session Status                online
Account                       YourName (Plan: Free)
Version                       3.5.0
Region                        United States (us)
Latency                       45ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

आपका public URL है: **`https://abc123.ngrok.io`**

### Step 5: Configure OAuth Provider

अब आपको OAuth provider (GitHub, Google, Salesforce etc.) में जाकर callback URL update करना होगा:

**Example - GitHub OAuth App:**

1. GitHub Settings → Developer settings → OAuth Apps
2. Create/Edit OAuth App
3. Set **Authorization callback URL**:
   ```
   https://abc123.ngrok.io/oauth/callback
   ```
4. Note down `Client ID` और `Client Secret`

**Example - Google OAuth:**

1. Google Cloud Console → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID
3. Add **Authorized redirect URIs**:
   ```
   https://abc123.ngrok.io/oauth/callback
   ```

### Step 6: Test OAuth Flow

अब आप OAuth flow test कर सकते हैं:

```bash
# Open browser
https://abc123.ngrok.io
```

1. Navigate to "My Connections" या integration connect page
2. Select OAuth-enabled integration (GitHub, Salesforce)
3. Enter Client ID and Client Secret
4. Click "Connect"
5. आपको OAuth provider के authorization page पर redirect कर दिया जाएगा
6. Authorize करने के बाद callback URL पर redirect होगा

**Server logs में आपको दिखेगा:**
```
🔐 OAuth flow initiated for salesforce
   Redirect URI: https://abc123.ngrok.io/oauth/callback
   Authorization URL: https://login.salesforce.com/services/oauth2/authorize?client_id=...

🔄 Exchanging authorization code for tokens...
   Token URL: https://login.salesforce.com/services/oauth2/token

✅ OAuth tokens received successfully
✅ Connection saved successfully: TvQ0FkpQBKXzfZb8S8wE
```

### Step 7: Monitor Requests (ngrok Web Interface)

ngrok का built-in web interface है जो सारे requests show करता है:

```bash
# Open in browser
http://127.0.0.1:4040
```

यहाँ आप देख सकते हैं:
- सभी incoming requests
- Request/Response headers
- Request body
- Response status codes

### Important Notes for ngrok

⚠️ **Free tier limitations:**
- URL हर restart पर change होता है (`abc123.ngrok.io` → `xyz789.ngrok.io`)
- हर बार OAuth provider में callback URL update करना पड़ेगा
- 2 tunnels की limit (free tier)

💡 **Pro Tip:** Paid ngrok ($8/month) में आपको fixed subdomain मिलता है जो change नहीं होता।

---

## Option 2: Using localhost.run

**सबसे तेज़ option - No installation required!**

### Step 1: Start Your Server

```bash
# Terminal 1
node server.js
```

### Step 2: Create SSH Tunnel

```bash
# Terminal 2
ssh -R 80:localhost:3000 nokey@localhost.run
```

**Output:**
```
Connect to http://abc-def-123.lhr.localhost.run or https://abc-def-123.lhr.localhost.run
```

आपका public URL है: **`https://abc-def-123.lhr.localhost.run`**

### Step 3: Configure OAuth Provider

Same as ngrok - callback URL set करें:
```
https://abc-def-123.lhr.localhost.run/oauth/callback
```

### Important Notes for localhost.run

✅ **Advantages:**
- No installation
- No signup/login required
- Instant setup

⚠️ **Limitations:**
- URL हर बार change होता है
- Performance ngrok से थोड़ा slow हो सकती है
- कभी-कभी unstable हो सकती है

---

## Option 3: Using Cloudflare Tunnel

**Best for long-term development - Fixed URL**

### Step 1: Install cloudflared

**macOS:**
```bash
brew install cloudflared
```

**Linux:**
```bash
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared
```

### Step 2: Authenticate

```bash
cloudflared tunnel login
```

यह browser में Cloudflare login page open करेगा।

### Step 3: Create Tunnel

```bash
# Create a named tunnel
cloudflared tunnel create my-oauth-tunnel

# Note down the Tunnel ID from output
# Example: Created tunnel my-oauth-tunnel with id abc123-def456-ghi789
```

### Step 4: Configure Tunnel

Create config file:

```bash
nano ~/.cloudflared/config.yml
```

Add content:
```yaml
tunnel: abc123-def456-ghi789
credentials-file: /Users/yourusername/.cloudflared/abc123-def456-ghi789.json

ingress:
  - hostname: my-oauth-tunnel.yourdomain.com
    service: http://localhost:3000
  - service: http_status:404
```

### Step 5: Route DNS

```bash
cloudflared tunnel route dns my-oauth-tunnel my-oauth-tunnel.yourdomain.com
```

### Step 6: Run Tunnel

```bash
# Terminal 1 - Your server
node server.js

# Terminal 2 - Cloudflare tunnel
cloudflared tunnel run my-oauth-tunnel
```

### Important Notes for Cloudflare

✅ **Advantages:**
- Fixed URL (doesn't change)
- Very reliable
- Free forever
- Great performance

⚠️ **Limitations:**
- Requires domain name
- More setup time initially

---

## Testing OAuth Flow

### Complete Test Scenario

#### 1. Setup Integration

पहले integration में OAuth configuration add करें:

**File:** `integrations/providers/github/auth.schema.json`

```json
{
  "version": "1.0.0",
  "authMethods": [
    {
      "id": "github_oauth",
      "authType": "oauth2_authorization_code",
      "label": "OAuth 2.0",
      "isDefault": true,
      "priority": 1,
      "config": {
        "authorizationUrl": "https://github.com/login/oauth/authorize",
        "tokenUrl": "https://github.com/login/oauth/access_token",
        "scopes": ["user", "repo"],
        "scopeSeparator": " ",
        "pkceEnabled": false,
        "authMethod": "client_secret_post",
        "tokenRefreshEnabled": false
      },
      "credentials": {
        "clientId": {
          "label": "Client ID",
          "helpText": "Your GitHub OAuth App Client ID"
        },
        "clientSecret": {
          "label": "Client Secret",
          "helpText": "Your GitHub OAuth App Client Secret"
        }
      }
    }
  ]
}
```

#### 2. Create OAuth App on Provider

**GitHub Example:**

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill details:
   - **Application name:** My Integration Platform
   - **Homepage URL:** `https://abc123.ngrok.io`
   - **Authorization callback URL:** `https://abc123.ngrok.io/oauth/callback`
4. Click "Register application"
5. Copy `Client ID` और click "Generate a new client secret"
6. Copy `Client Secret`

#### 3. Test from UI

1. Start server:
   ```bash
   node server.js
   ```

2. Start ngrok:
   ```bash
   ngrok http 3000
   ```

3. Open ngrok URL in browser:
   ```
   https://abc123.ngrok.io
   ```

4. Navigate to **"User Integrations"** → **"Connect Integration"**

5. Select **GitHub**

6. Enter credentials:
   - **Client ID:** `your_github_client_id`
   - **Client Secret:** `your_github_client_secret`

7. Click **"Connect with OAuth"**

8. आपको GitHub के authorization page पर redirect कर दिया जाएगा

9. Click **"Authorize"**

10. आप वापस अपने app पर redirect हो जाओगे `/my-connections` page पर

11. Connection successfully saved!

#### 4. Verify in Console

Server logs में देखें:

```bash
🔐 OAuth flow initiated for github
   Redirect URI: https://abc123.ngrok.io/oauth/callback
   Authorization URL: https://github.com/login/oauth/authorize?client_id=...

🔄 Exchanging authorization code for tokens...
   Token URL: https://github.com/login/oauth/access_token

✅ OAuth tokens received successfully
✅ Connection saved successfully: connection_id_12345
```

---

## Testing Different OAuth Providers

### 1. Google OAuth 2.0

**Setup:**
1. Go to https://console.cloud.google.com
2. Create project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID
4. Add redirect URI: `https://abc123.ngrok.io/oauth/callback`

**Auth Schema:**
```json
{
  "authType": "oauth2_authorization_code",
  "config": {
    "authorizationUrl": "https://accounts.google.com/o/oauth2/v2/auth",
    "tokenUrl": "https://oauth2.googleapis.com/token",
    "scopes": ["openid", "email", "profile"],
    "scopeSeparator": " ",
    "additionalAuthParams": {
      "access_type": "offline",
      "prompt": "consent"
    }
  }
}
```

### 2. Salesforce OAuth 2.0

**Setup:**
1. Salesforce Setup → Apps → App Manager → New Connected App
2. Enable OAuth Settings
3. Callback URL: `https://abc123.ngrok.io/oauth/callback`
4. Selected OAuth Scopes: `api`, `refresh_token`, `offline_access`

**Auth Schema:**
```json
{
  "authType": "oauth2_authorization_code",
  "config": {
    "authorizationUrl": "https://login.salesforce.com/services/oauth2/authorize",
    "tokenUrl": "https://login.salesforce.com/services/oauth2/token",
    "refreshTokenUrl": "https://login.salesforce.com/services/oauth2/token",
    "scopes": ["api", "refresh_token", "offline_access"],
    "scopeSeparator": " ",
    "tokenRefreshEnabled": true
  }
}
```

### 3. Microsoft OAuth 2.0

**Setup:**
1. Azure Portal → App registrations → New registration
2. Redirect URI: `https://abc123.ngrok.io/oauth/callback`

**Auth Schema:**
```json
{
  "authType": "oauth2_authorization_code",
  "config": {
    "authorizationUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    "tokenUrl": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    "scopes": ["openid", "email", "profile"],
    "scopeSeparator": " ",
    "pkceEnabled": true
  }
}
```

---

## API Endpoints for OAuth

### 1. Get OAuth Authorization URL

**Endpoint:** `POST /api/oauth/get-auth-url`

**Request:**
```json
{
  "integrationId": "github",
  "authMethodId": "github_oauth",
  "userId": "user_001",
  "clientId": "your_client_id",
  "clientSecret": "your_client_secret",
  "connectionName": "My GitHub Connection"
}
```

**Response:**
```json
{
  "success": true,
  "authUrl": "https://abc123.ngrok.io/oauth/github/github_oauth/authorize?userId=user_001&clientId=..."
}
```

### 2. OAuth Authorization Initiation

**Endpoint:** `GET /oauth/:integrationId/:authMethodId/authorize`

**Query Parameters:**
- `userId` (required)
- `clientId` (required)
- `clientSecret` (optional)
- `connectionName` (optional)

**Response:** Redirects to OAuth provider

### 3. OAuth Callback

**Endpoint:** `GET /oauth/callback`

**Query Parameters:**
- `code` - Authorization code from provider
- `state` - CSRF token
- `error` - Error code (if auth failed)
- `error_description` - Error description

**Response:** Redirects to `/my-connections` with success/error

---

## Troubleshooting

### Issue 1: "Invalid callback URL" error

**Cause:** OAuth provider में callback URL match नहीं हो रहा

**Solution:**
1. Provider dashboard में जाएं
2. Verify callback URL exactly match करता है:
   - ✅ `https://abc123.ngrok.io/oauth/callback`
   - ❌ `http://abc123.ngrok.io/oauth/callback` (http)
   - ❌ `https://abc123.ngrok.io/oauth/callback/` (trailing slash)

### Issue 2: "State mismatch" error

**Cause:** OAuth state expired या invalid

**Solution:**
- State 10 minutes में expire होता है
- OAuth flow quickly complete करें
- Browser cache clear करें और retry करें

### Issue 3: ngrok URL keeps changing

**Solution:**
- Paid ngrok plan लें ($8/month) - fixed subdomain मिलता है
- या Cloudflare Tunnel use करें (free, fixed URL)

### Issue 4: "Token exchange failed"

**Cause:** Client Secret wrong है या token URL incorrect है

**Solution:**
1. Verify client secret correctly copied है
2. Check token URL in auth.schema.json
3. Server logs में detailed error देखें
4. ngrok web interface (http://127.0.0.1:4040) में request/response inspect करें

### Issue 5: CORS errors

**Cause:** OAuth callback different origin से आ रहा है

**Solution:**
Server.js में CORS properly configured है. अगर issue है तो:

```javascript
// server.js
app.use(cors({
    origin: true,
    credentials: true
}));
```

### Issue 6: Connection saved but tokens not working

**Cause:** Token format या storage issue

**Solution:**
1. Check Elasticsearch में connection saved हुआ या नहीं:
   ```bash
   # Check via API
   curl http://localhost:3000/api/user-integrations/my-connections?userId=user_001
   ```

2. Verify tokens encrypted properly stored हैं

3. Test connection:
   ```bash
   curl -X POST http://localhost:3000/api/user-integrations/{connectionId}/test
   ```

---

## Best Practices

### Security

1. **Never commit Client Secrets:**
   ```bash
   # Add to .gitignore
   .env
   **/auth.schema.json  # if it contains secrets
   ```

2. **Use environment variables:**
   ```javascript
   // server.js
   const clientId = process.env.GITHUB_CLIENT_ID;
   const clientSecret = process.env.GITHUB_CLIENT_SECRET;
   ```

3. **Validate state parameter:**
   - State automatically validated in `/oauth/callback`
   - Expires in 10 minutes
   - Used only once

4. **Use PKCE when possible:**
   ```json
   {
     "config": {
       "pkceEnabled": true
     }
   }
   ```

### Development Workflow

1. **Keep ngrok running in separate terminal:**
   ```bash
   # Terminal 1: Server
   npm run dev

   # Terminal 2: ngrok
   ngrok http 3000
   ```

2. **Save ngrok URL in .env:**
   ```bash
   # .env
   NGROK_URL=https://abc123.ngrok.io
   ```

3. **Use ngrok's fixed domain (paid):**
   ```bash
   ngrok http 3000 --subdomain=myapp
   # URL: https://myapp.ngrok.io (never changes)
   ```

### Testing

1. **Test multiple OAuth providers:**
   - Create test apps for each provider
   - Document Client IDs in README
   - Keep test credentials in password manager

2. **Test error scenarios:**
   - User denies authorization
   - Invalid client credentials
   - Expired authorization codes
   - Network failures

3. **Monitor OAuth flow:**
   - Use ngrok web interface
   - Check server logs
   - Inspect network tab in browser DevTools

---

## Production Deployment

### When deploying to production:

1. **Use your actual domain:**
   ```
   Callback URL: https://yourdomain.com/oauth/callback
   ```

2. **Update OAuth providers:**
   - Add production callback URL
   - Keep dev callback URL for testing

3. **Environment-based config:**
   ```javascript
   // server.js
   const getBaseUrl = (req) => {
       if (process.env.NODE_ENV === 'production') {
           return 'https://yourdomain.com';
       }

       // Dev: Use ngrok URL
       const forwardedHost = req.get('X-Forwarded-Host');
       if (forwardedHost) {
           return `https://${forwardedHost}`;
       }

       return `http://localhost:${PORT}`;
   };
   ```

4. **Use Redis for OAuth state storage:**
   ```javascript
   // Production: Replace in-memory store with Redis
   const redis = require('redis');
   const redisClient = redis.createClient();
   ```

---

## Quick Reference Commands

```bash
# Start server
node server.js

# Start ngrok
ngrok http 3000

# Start localhost.run
ssh -R 80:localhost:3000 nokey@localhost.run

# Start Cloudflare tunnel
cloudflared tunnel run my-oauth-tunnel

# Test OAuth callback locally (mock)
curl "http://localhost:3000/oauth/callback?code=test_code&state=test_state"

# Check ngrok requests
open http://127.0.0.1:4040
```

---

## Summary

अब आप local environment में OAuth test कर सकते हैं! 🎉

**Recommended Approach:**
1. ✅ Development: Use **ngrok** (quick setup)
2. ✅ Long-term dev: Use **Cloudflare Tunnel** (fixed URL)
3. ✅ Production: Use your own domain

Happy OAuth Testing! 🚀
