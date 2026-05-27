<script>
  import { onMount } from 'svelte'
  import QRCode from 'qrcode'

  let subtitleUrl = $state('')
  let qrDataUrl = $state('')
  let qrPagePath = $state('')

  onMount(async () => {
    subtitleUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    qrPagePath = `${import.meta.env.BASE_URL}qr/`

    try {
      qrDataUrl = await QRCode.toDataURL(subtitleUrl, {
        width: 360,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
    } catch (error) {
      console.error('Failed to generate QR code:', error)
    }
  })
</script>

<div class="qr-container">
  <h1 class="qr-title">Scan for Live Subtitles</h1>
  <p class="qr-subtitle">Open this link on your phone:</p>

  {#if qrDataUrl}
    <img class="qr-image" src={qrDataUrl} alt="QR code to open subtitles page" />
  {:else}
    <p class="qr-loading">Generating QR code...</p>
  {/if}

  <a class="qr-link" href={subtitleUrl}>{subtitleUrl}</a>
  <p class="qr-note">This page is available at {qrPagePath}</p>
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

  .qr-container {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 14px;
    padding: 28px 20px;
    text-align: center;
    background:
      radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.04), transparent 40%),
      radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.03), transparent 45%),
      #000000;
  }

  .qr-title {
    margin: 0;
    font-size: clamp(26px, 5vw, 42px);
    line-height: 1.1;
    font-weight: 800;
    letter-spacing: -0.02em;
  }

  .qr-subtitle {
    margin: 0;
    color: #d1d5db;
    font-size: 14px;
  }

  .qr-image {
    width: min(74vw, 360px);
    height: auto;
    border-radius: 12px;
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.5);
    background: white;
    padding: 12px;
  }

  .qr-loading {
    margin: 6px 0;
    color: #d1d5db;
    font-size: 14px;
  }

  .qr-link {
    color: #93c5fd;
    text-decoration: none;
    word-break: break-all;
    max-width: min(95vw, 720px);
    font-size: clamp(13px, 2.3vw, 16px);
  }

  .qr-link:hover {
    text-decoration: underline;
  }

  .qr-note {
    margin: 2px 0 0;
    font-size: 12px;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
</style>
