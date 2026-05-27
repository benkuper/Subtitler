# Chataigne to PartyKit Relay: Configuration Checklist

## Overview
This guide explains how to configure your local Chataigne show control rig to push real-time subtitle updates to the PartyKit cloud relay, which instantly broadcasts them to all connected mobile clients viewing the Svelte 5 frontend.

---

## Step 1: Module Type Selection in Chataigne

1. **Open Chataigne** and navigate to the **Modules** panel (typically left sidebar).
2. Click **Add Module** (+ icon).
3. In the module selector popup, search for or select **WebSocket Client**.
4. Name the module something descriptive: `SubtitleRelay` or `OutdoorSync`.
5. Click **Create** to instantiate the module.

---

## Step 2: Configure the WebSocket Connection URL

The PartyKit URL scheme for room-based broadcasting follows this pattern:

```
wss://<relay-service>.<your-username>.partykit.dev/parties/main/room/<room-name>
```

### Exact Parameter Breakdown:

| Component | Value | Notes |
|-----------|-------|-------|
| `relay-service` | `subtitle-relay` | The name you used in `npx partykit deploy --name subtitle-relay` |
| `your-username` | *Your PartyKit username* | Replace after first deployment (see Step 3) |
| `room-name` | `main-stage` | Must match the room name in App.svelte (`main-stage`) |

### Complete Example URL:
```
wss://subtitle-relay.alice.partykit.dev/parties/main/room/main-stage
```

### Chataigne Configuration:

1. In the WebSocket Client module, locate the **Host** field.
2. Enter the full URL (using your actual PartyKit username):
   ```
   wss://subtitle-relay.your-username.partykit.dev/parties/main/room/main-stage
   ```
3. Leave the **Port** field empty (the URL includes the port implicitly via `wss://`).
4. Set **Auto-reconnect** to `true` to handle network interruptions gracefully.

---

## Step 3: Configure Outbound Payload Format

Chataigne must send subtitle messages in JSON format matching the Svelte 5 frontend parser schema.

### Payload Schema:

```json
{
  "text": "Your subtitle text here"
}
```

### Examples of Valid Payloads:

**French dialogue:**
```json
{"text": "L'amour est un oiseau rebelle..."}
```

**English with punctuation:**
```json
{"text": "This is a test subtitle with timing sync."}
```

**Multi-line (newline handling):**
```json
{"text": "Line one\nLine two"}
```

---

## Step 4: Create a Custom Send Action in Chataigne

1. Inside your WebSocket Client module, locate the **Actions** section.
2. Create a new action by clicking **Add Action** (or similar menu).
3. Select **Custom Send** (or equivalent output action type).
4. Set the **Message Type** to `String` or `Raw`.
5. In the **Message Content** field, enter the JSON payload template:

```
{"text": "DEFAULT_TEXT"}
```

Or use Chataigne's dynamic token replacement syntax (varies by version). For example:

```
{"text": "$(variable_name)"}
```

Replace `$(variable_name)` with an actual Chataigne variable reference.

---

## Step 5: Connect to a Show Timeline or Event

To automatically push subtitles during your show:

1. Open your **Timeline** or **Sequence** in Chataigne.
2. At the point where you want a subtitle to appear, add a **Cue** or **Trigger Event**.
3. Assign the WebSocket Client's **Custom Send** action to this trigger.
4. Set the `text` parameter to your desired subtitle string.
5. Enable the action so it fires when the timeline reaches that point.

Example timeline trigger:
```
Time: 00:15:032
Action: SubtitleRelay.CustomSend
Payload: {"text": "First subtitle line"}
```

---

## Step 6: Monitor Connection Status

1. In Chataigne, watch the WebSocket Client module's status indicator:
   - **Green/Connected**: Data is flowing to PartyKit.
   - **Red/Disconnected**: Check your internet connection and PartyKit URL.

2. On your mobile browser viewing the frontend:
   - The top status bar should display **"Synchronisé"** (green dot) when connected.
   - If you see **"Reconnexion..."** (red dot), verify Chataigne is still running and the relay is deployed.

---

## Step 7: Testing the Full Pipeline

### Local Test (Before Live Show):

1. **Start Chataigne** on your site control machine.
2. **Verify WebSocket connection** to the relay (check module status).
3. **Deploy the Svelte frontend** to a web server or use `npm run dev` locally.
4. **Scan the QR code** on a mobile device or open the frontend URL directly.
5. **Send a test subtitle** from Chataigne by triggering the Custom Send action with:
   ```json
   {"text": "SYSTEM TEST - If you see this, the relay is working!"}
   ```
6. **Verify the mobile client** displays the subtitle within 50–100ms.

### Network Considerations:

- **Chataigne to PartyKit**: Uses your site's uplink internet (typically ISP or cellular modem).
- **Mobile Client to PartyKit**: Uses visitor's 4G/5G cellular connection (no local WiFi required).
- **Latency Target**: PartyKit's edge servers should achieve <100ms round-trip latency from both directions.

---

## Troubleshooting

| Symptom | Diagnosis | Solution |
|---------|-----------|----------|
| **"Reconnexion..." never clears on mobile** | Chataigne not connected or URL wrong | Verify WebSocket URL and Chataigne module status |
| **Subtitles delayed by several seconds** | Network congestion or cellular handover | Edge servers auto-recover; mobile clients retry smoothly |
| **No subtitle text appears, but status says "Synchronisé"** | Payload JSON malformed | Check `{"text": "..."}` structure; test with curl |
| **Chataigne module shows connected but PartyKit reports no clients** | Firewall blocking outbound WebSocket | Whitelist port 443 (WSS) in firewall rules |

---

## Production Deployment Checklist

- [ ] PartyKit relay deployed with `npx partykit deploy --name subtitle-relay`
- [ ] PartyKit deployment URL recorded (replace `your-username` in all configs)
- [ ] Svelte 5 frontend built and deployed to CDN or edge server
- [ ] QR code generated pointing to frontend URL with deep link or room reference
- [ ] Chataigne WebSocket URL verified with final PartyKit username
- [ ] Test subtitle sent and received on mobile before live show
- [ ] Network monitoring enabled on site control machine
- [ ] Cellular signal strength verified at audience viewing area
- [ ] Backup subtitle trigger plan if network connection drops

---

## Quick Reference: Full WebSocket URL Format

```
wss://subtitle-relay.YOUR-PARTYKIT-USERNAME.partykit.dev/parties/main/room/main-stage
```

**After your first deployment, replace `YOUR-PARTYKIT-USERNAME` everywhere in Chataigne configs.**
