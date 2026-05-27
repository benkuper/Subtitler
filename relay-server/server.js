/**
 * PartyKit Edge Relay Server
 * Receives subtitle messages from Chataigne and broadcasts to all connected mobile clients
 */

export default {
  async onConnect(connection, room) {
    console.log(`[CONNECT] Client connected: ${connection.id}`)
  },

  async onMessage(message, sender, room) {
    console.log(`[MESSAGE] from ${sender.id}:`, message)
    
    // Broadcast message to all clients except sender to avoid echo
    room.broadcast(message, [sender.id])
  },

  async onClose(connection, room) {
    console.log(`[DISCONNECT] Client disconnected: ${connection.id}`)
  },

  async onError(connection, room, error) {
    console.error(`[ERROR] Connection ${connection.id}:`, error)
  }
}
