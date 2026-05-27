# Outdoor Subtitles – Real-Time Synchronized Display System

> A high-performance, outdoor-ready real-time subtitle broadcasting system using **Svelte 5**, **PartyKit**, and **Chataigne** for projection mapping installations.

## Quick Start

### Deploy Relay Server
```bash
cd relay-server
npm install
npm run deploy
```

### Deploy Frontend
```bash
cd frontend
npm install
npm run build
# Deploy dist/ folder to your hosting provider
```

### Configure Chataigne
See [CHATAIGNE_SETUP.md](./CHATAIGNE_SETUP.md) for step-by-step instructions.

---

## System Architecture

- **Chataigne (On-Site):** WebSocket Client pushes subtitle JSON to cloud relay
- **PartyKit (Edge):** Real-time room broadcaster with sub-100ms latency
- **Svelte 5 (Mobile):** Ultra-readable, high-contrast single-page app for outdoor viewing

---

## Key Features

✅ **Production-Ready**
- Svelte 5 reactive runes (`$state`, `$derived`)
- Tested WebSocket protocol with auto-reconnect
- Zero-dependency subtitle parsing (JSON + fallback)

✅ **Outdoor Optimized**
- Absolute black OLED background (`#000000`)
- Legible 8–80px fluid typography
- Deep text-shadow for glare elimination
- 50–200ms network latency tolerance

✅ **Mobile-First**
- Works on 4G/5G cellular (no WiFi required)
- Responsive design: phones, tablets, landscape
- Status indicator for connection health

✅ **Easy Integration**
- Simple WebSocket URL: `wss://subtitle-relay.USERNAME.partykit.dev/parties/main/room/main-stage`
- JSON payload: `{"text": "Your subtitle"}`
- Chataigne timeline triggers ready

---

## Documentation

- [Complete Setup Guide](./SETUP.md) – Exact terminal commands & deployment steps
- [Chataigne Configuration](./CHATAIGNE_SETUP.md) – WebSocket client setup & testing

---

## Files Included

```
relay-server/
  ├── package.json        # PartyKit dependencies
  └── server.js           # Edge relay handler (onMessage, broadcast)

frontend/
  ├── package.json        # Svelte 5 + Vite + PartySocket
  ├── index.html          # Mobile-optimized viewport settings
  ├── vite.config.js      # Build configuration
  └── src/
      ├── main.js         # Svelte app entry point
      └── App.svelte      # Full subtitle UI + network logic
```

---

## First-Time Setup (5 minutes)

```bash
# 1. Deploy relay
cd relay-server && npm install && npm run deploy
# Note the output URL: https://subtitle-relay.YOUR-USERNAME.partykit.dev

# 2. Build frontend
cd ../frontend && npm install && npm run build

# 3. Update frontend hostname in src/App.svelte line 14
# Replace "your-username" with your actual PartyKit username

# 4. Deploy frontend (Vercel, Netlify, or your host)
vercel --prod

# 5. Configure Chataigne (see CHATAIGNE_SETUP.md)
```

---

## Testing the System

1. **Start Chataigne** on site control machine
2. **Open frontend** on mobile browser (scan QR or direct URL)
3. **Verify status bar** shows green "Synchronisé" when connected
4. **Send test subtitle** from Chataigne:
   ```json
   {"text": "TEST - System working!"}
   ```
5. **Confirm** text appears on mobile within 100ms

---

## Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Chataigne → PartyKit | <50ms | Site uplink (ISP/cellular) |
| PartyKit → Mobile | <100ms | Cloudflare edge network |
| Mobile Display Latency | <200ms | Total end-to-end |
| Browser Status Update | <50ms | Status bar green indicator |

---

## Troubleshooting

**Status shows "Reconnexion..." (red)?**
- Verify PartyKit URL in App.svelte
- Check browser console (F12) for errors
- Test relay connectivity: `curl -v https://subtitle-relay.YOUR-USERNAME.partykit.dev/parties/main/room/main-stage`

**Chataigne won't connect to relay?**
- Verify WebSocket URL format: `wss://subtitle-relay.YOUR-USERNAME.partykit.dev/parties/main/room/main-stage`
- Test firewall allows port 443 (WSS)

**Subtitles delayed by multiple seconds?**
- Network congestion is expected during cellular handovers
- Latency usually recovers within 100–200ms
- PartyKit edge servers auto-optimize routing

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome/Edge (Mobile) | ✅ Full | Primary target |
| Safari (iOS) | ✅ Full | Tested on iOS 15+ |
| Firefox (Mobile) | ✅ Full | Tested on Android |
| Samsung Internet | ✅ Full | Common on venues |

---

## License & Credits

Built for outdoor projection mapping installations requiring low-latency, high-reliability real-time text synchronization.

- **Svelte 5:** Rich Harris & community
- **PartyKit:** Cloudflare's edge runtime
- **Chataigne:** Benjamin Largé
- **PartySocket:** Yongwook Choi & community

---

## Next Steps

1. Follow [SETUP.md](./SETUP.md) for step-by-step terminal commands
2. Configure Chataigne per [CHATAIGNE_SETUP.md](./CHATAIGNE_SETUP.md)
3. Test with sample QR code display
4. Adjust CSS variables in `App.svelte` if needed for your venue lighting
5. Monitor network performance during rehearsal

**Ready for your next outdoor projection show! 🎬**
