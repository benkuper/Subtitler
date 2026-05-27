<script>
  import { onMount } from 'svelte'
  import PartySocket from 'partysocket'

  let socket = $state(null)
  let isConnected = $state(false)
  let currentSubtitle = $state('')
  let isReconnecting = $state(false)

  onMount(() => {
    // Replace 'your-username' with your actual PartyKit username after deployment
    const relayHost = 'subtitle-relay.benkuper.partykit.dev'
    const roomName = 'main-stage'

    // Initialize PartySocket connection
    socket = new PartySocket({
      host: relayHost,
      room: roomName
    })

    socket.addEventListener('open', () => {
      isConnected = true
      isReconnecting = false
      console.log('✓ Connected to subtitle relay')
    })

    socket.addEventListener('close', () => {
      isConnected = false
      isReconnecting = true
      console.log('✗ Disconnected from relay')
    })

    socket.addEventListener('message', (event) => {
      try {
        // Parse incoming data as JSON with text property
        const data = JSON.parse(event.data)
        currentSubtitle = data.text || ''
      } catch (e) {
        // Fallback: use raw string if JSON parsing fails
        currentSubtitle = event.data
      }
    })

    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error)
      isConnected = false
      isReconnecting = true
    })

    // Cleanup on component unmount
    return () => {
      if (socket) {
        socket.close()
      }
    }
  })
</script>

<div class="container">
  <div class="status-bar">
    <div class="status-dot" class:connected={isConnected}></div>
    <span class="status-text">
      {isConnected ? 'Synchronisé' : 'Reconnexion...'}
    </span>
  </div>

  <div class="subtitle-viewport">
    <p class="subtitle-text">{currentSubtitle}</p>
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    background: #000000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    color: #ffffff;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  :global(html, body, #app) {
    width: 100%;
    height: 100%;
  }

  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    background: #000000;
    position: relative;
  }

  .status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.8px;
    color: #9ca3af;
    text-transform: uppercase;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #ef4444;
    box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
    transition: background-color 0.4s cubic-bezier(0.4, 0, 0.2, 1),
                box-shadow 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .status-dot.connected {
    background: #10b981;
    box-shadow: 0 0 4px rgba(16, 185, 129, 0.5);
  }

  .subtitle-viewport {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
  }

  .subtitle-text {
    margin: 0;
    font-size: clamp(32px, 10vw, 80px);
    font-weight: 700;
    line-height: 1.25;
    letter-spacing: -0.02em;
    color: #ffffff;
    text-shadow: 0 4px 16px rgba(0, 0, 0, 0.95),
                 0 0 32px rgba(0, 0, 0, 0.5);
    max-width: 90vw;
    word-wrap: break-word;
    overflow-wrap: break-word;
    hyphens: auto;
  }

  /* Tablet and smaller phone optimization */
  @media (max-width: 768px) {
    .subtitle-viewport {
      padding: 30px 16px;
    }

    .subtitle-text {
      font-size: clamp(24px, 8vw, 56px);
      line-height: 1.2;
    }
  }

  /* Small phone optimization */
  @media (max-width: 480px) {
    .status-bar {
      padding: 10px 12px;
      font-size: 10px;
      gap: 6px;
    }

    .status-dot {
      width: 6px;
      height: 6px;
    }

    .subtitle-viewport {
      padding: 24px 12px;
    }

    .subtitle-text {
      font-size: clamp(20px, 6vw, 42px);
    }
  }

  /* Landscape mode adjustments */
  @media (max-height: 500px) {
    .subtitle-viewport {
      padding: 20px 16px;
    }

    .subtitle-text {
      font-size: clamp(20px, 6vw, 48px);
    }
  }
</style>
