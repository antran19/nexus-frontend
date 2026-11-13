import { useState } from 'react'
import { getAuction } from '../../api/auctions'
import { rateTransaction } from '../../api/ratings'
import { buildRatingBody, MAX_COMMENT_LENGTH, ratingErrorMessage, validateRating } from '../../utils/ratings'

// "Đánh giá người bán" under an auction the person won. The seller's id is not in the "my auctions" list, so
// it is read from the auction when the form is sent. The server accepts the rating only after the seller has
// marked the deal as shipped, and only once; both cases come back as a sentence under the form.
export default function RateSeller({ auctionId }) {
  const [open, setOpen] = useState(false)
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState('')

  async function submit(event) {
    event.preventDefault()
    const problem = validateRating({ score, comment })
    if (problem) {
      setError(problem)
      return
    }
    setSending(true)
    setError('')
    try {
      const { data: auction } = await getAuction(auctionId)
      await rateTransaction({
        ratedUserId: auction.sellerId,
        transactionType: 'AUCTION',
        transactionId: auctionId,
        ...buildRatingBody({ score, comment }),
      })
      setDone('Cảm ơn bạn đã đánh giá người bán.')
      setOpen(false)
    } catch (err) {
      if (err.response?.data?.error?.code === 'RATING_ALREADY_SUBMITTED') {
        setDone(ratingErrorMessage(err))
        setOpen(false)
      } else {
        setError(ratingErrorMessage(err))
      }
    } finally {
      setSending(false)
    }
  }

  if (done) return <p role="status" className="mt-2 text-sm text-green-700">{done}</p>

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-2 text-sm text-gray-900 underline">
        Đánh giá người bán
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="mt-3 border border-gray-200 rounded-lg p-4 bg-white">
      <fieldset disabled={sending}>
        <legend className="text-sm font-medium text-gray-900">Bạn thấy người bán thế nào?</legend>
        <div role="radiogroup" aria-label="Số sao" className="mt-2 flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={score === value}
              aria-label={`${value} sao`}
              onClick={() => setScore(value)}
              className={`text-2xl leading-none ${value <= score ? 'text-gold' : 'text-gray-300'}`}
            >
              ★
            </button>
          ))}
        </div>
        <label htmlFor={`rate-comment-${auctionId}`} className="mt-3 block text-xs text-gray-500">
          Nhận xét (không bắt buộc)
        </label>
        <textarea
          id={`rate-comment-${auctionId}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={MAX_COMMENT_LENGTH}
          rows={3}
          className="mt-1 w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button type="submit" className="bg-ink text-white rounded px-4 py-2 text-sm hover:bg-gold hover:text-ink transition-colors disabled:opacity-50">
            {sending ? 'Đang gửi...' : 'Gửi đánh giá'}
          </button>
          <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-600 px-3">
            Hủy
          </button>
        </div>
      </fieldset>
    </form>
  )
}
