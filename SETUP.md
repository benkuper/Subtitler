# Outdoor Subtitles: Complete Setup & Deployment Guide

## Project Structure

```
outdoor-subtitles/
├── relay-server/
│   ├── package.json
│   └── server.js
└── frontend/
    ├── package.json
    ├── index.html
    └── src/
        ├── main.js
        └── App.svelte
```

---

## Part 1: PartyKit Edge Relay Server Setup

### 1.1 Initialize PartyKit Relay Environment

From your project root (`outdoor-subtitles/`), run these commands to set up the relay server:

```bash
cd relay-server
npm install
```

This installs PartyKit and dependencies defined in `package.json`.

### 1.2 Test the Relay Locally (Development)

Before deploying to production, test the relay server locally:

```bash
npm run dev
```

Expected output:
```
PartyKit Dev Server
Listening on http://localhost:1999
Room URL: http://localhost:1999/parties/main/main-stage
```

Leave this running in a terminal window. Your local relay is now accessible at:
```
ws://localhost:1999/parties/main/main-stage
```

**Note:** For local frontend testing, modify `frontend/src/App.svelte` line 14 to use:
```javascript
const relayHost = 'localhost:1999'
```

Then stop the server and proceed to production deployment.

### 1.3 Deploy Relay to PartyKit Edge (Production)

Once tested, deploy the relay to Cloudflare's edge network:

```bash
npm run deploy
```

Or explicitly:

```bash
npx partykit deploy --name subtitle-relay
```

**Output you will see:**
```
✓ Deployed to https://subtitle-relay.YOUR-PARTYKIT-USERNAME.partykit.dev
```

**IMPORTANT:** Save this URL. Replace `YOUR-PARTYKIT-USERNAME` with your actual username everywhere in the frontend code and Chataigne configs.

### 1.4 Verify Relay is Running

Test the deployed relay with curl:

```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  https://subtitle-relay.YOUR-PARTYKIT-USERNAME.partykit.dev/parties/main/main-stage
```

You should receive a WebSocket upgrade response (101 status code).

---

## Part 2: Svelte 5 Mobile Frontend Setup

### 2.1 Initialize Svelte Frontend with Vite

From your project root (`outdoor-subtitles/`), step out of the relay directory:

```bash
cd ..
cd frontend
npm install
```

This installs Svelte 5, Vite, PartySocket, and all dependencies.

### 2.2 Update PartyKit Hostname in Frontend

The frontend is pre-configured with a placeholder hostname. You must update it with your actual PartyKit deployment:

**File:** `frontend/src/App.svelte` (line 14)

Find:
```javascript
const relayHost = 'subtitle-relay.your-username.partykit.dev'
```

Replace `your-username` with your actual PartyKit username from Step 1.3.

**Example:**
```javascript
const relayHost = 'subtitle-relay.alice.partykit.dev'
```

### 2.3 Test Frontend Locally (Development)

Start the local Vite dev server:

```bash
npm run dev
```

Expected output:
```
Local:   http://localhost:5173
```

Open `http://localhost:5173` in your browser. You should see:
- **Black background** with white text area
- **Status bar** at top showing "Reconnexion..." (red dot) until WebSocket connects
- **Subtitle area** centered and ready to display messages

**Note:** If the relay is running locally (from Part 1.2), the status should turn green once connected.

### 2.4 Build Frontend for Production

Create an optimized production build:

```bash
npm run build
```

This generates minified files in the `dist/` folder suitable for CDN deployment.

Output:
```
dist/
├── index.html
├── assets/
│   ├── App.svelte-*.js
│   └── style-*.css
```

### 2.5 Deploy Frontend to Production

Choose one deployment method:

#### Option A: Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel --prod
```

Follow prompts. Your frontend will be live at `https://your-project.vercel.app`.

#### Option B: Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

#### Option C: Deploy to a Static Web Server

Copy the `dist/` folder to your web server:

```bash
scp -r dist/ user@your-server.com:/var/www/outdoor-subtitles/
```

Then access via `https://your-server.com/outdoor-subtitles/`.

### 2.6 Generate QR Code for Mobile Access

Once the frontend is deployed (e.g., at `https://outdoor-subtitles.example.com`), generate a QR code pointing to this URL:

**Using curl and a QR service:**
```bash
curl "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://outdoor-subtitles.example.com" \
  -o outdoor-subtitles-qr.png
```

Print this QR code and display it on-site. Visitors scan it to access the subtitle display.

---

## Part 3: End-to-End Integration Test

Before the live show, verify the complete system:

### 3.1 Prerequisites

- [ ] PartyKit relay deployed and URL saved
- [ ] Frontend deployed and accessible
- [ ] Chataigne WebSocket Client module configured (see `CHATAIGNE_SETUP.md`)
- [ ] Internet connectivity on both site control machine and mobile device

### 3.2 Test Steps

1. **Open Chataigne** on your site control machine.
2. **Verify WebSocket module** shows "Connected" status to PartyKit relay.
3. **Open mobile browser** and navigate to the frontend URL (or scan QR code).
4. **Observe status bar** turns green ("Synchronisé") when connected.
5. **Send test subtitle** from Chataigne:
   ```
   Action: SubtitleRelay.CustomSend
   Payload: {"text": "SYSTEM TEST - Connection working!"}
   ```
6. **Verify text appears** on mobile screen within 100ms.
7. **Test multiple subtitles** in rapid succession to verify broadcast stability.
8. **Disconnect Chataigne** and confirm status bar turns red ("Reconnexion...").
9. **Reconnect Chataigne** and confirm status recovers.

### 3.3 Network Performance Validation

For optimal live show experience:

```bash
# Test latency from site control to PartyKit
ping substring-relay.YOUR-PARTYKIT-USERNAME.partykit.dev

# On mobile, test latency to relay
ping subtitle-relay.YOUR-PARTYKIT-USERNAME.partykit.dev
```

**Target latency:** <200ms round-trip each direction.

---

## Part 4: Live Show Operations

### 4.1 Pre-Show Checklist (30 minutes before)

- [ ] Chataigne running on site control machine
- [ ] WebSocket module connected to PartyKit relay
- [ ] Mobile test device on cellular network (not WiFi) for realistic testing
- [ ] Frontend status bar shows green ("Synchronisé")
- [ ] Send final test subtitle and confirm appearance
- [ ] Backup subtitle text file prepared in case of system failure
- [ ] Network monitoring: Keep an eye on connection status in Chataigne

### 4.2 During Show

- Monitor Chataigne's WebSocket module status icon.
- If connection drops, the mobile status bar automatically turns red; Chataigne auto-reconnects.
- Send subtitles as needed via timeline triggers or manual Custom Send actions.
- Latency from Chataigne trigger → mobile display is typically <200ms.

### 4.3 Post-Show

- Archive show log from Chataigne for review.
- Shutdown sequence:
  ```bash
  # Terminal 1 (if running dev relay)
  Ctrl+C

  # Terminal 2 (if running dev frontend)
  Ctrl+C
  ```

---

## Troubleshooting

### Frontend shows "Reconnexion..." (red dot) and never connects

**Cause:** Relay hostname is incorrect or relay is not deployed.

**Fix:**
1. Verify PartyKit deployment:
   ```bash
   npx partykit list
   ```
2. Check that `frontend/src/App.svelte` line 14 has the correct hostname.
3. Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R).
4. Open browser DevTools Console (F12) and look for connection errors.

### Chataigne WebSocket module shows disconnected

**Cause:** URL malformed or network firewall blocking port 443.

**Fix:**
1. Verify URL format:
   ```
   wss://subtitle-relay.YOUR-PARTYKIT-USERNAME.partykit.dev/parties/main/main-stage
   ```
2. Test connectivity:
   ```bash
   curl -v https://subtitle-relay.YOUR-PARTYKIT-USERNAME.partykit.dev/parties/main/main-stage
   ```
3. If using corporate/venue WiFi, ensure port 443 (WSS) is not blocked.

### Subtitles appear but with 5+ second delay

**Cause:** Network congestion or cellular tower handover.

**Fix:**
- PartyKit handles this transparently; latency usually recovers within 100ms.
- Test on multiple cellular networks if possible.
- Move mobile device closer to cellular tower if signal is weak.

### Build error: "PartySocket module not found"

**Cause:** Dependencies not installed.

**Fix:**
```bash
cd frontend
npm install
```

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     CHATAIGNE (Local)                        │
│              WebSocket Client Module                         │
│         Pushes {"text": "subtitle"} via WSS                  │
└──────────────────────────┬──────────────────────────────────┘
                           │ uplink (site ISP or cellular modem)
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   PartyKit (Cloudflare Edge)                 │
│              room: main-stage                                │
│      Broadcasts to all connected clients except sender       │
└──────────────────────────┬──────────────────────────────────┘
                           │ downlink to each mobile client
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│   Mobile 1       │ │   Mobile 2       │ │   Mobile 3       │
│  (4G/5G Client)  │ │  (4G/5G Client)  │ │  (4G/5G Client)  │
│  Svelte Frontend │ │  Svelte Frontend │ │  Svelte Frontend │
│  Displays text   │ │  Displays text   │ │  Displays text   │
└──────────────────┘ └──────────────────┘ └──────────────────┘
```

---

## Key Commands Reference

| Task | Command |
|------|---------|
| Deploy relay | `cd relay-server && npm run deploy` |
| Test relay locally | `cd relay-server && npm run dev` |
| Build frontend | `cd frontend && npm run build` |
| Test frontend locally | `cd frontend && npm run dev` |
| Deploy frontend to Vercel | `vercel --prod` |
| List deployed relays | `npx partykit list` |
| Test relay connectivity | `curl -v https://subtitle-relay.YOUR-USERNAME.partykit.dev/parties/main/main-stage` |

---

## Additional Resources

- **PartyKit Docs:** https://docs.partykit.io/
- **Svelte 5 Docs:** https://svelte.dev/docs
- **Vite Documentation:** https://vitejs.dev/
- **PartySocket Library:** https://www.npmjs.com/package/partysocket
- **Chataigne Documentation:** http://benjamin.larget.fr/Chataigne/

---

## Support

For issues or questions:
1. Check the **Troubleshooting** section above.
2. Review deployed relay logs via PartyKit dashboard.
3. Check browser console (F12) for client-side errors.
4. Review Chataigne module logs for server connectivity issues.
