/**
 * PartyKit Edge Relay Server
 * Receives subtitle messages from Chataigne and broadcasts to all connected mobile clients
 */

const roomStateMap = new Map()

function getOrCreateRoomState(room) {
  let state = roomStateMap.get(room.id)
  if (!state) {
    state = {
      mode: 'free',
      lastFreeMessage: '',
      lastBroadcastMessage: '',
      anchorTimeSec: 0,
      anchorMs: 0,
      tickerId: null
    }
    roomStateMap.set(room.id, state)
  }
  return state
}

function decodeIncomingMessage(message) {
  if (typeof message === 'string') {
    return message
  }

  if (message instanceof ArrayBuffer) {
    return new TextDecoder().decode(message)
  }

  if (ArrayBuffer.isView(message)) {
    return new TextDecoder().decode(message)
  }

  return String(message ?? '')
}

function parseIncomingCommand(message) {
  const raw = decodeIncomingMessage(message)

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'text' in parsed) {
      return parseIncomingCommand(String(parsed.text ?? ''))
    }
  } catch {
    // Not JSON, continue as plain text command.
  }

  const text = raw.trim()
  if (!text) {
    return { type: 'free', message: '' }
  }

  if (text.toLowerCase() === 'stop') {
    return { type: 'stop', message: 'stop' }
  }

  const prefixedMatch = text.match(/^time\s*:\s*(-?\d+(?:\.\d+)?)$/i)
  if (prefixedMatch) {
    return { type: 'time', seconds: Number.parseFloat(prefixedMatch[1]) }
  }

  if (/^-?\d+(?:\.\d+)?$/.test(text)) {
    return { type: 'time', seconds: Number.parseFloat(text) }
  }

  return { type: 'free', message: raw }
}

function getCurrentTimeFromState(state) {
  if (state.mode !== 'playing') {
    return 0
  }

  const elapsedSeconds = (Date.now() - state.anchorMs) / 1000
  return Math.max(0, state.anchorTimeSec + elapsedSeconds)
}

function formatTimeMessage(seconds) {
  return `time:${seconds.toFixed(3)}`
}

function stopTicker(state) {
  if (state.tickerId) {
    clearInterval(state.tickerId)
    state.tickerId = null
  }
}

function startTicker(room, state) {
  stopTicker(state)
  state.tickerId = setInterval(() => {
    if (state.mode !== 'playing') {
      stopTicker(state)
      return
    }

    const computedTime = getCurrentTimeFromState(state)
    const timeMessage = formatTimeMessage(computedTime)
    state.lastBroadcastMessage = timeMessage
    room.broadcast(timeMessage)
  }, 1000)
}

function getConnectionCount(room) {
  return Array.from(room.getConnections()).length
}

function broadcastToRoom(room, message) {
  const connectionCount = getConnectionCount(room)
  console.log(`[BROADCAST] room=${room.id} clients=${connectionCount} message=${message}`)
  room.broadcast(message)
}

export default {
  async onConnect(connection, room) {
    console.log(`[CONNECT] room=${room.id} client=${connection.id} clients=${getConnectionCount(room)}`)

    const requestUrl = connection.uri || connection.url
    if (typeof requestUrl === 'string' && requestUrl.includes('/parties/main/room/')) {
      console.warn(
        '[WARN] Legacy URL detected. Use /parties/main/main-stage instead of /parties/main/room/main-stage, or connect the frontend with ?room=room.'
      )
    }

    const state = getOrCreateRoomState(room)
    if (state.mode === 'playing') {
      const computedTime = getCurrentTimeFromState(state)
      const timeMessage = formatTimeMessage(computedTime)
      state.lastBroadcastMessage = timeMessage
      connection.send(timeMessage)
      console.log(`[SEND] room=${room.id} client=${connection.id} message=${timeMessage}`)
      return
    }

    if (state.lastBroadcastMessage) {
      connection.send(state.lastBroadcastMessage)
      console.log(`[SEND] room=${room.id} client=${connection.id} message=${state.lastBroadcastMessage}`)
    }
  },

  async onMessage(message, sender, room) {
    const parsed = parseIncomingCommand(message)
    const state = getOrCreateRoomState(room)

    console.log(`[MESSAGE] from ${sender.id}:`, decodeIncomingMessage(message))

    if (parsed.type === 'time') {
      state.mode = 'playing'
      state.anchorTimeSec = Math.max(0, parsed.seconds)
      state.anchorMs = Date.now()
      const timeMessage = formatTimeMessage(state.anchorTimeSec)
      state.lastBroadcastMessage = timeMessage
      broadcastToRoom(room, timeMessage)
      startTicker(room, state)
      return
    }

    if (parsed.type === 'stop') {
      stopTicker(state)
      state.mode = 'free'
      state.lastFreeMessage = 'stop'
      state.lastBroadcastMessage = 'stop'
      broadcastToRoom(room, 'stop')
      return
    }

    // Any non-time message switches relay into free message mode.
    stopTicker(state)
    state.mode = 'free'
    state.lastFreeMessage = parsed.message
    state.lastBroadcastMessage = parsed.message
    broadcastToRoom(room, parsed.message)
  },

  async onClose(connection, room) {
    console.log(`[DISCONNECT] room=${room.id} client=${connection.id} clients=${getConnectionCount(room)}`)
  },

  async onError(connection, room, error) {
    console.error(`[ERROR] Connection ${connection.id}:`, error)
  }
}
