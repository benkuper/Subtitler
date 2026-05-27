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
  let renderedSubtitleText = $state('')
  let subtitleVisible = $state(false)
  let mode: 'free' | 'playing' = $state('free')
  let selectedLanguage: Language = $state('fr')
  let audioDescriptionEnabled = $state(false)
  let isReconnecting = $state(false)
  let relayHostLabel = $state('')
  let roomNameLabel = $state('')
  let lastRelayMessage = $state('')
  let isFullscreen = $state(false)

  const subtitleTracks: Record<Language, SubtitleTrack> = {
    fr: { loaded: false, cues: [] },
    en: { loaded: false, cues: [] }
  }

  let audioElement: HTMLAudioElement | null = null
  let audioElementLanguage: Language | null = null
  let audioLoaded = false
  let timelineRunning = false
  let timelineAnchorPerfMs = 0
  let timelineAnchorSec = 0
  let timelineRafId: number | null = null
  let subtitleFadeTimeoutId: number | null = null
  let subtitleFadeFrameId: number | null = null
  let wakeLock: WakeLockSentinel | null = null
  let userHasInteracted = false
  let audioPlayBlocked = false

  const TIMELINE_DRIFT_THRESHOLD_SECONDS = 0.35
  const AUDIO_DRIFT_SEEK_THRESHOLD_SECONDS = 2
  const SUBTITLE_FADE_MS = 300
  const LANGUAGE_STORAGE_KEY = 'subtitler:selected-language'

  function isLanguage(value: string | null): value is Language {
    return value === 'fr' || value === 'en'
  }

  function loadUserPreferences(): void {
    try {
      const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
      if (isLanguage(storedLanguage)) {
        selectedLanguage = storedLanguage
      }

      window.localStorage.removeItem('subtitler:audio-description-enabled')
    } catch (error) {
      console.warn('Could not load subtitle preferences:', error)
    }
  }

  function saveSelectedLanguage(language: Language): void {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch (error) {
      console.warn('Could not save subtitle language preference:', error)
    }
  }

  async function requestScreenWakeLock(): Promise<void> {
    if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') {
      return
    }

    try {
      wakeLock = await navigator.wakeLock.request('screen')
      wakeLock.addEventListener('release', () => {
        wakeLock = null
      })
    } catch (error) {
      console.warn('Screen wake lock unavailable:', error)
    }
  }

  async function releaseScreenWakeLock(): Promise<void> {
    if (!wakeLock) {
      return
    }

    try {
      await wakeLock.release()
    } catch (error) {
      console.warn('Could not release screen wake lock:', error)
    } finally {
      wakeLock = null
    }
  }

  async function toggleFullscreen(): Promise<void> {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
      } else {
        await document.exitFullscreen()
      }
    } catch (error) {
      console.warn('Fullscreen unavailable:', error)
    }
  }

  function syncFullscreenState(): void {
    isFullscreen = Boolean(document.fullscreenElement)
  }

  function normalizeRelayHost(value: string): string {
    const trimmed = value.trim()
    if (!trimmed) {
      return trimmed
    }

    try {
      const parsed = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`)
      return parsed.host
    } catch {
      return trimmed.replace(/^wss?:\/\//, '').replace(/^https?:\/\//, '').split('/')[0]
    }
  }

  function getRelayConfig(): { host: string; room: string } {
    const params = new URLSearchParams(window.location.search)
    const queryRelayHost = params.get('relay')
    const queryRoomName = params.get('room')

    const host = queryRelayHost
      ? normalizeRelayHost(queryRelayHost)
      : dev
        ? `${window.location.hostname || 'localhost'}:1999`
        : 'subtitle-relay.benkuper.partykit.dev'

    return {
      host,
      room: queryRoomName?.trim() || 'main-stage'
    }
  }

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

  function clearSubtitleFadeTimeout(): void {
    if (subtitleFadeTimeoutId !== null) {
      window.clearTimeout(subtitleFadeTimeoutId)
      subtitleFadeTimeoutId = null
    }
  }

  function clearSubtitleFadeFrame(): void {
    if (subtitleFadeFrameId !== null) {
      window.cancelAnimationFrame(subtitleFadeFrameId)
      subtitleFadeFrameId = null
    }
  }

  function setDisplayText(nextText: string): void {
    if (nextText === displayText) {
      return
    }

    displayText = nextText
    clearSubtitleFadeTimeout()
    clearSubtitleFadeFrame()

    if (nextText) {
      renderedSubtitleText = nextText
      if (!subtitleVisible) {
        subtitleFadeFrameId = window.requestAnimationFrame(() => {
          subtitleVisible = true
          subtitleFadeFrameId = null
        })
      }
      return
    }

    if (!renderedSubtitleText) {
      subtitleVisible = false
      return
    }

    subtitleVisible = false
    subtitleFadeTimeoutId = window.setTimeout(() => {
      renderedSubtitleText = ''
      subtitleFadeTimeoutId = null
    }, SUBTITLE_FADE_MS)
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

  function getAudioSource(language: Language): string {
    return `${base}/${language}.mp3`
  }

  function ensureAudioElement(): HTMLAudioElement {
    if (audioElement && audioElementLanguage === selectedLanguage) {
      return audioElement
    }

    if (!audioElement) {
      audioElement = new Audio()
    } else {
      audioElement.pause()
    }

    audioElement.src = getAudioSource(selectedLanguage)
    audioElement.preload = 'auto'
    audioElement.load()
    audioElementLanguage = selectedLanguage
    audioLoaded = true
    return audioElement
  }

  async function unlockAudioPlayback(): Promise<void> {
    userHasInteracted = true

    if (!audioDescriptionEnabled) {
      return
    }

    await syncAudioToTimeline(true)
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

    if (forceSeek || audioDrift > AUDIO_DRIFT_SEEK_THRESHOLD_SECONDS) {
      try {
        audio.currentTime = expectedTime
      } catch (error) {
        console.warn('Audio seek failed:', error)
      }
    }

    if (audio.paused) {
      if (!userHasInteracted) {
        audioPlayBlocked = true
        return
      }

      try {
        await audio.play()
        audioPlayBlocked = false
      } catch (error) {
        audioPlayBlocked = true
        console.warn('Audio play blocked until user interaction:', error)
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
    setDisplayText(getActiveCueText(cues, timelineTime))
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
    if (drift > TIMELINE_DRIFT_THRESHOLD_SECONDS) {
      timelineAnchorSec = Math.max(0, serverSeconds)
      timelineAnchorPerfMs = performance.now()
      await syncAudioToTimeline(false)
    }
  }

  async function handleIncomingRelayMessage(rawMessage: unknown): Promise<void> {
    const parsed = parseIncomingTextPayload(rawMessage)

    if (parsed.type === 'stop') {
      stopPlayingMode()
      setDisplayText('')
      return
    }

    if (parsed.type === 'time') {
      await applyServerTime(parsed.value)
      return
    }

    stopPlayingMode()
    setDisplayText(parsed.value)
  }

  async function setLanguage(language: Language): Promise<void> {
    if (selectedLanguage === language) {
      return
    }

    selectedLanguage = language
    saveSelectedLanguage(language)
    if (timelineRunning) {
      await ensureSubtitlesLoaded(selectedLanguage)
      await refreshSubtitleFromTimeline()
      if (audioDescriptionEnabled) {
        await syncAudioToTimeline(true)
      }
    }
  }

  async function toggleAudioDescription(): Promise<void> {
    userHasInteracted = true
    audioDescriptionEnabled = !audioDescriptionEnabled
    if (!audioDescriptionEnabled) {
      if (audioElement) {
        audioElement.pause()
      }
      audioPlayBlocked = false
      return
    }

    if (timelineRunning) {
      await syncAudioToTimeline(true)
    }
  }

  onMount(() => {
    loadUserPreferences()
    void requestScreenWakeLock()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void requestScreenWakeLock()
      }
    }

    const handleFirstInteraction = () => {
      void requestScreenWakeLock()
      void unlockAudioPlayback()
    }

    const handleAnyInteraction = () => {
      if (audioPlayBlocked) {
        void unlockAudioPlayback()
      } else {
        userHasInteracted = true
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    document.addEventListener('fullscreenchange', syncFullscreenState)
    window.addEventListener('pointerdown', handleFirstInteraction, { once: true })
    window.addEventListener('pointerdown', handleAnyInteraction)
    window.addEventListener('keydown', handleAnyInteraction)

    const { host: relayHost, room: roomName } = getRelayConfig()
    relayHostLabel = relayHost
    roomNameLabel = roomName

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
      lastRelayMessage = event.data
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
      clearSubtitleFadeTimeout()
      clearSubtitleFadeFrame()
      void releaseScreenWakeLock()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      document.removeEventListener('fullscreenchange', syncFullscreenState)
      window.removeEventListener('pointerdown', handleFirstInteraction)
      window.removeEventListener('pointerdown', handleAnyInteraction)
      window.removeEventListener('keydown', handleAnyInteraction)
      if (socket) {
        socket.close()
      }
    }
  })
</script>

<div class="container">
  <img class="background-image" src={`${base}/bg.png`} alt="" aria-hidden="true" />

  <div class="top-bar">
    <div class="status-bar">
      <div class="status-dot" class:connected={isConnected}></div>
      <span class="status-text">
        {isConnected ? 'Synchronise' : 'Reconnexion...'}
      </span>
      <span class="relay-label">{relayHostLabel}/{roomNameLabel}</span>
      {#if lastRelayMessage}
        <span class="relay-message">{lastRelayMessage}</span>
      {/if}
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
      <button
        type="button"
        class="menu-item"
        class:active={isFullscreen}
        onclick={() => void toggleFullscreen()}
        aria-pressed={isFullscreen}
        aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        <svg class="menu-svg" viewBox="0 0 24 24" aria-hidden="true">
          {#if isFullscreen}
            <path d="M8 3v3a2 2 0 0 1-2 2H3" />
            <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
            <path d="M3 16h3a2 2 0 0 1 2 2v3" />
            <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
          {:else}
            <path d="M3 8V5a2 2 0 0 1 2-2h3" />
            <path d="M16 3h3a2 2 0 0 1 2 2v3" />
            <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
            <path d="M8 21H5a2 2 0 0 1-2-2v-3" />
          {/if}
        </svg>
      </button>
    </div>
  </div>

  <div class="subtitle-viewport">
    <p class="subtitle-text" class:visible={subtitleVisible}>{renderedSubtitleText}</p>
  </div>

  <img class="bottom-logo" src={`${base}/logo.png`} alt="" aria-hidden="true" />
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
    background: #000000;
    position: relative;
    overflow: hidden;
  }

  .background-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.08;
    pointer-events: none;
    user-select: none;
  }

  .top-bar {
    display: flex;
    flex-direction: column;
    background: rgba(0, 0, 0, 0.82);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    position: relative;
    z-index: 2;
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

  .relay-label,
  .relay-message {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-transform: none;
    letter-spacing: 0;
    color: #6b7280;
  }

  .relay-label {
    flex: 1;
  }

  .relay-message {
    max-width: 28vw;
    color: #9ca3af;
  }

  .menu-bar {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
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

  .menu-svg {
    width: 22px;
    height: 22px;
    display: block;
    fill: none;
    stroke: currentColor;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
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
    padding: 40px 20px 96px;
    text-align: center;
    position: relative;
    z-index: 1;
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
    hyphens: none;
    opacity: 0;
    transition: opacity 300ms ease;
  }

  .subtitle-text.visible {
    opacity: 1;
  }

  .bottom-logo {
    position: absolute;
    left: 50%;
    bottom: 22px;
    width: min(34vw, 150px);
    height: auto;
    transform: translateX(-50%);
    opacity: 0.92;
    pointer-events: none;
    user-select: none;
    z-index: 1;
  }

  @media (max-width: 768px) {
    .subtitle-viewport {
      padding: 30px 16px 82px;
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

    .relay-message {
      display: none;
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
      padding: 24px 12px 72px;
    }

    .bottom-logo {
      bottom: 16px;
      width: min(42vw, 120px);
    }

    .subtitle-text {
      font-size: clamp(20px, 6vw, 42px);
    }
  }

  @media (max-height: 500px) {
    .subtitle-viewport {
      padding: 20px 16px 64px;
    }

    .subtitle-text {
      font-size: clamp(20px, 6vw, 48px);
    }
  }
</style>
