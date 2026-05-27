<script lang="ts">
  import { onMount } from 'svelte'
  import PartySocket from 'partysocket'
  import { base } from '$app/paths'
  import { dev } from '$app/environment'

  type Language = 'fr' | 'en'

  type SubtitleCue = {
    start: number
    end: number
    text: string
  }

  type RelayParsedMessage =
    | { type: 'free'; value: string }
    | { type: 'stop' }
    | { type: 'time'; value: number }

  type SubtitleTrack = {
    loaded: boolean
    cues: SubtitleCue[]
  }

  let socket: PartySocket | null = $state(null)
  let isConnected = $state(false)
  let displayText = $state('')
  let mode: 'free' | 'playing' = $state('free')
  let selectedLanguage: Language = $state('fr')
  let audioDescriptionEnabled = $state(false)
  let isReconnecting = $state(false)

  const subtitleTracks: Record<Language, SubtitleTrack> = {
    fr: { loaded: false, cues: [] },
    en: { loaded: false, cues: [] }
  }

  let audioElement: HTMLAudioElement | null = null
  let audioLoaded = false
  let timelineRunning = false
  let timelineAnchorPerfMs = 0
  let timelineAnchorSec = 0
  let timelineRafId: number | null = null

  const DRIFT_THRESHOLD_SECONDS = 0.35

  function parseTimecodeToSeconds(timecode: string): number {
    const [hms, ms = '0'] = timecode.trim().split(',')
    const [h, m, s] = hms.split(':').map((value) => Number.parseInt(value, 10))
    return h * 3600 + m * 60 + s + Number.parseInt(ms, 10) / 1000
  }

  function parseSrt(content: string): SubtitleCue[] {
    const normalized = content.replace(/\r\n/g, '\n').trim()
    if (!normalized) {
      return []
    }

    const blocks = normalized.split(/\n{2,}/)
    const cues = []

    for (const block of blocks) {
      const lines = block.split('\n').map((line) => line.trim())
      if (lines.length < 2) {
        continue
      }

      const timingLine = lines.find((line) => line.includes('-->'))
      if (!timingLine) {
        continue
      }

      const [startRaw, endRaw] = timingLine.split('-->').map((value) => value.trim())
      const start = parseTimecodeToSeconds(startRaw)
      const end = parseTimecodeToSeconds(endRaw)

      const textStartIndex = lines.indexOf(timingLine) + 1
      const text = lines.slice(textStartIndex).join('\n').trim()

      if (!Number.isFinite(start) || !Number.isFinite(end) || !text) {
        continue
      }

      cues.push({ start, end, text })
    }

    return cues
  }

  function getActiveCueText(cues: SubtitleCue[], timeSeconds: number): string {
    let left = 0
    let right = cues.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const cue = cues[mid]

      if (timeSeconds < cue.start) {
        right = mid - 1
      } else if (timeSeconds > cue.end) {
        left = mid + 1
      } else {
        return cue.text
      }
    }

    return ''
  }

  function parseIncomingTextPayload(rawPayload: unknown): RelayParsedMessage {
    const text = String(rawPayload ?? '').trim()
    if (!text) {
      return { type: 'free', value: '' }
    }

    if (text.toLowerCase() === 'stop') {
      return { type: 'stop' }
    }

    const prefixedMatch = text.match(/^time\s*:\s*(-?\d+(?:\.\d+)?)$/i)
    if (prefixedMatch) {
      return { type: 'time', value: Number.parseFloat(prefixedMatch[1]) }
    }

    if (/^-?\d+(?:\.\d+)?$/.test(text)) {
      return { type: 'time', value: Number.parseFloat(text) }
    }

    return { type: 'free', value: String(rawPayload ?? '') }
  }

  function getLocalTimelineSeconds(): number {
    if (!timelineRunning) {
      return timelineAnchorSec
    }

    const elapsed = (performance.now() - timelineAnchorPerfMs) / 1000
    return Math.max(0, timelineAnchorSec + elapsed)
  }

  async function ensureSubtitlesLoaded(language: Language): Promise<void> {
    if (subtitleTracks[language].loaded) {
      return
    }

    const response = await fetch(`${base}/${language}.srt`)
    if (!response.ok) {
      throw new Error(`Failed to load ${language}.srt`)
    }

    const content = await response.text()
    subtitleTracks[language].cues = parseSrt(content)
    subtitleTracks[language].loaded = true
  }

  function ensureAudioElement(): HTMLAudioElement {
    if (audioElement) {
      return audioElement
    }

    audioElement = new Audio(`${base}/audio.mp3`)
    audioElement.preload = 'auto'
    audioLoaded = true
    return audioElement
  }

  async function syncAudioToTimeline(forceSeek = false): Promise<void> {
    if (!audioDescriptionEnabled || !timelineRunning) {
      if (audioElement) {
        audioElement.pause()
      }
      return
    }

    const audio = ensureAudioElement()
    const expectedTime = getLocalTimelineSeconds()
    const audioDrift = Math.abs(audio.currentTime - expectedTime)

    if (forceSeek || audioDrift > DRIFT_THRESHOLD_SECONDS) {
      audio.currentTime = expectedTime
    }

    if (audio.paused) {
      try {
        await audio.play()
      } catch (error) {
        console.error('Audio play failed:', error)
      }
    }
  }

  async function refreshSubtitleFromTimeline(): Promise<void> {
    if (!timelineRunning) {
      return
    }

    await ensureSubtitlesLoaded(selectedLanguage)
    const cues = subtitleTracks[selectedLanguage].cues
    const timelineTime = getLocalTimelineSeconds()
    displayText = getActiveCueText(cues, timelineTime)
  }

  function stopTimelineLoop(): void {
    if (timelineRafId !== null) {
      cancelAnimationFrame(timelineRafId)
      timelineRafId = null
    }
  }

  function startTimelineLoop(): void {
    stopTimelineLoop()

    const tick = async () => {
      if (!timelineRunning) {
        return
      }

      await refreshSubtitleFromTimeline()
      await syncAudioToTimeline(false)
      timelineRafId = requestAnimationFrame(() => {
        tick().catch((error) => {
          console.error('Timeline tick error:', error)
        })
      })
    }
    tick().catch((error) => {
      console.error('Timeline start error:', error)
    })
  }

  function stopPlayingMode(): void {
    timelineRunning = false
    mode = 'free'
    stopTimelineLoop()
    if (audioElement) {
      audioElement.pause()
    }
  }

  async function applyServerTime(serverSeconds: number): Promise<void> {
    if (!Number.isFinite(serverSeconds)) {
      return
    }

    if (!timelineRunning) {
      mode = 'playing'
      timelineRunning = true
      timelineAnchorSec = Math.max(0, serverSeconds)
      timelineAnchorPerfMs = performance.now()
      await ensureSubtitlesLoaded(selectedLanguage)
      startTimelineLoop()
      await syncAudioToTimeline(true)
      return
    }

    const localTime = getLocalTimelineSeconds()
    const drift = Math.abs(localTime - serverSeconds)
    if (drift > DRIFT_THRESHOLD_SECONDS) {
      timelineAnchorSec = Math.max(0, serverSeconds)
      timelineAnchorPerfMs = performance.now()
      await syncAudioToTimeline(true)
    }
  }

  async function handleIncomingRelayMessage(rawMessage: unknown): Promise<void> {
    const parsed = parseIncomingTextPayload(rawMessage)

    console.log("Received",parsed);
    if (parsed.type === 'stop') {
      stopPlayingMode()
      displayText = ''
      return
    }

    if (parsed.type === 'time') {
      await applyServerTime(parsed.value)
      return
    }

    stopPlayingMode()
    displayText = parsed.value
  }

  async function setLanguage(language: Language): Promise<void> {
    if (selectedLanguage === language) {
      return
    }

    selectedLanguage = language
    if (timelineRunning) {
      await ensureSubtitlesLoaded(selectedLanguage)
      await refreshSubtitleFromTimeline()
    }
  }

  async function toggleAudioDescription(): Promise<void> {
    audioDescriptionEnabled = !audioDescriptionEnabled
    if (!audioDescriptionEnabled) {
      if (audioElement) {
        audioElement.pause()
      }
      return
    }

    if (timelineRunning) {
      await syncAudioToTimeline(true)
    }
  }

  onMount(() => {
    const relayHost = dev
      ? 'localhost:1999'
      : 'subtitle-relay.benkuper.partykit.dev'
    const roomName = 'main-stage'

    socket = new PartySocket({
      host: relayHost,
      room: roomName
    })

    socket.addEventListener('open', () => {
      isConnected = true
      isReconnecting = false
      console.log('✓ Connected to subtitle relay at ' + relayHost + '/' + roomName)
    })

    socket.addEventListener('close', () => {
      isConnected = false
      isReconnecting = true
      console.log('✗ Disconnected from relay')
    })

    socket.addEventListener('message', (event: MessageEvent<string>) => {
      try {
        const data = JSON.parse(event.data)
        void handleIncomingRelayMessage(data.text ?? '')
      } catch {
        void handleIncomingRelayMessage(event.data)
      }
    })

    socket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error)
      isConnected = false
      isReconnecting = true
    })

    return () => {
      stopTimelineLoop()
      if (audioElement) {
        audioElement.pause()
      }
      if (socket) {
        socket.close()
      }
    }
  })
</script>

<div class="container">
  <div class="top-bar">
    <div class="status-bar">
      <div class="status-dot" class:connected={isConnected}></div>
      <span class="status-text">
        {isConnected ? 'Synchronise' : 'Reconnexion...'}
      </span>
    </div>

    <div class="menu-bar" aria-label="Language and audio menu">
      <button
        type="button"
        class="menu-item"
        class:active={selectedLanguage === 'fr'}
        onclick={() => void setLanguage('fr')}
        aria-pressed={selectedLanguage === 'fr'}
        aria-label="French subtitles"
      >
        <img class="menu-flag" src={`${base}/fr.svg`} alt="" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="menu-item"
        class:active={selectedLanguage === 'en'}
        onclick={() => void setLanguage('en')}
        aria-pressed={selectedLanguage === 'en'}
        aria-label="English subtitles"
      >
        <img class="menu-flag" src={`${base}/en.svg`} alt="" aria-hidden="true" />
      </button>

      <button
        type="button"
        class="menu-item"
        class:active={audioDescriptionEnabled}
        onclick={() => void toggleAudioDescription()}
        aria-pressed={audioDescriptionEnabled}
      >
        <span class="menu-icon">🔊 AD</span>
      </button>
    </div>
  </div>

  <div class="subtitle-viewport">
    <p class="subtitle-text">{displayText}</p>
  </div>
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    background: #000000;
    position: relative;
  }

  .top-bar {
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.82);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px 8px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.8px;
    color: #9ca3af;
    text-transform: uppercase;
  }

  .menu-bar {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    padding: 0 12px 10px;
  }

  .menu-item {
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.06);
    color: #ffffff;
    border-radius: 12px;
    min-height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background-color 140ms ease, border-color 140ms ease, transform 140ms ease;
  }

  .menu-item.active {
    border-color: rgba(34, 197, 94, 0.9);
    background: rgba(34, 197, 94, 0.22);
  }

  .menu-item:active {
    transform: scale(0.98);
  }

  .menu-icon {
    font-size: 17px;
    line-height: 1;
    letter-spacing: 0.02em;
  }

  .menu-flag {
    width: 22px;
    height: 22px;
    display: block;
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

  @media (max-width: 768px) {
    .subtitle-viewport {
      padding: 30px 16px;
    }

    .subtitle-text {
      font-size: clamp(24px, 8vw, 56px);
      line-height: 1.2;
    }
  }

  @media (max-width: 480px) {
    .status-bar {
      padding: 9px 10px 7px;
      font-size: 10px;
      gap: 6px;
    }

    .menu-bar {
      padding: 0 9px 9px;
      gap: 6px;
    }

    .menu-item {
      min-height: 38px;
      border-radius: 10px;
    }

    .menu-icon {
      font-size: 15px;
    }

    .menu-flag {
      width: 20px;
      height: 20px;
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

  @media (max-height: 500px) {
    .subtitle-viewport {
      padding: 20px 16px;
    }

    .subtitle-text {
      font-size: clamp(20px, 6vw, 48px);
    }
  }
</style>