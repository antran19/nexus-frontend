import { useEffect, useRef } from 'react'
import { apiClient } from '../../api/client'

// Opens the live price stream of one auction (API.md 5.7) while `enabled`.
// onBid gets every accepted bid as it happens. onReconnect fires when the browser reconnects after a
// drop: bids made in the gap are not replayed, so the caller must reload the price and history.
export function useAuctionStream(auctionId, enabled, onBid, onReconnect) {
  // Latest callbacks, so a re-render never closes and reopens the connection.
  const handlers = useRef({ onBid, onReconnect })
  useEffect(() => {
    handlers.current = { onBid, onReconnect }
  })

  useEffect(() => {
    if (!enabled || !auctionId) return undefined
    const source = new EventSource(`${apiClient.defaults.baseURL}/api/v1/auctions/${auctionId}/stream`)
    let opened = false
    source.addEventListener('open', () => {
      if (opened) handlers.current.onReconnect?.()
      opened = true
    })
    source.addEventListener('bid', (event) => {
      try {
        handlers.current.onBid(JSON.parse(event.data))
      } catch {
        // a malformed event is dropped; the next refresh corrects the screen
      }
    })
    return () => source.close()
  }, [auctionId, enabled])
}
