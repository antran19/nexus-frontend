// Pure helpers for the login session, kept apart from React and axios so `npm test` can cover them.

// When the token stops being valid, in milliseconds since 1970; null when the token has no readable `exp`.
export function tokenExpiresAt(token) {
  try {
    const payload = JSON.parse(atob(String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

// A token without a readable expiry is kept: the server still decides, and a 401 ends the session then.
export function isTokenExpired(token, now = Date.now()) {
  const expiresAt = tokenExpiresAt(token)
  return expiresAt !== null && expiresAt <= now
}

// The token kept in the browser, and whether it had already run out (so the login page can say why the person is
// asked to sign in again). An expired token is dropped, unless a refresh token is kept too: then the first request
// that gets a 401 trades it for a fresh access token and the person never notices.
export function readStoredSession(stored, now = Date.now(), hasRefreshToken = false) {
  if (!stored) return { token: null, expired: false }
  if (isTokenExpired(stored, now) && !hasRefreshToken) return { token: null, expired: true }
  return { token: stored, expired: false }
}

// Should this failed request end the session? Only a 401 on a request that carried the token we still hold: a wrong
// password at login is also a 401 but has no token, and a late answer to a request sent before a new login must not
// sign the person out again.
export function shouldEndSession(error, currentToken) {
  if (error?.response?.status !== 401 || !currentToken) return false
  return error.config?.headers?.Authorization === `Bearer ${currentToken}`
}

// What to do with a request that failed:
//  - 'refresh': a 401 on the access token we hold now, so trade the refresh token for a new one and send it again;
//  - 'retry': a 401 on an OLDER access token (the token was replaced while the request was on its way), so just send
//    it again with the current one;
//  - null: anything else, including a request already sent a second time (a second 401 is final).
export function retryPlan(error, currentToken, refreshToken) {
  if (error?.response?.status !== 401 || !currentToken || error.config?._retried) return null
  const sent = error.config?.headers?.Authorization
  if (!sent) return null
  if (sent === `Bearer ${currentToken}`) return refreshToken ? 'refresh' : null
  return 'retry'
}

// Where the login page sends the person back to: the page they were on, address and query together.
export function returnPath(location) {
  return `${location.pathname}${location.search ?? ''}`
}
