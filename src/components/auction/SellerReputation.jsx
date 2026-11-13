import { useEffect, useState } from 'react'
import { getReputation } from '../../api/ratings'
import { useAuth } from '../../context/AuthContext'
import { reputationSummary, TRUST_LABEL } from '../../utils/ratings'

// "Người bán: 4.5 / 5 · 12 đánh giá · Uy tín cao". The reputation call needs a signed-in person, and a
// failure must not spoil the auction page, so without a token or on any error nothing is shown.
export default function SellerReputation({ sellerId }) {
  const { isAuthenticated } = useAuth()
  const [reputation, setReputation] = useState(null)

  useEffect(() => {
    if (!isAuthenticated || !sellerId) return undefined
    let cancelled = false
    getReputation(sellerId)
      .then(({ data }) => {
        if (!cancelled) setReputation(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, sellerId])

  if (!isAuthenticated || !reputation) return null

  return (
    <p className="mt-2 text-sm text-gray-600">
      Người bán: <span className="text-gray-900">{reputationSummary(reputation)}</span>
      {TRUST_LABEL[reputation.trustLevel] && <span className="ml-2 text-xs border rounded-full px-2 py-0.5">{TRUST_LABEL[reputation.trustLevel]}</span>}
    </p>
  )
}
