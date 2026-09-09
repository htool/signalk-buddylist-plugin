'use strict'

const POST_URL = 'https://vhfinfo.org/sk-buddies.php'
const GET_URL = 'https://vhfinfo.org/sk-buddies.php'
const DAY_MS = 24 * 60 * 60 * 1000
const BACKOFF_MS = [60 * 1000, 5 * 60 * 1000, 15 * 60 * 1000, 60 * 60 * 1000]

function unwrapPath (v) {
  if ( v && typeof v === 'object' && 'value' in v ) {
    return v.value
  }
  return v
}

function normalizeMmsi (mmsi) {
  const digits = String(mmsi == null ? '' : mmsi).replace(/\D/g, '')
  return digits.length === 9 ? digits : null
}

function normalizeDiscord (s) {
  const t = typeof s === 'string' ? s.trim().replace(/^@+/, '') : ''
  if ( !t || t.length > 32 ) {
    return ''
  }
  if ( !/^[A-Za-z0-9._]+$/.test(t) ) {
    return ''
  }
  return t
}

function identityFromSelf (mmsi, name) {
  const id = normalizeMmsi(unwrapPath(mmsi))
  const n = typeof unwrapPath(name) === 'string' ? unwrapPath(name).trim() : ''
  if ( !id ) {
    return { ok: false, error: 'MMSI missing or not 9 digits' }
  }
  if ( !n ) {
    return { ok: false, error: 'vessel name missing' }
  }
  return { ok: true, mmsi: id, name: n }
}

function clampShareDays (days) {
  const n = Number(days)
  if ( !Number.isFinite(n) || n < 1 ) {
    return 90
  }
  return Math.min(365, Math.round(n))
}

function nextRenewAtMs (nowMs, days) {
  return nowMs + clampShareDays(days) * DAY_MS / 2
}

function shouldAttemptRenew ({ share, nowMs, renewAtMs }) {
  if ( !share ) {
    return false
  }
  if ( renewAtMs == null ) {
    return true
  }
  return nowMs >= renewAtMs
}

function backoffMs (failCount) {
  const i = Math.max(0, Number(failCount) || 0)
  return BACKOFF_MS[Math.min(i, BACKOFF_MS.length - 1)]
}

function sharePayload ({ mmsi, name, share, days, discord }) {
  return {
    mmsi,
    name,
    share: !!share,
    days: clampShareDays(days),
    discord: normalizeDiscord(discord)
  }
}

function parseRoster (data, nowMs, excludeMmsi) {
  const rows = Array.isArray(data)
    ? data
    : (data && Array.isArray(data.buddies) ? data.buddies : [])
  const now = Number(nowMs) || Date.now()
  const skip = normalizeMmsi(unwrapPath(excludeMmsi))
  const out = []
  rows.forEach(row => {
    if ( !row || typeof row !== 'object' ) {
      return
    }
    const mmsi = normalizeMmsi(row.mmsi)
    if ( !mmsi || mmsi === skip ) {
      return
    }
    if ( row.expires_at ) {
      const exp = Date.parse(row.expires_at)
      if ( Number.isFinite(exp) && exp <= now ) {
        return
      }
    }
    const name = typeof row.name === 'string' ? row.name.trim() : ''
    const item = { mmsi, name }
    const discord = normalizeDiscord(row.discord)
    if ( discord ) {
      item.discord = discord
    }
    if ( row.expires_at ) {
      const exp = Date.parse(row.expires_at)
      if ( Number.isFinite(exp) ) {
        item.expires_at = typeof row.expires_at === 'string'
          ? row.expires_at
          : new Date(exp).toISOString()
      }
    }
    out.push(item)
  })
  return out
}

function shouldRefreshRoster ({ nowMs, fetchedAtMs, intervalMs }) {
  const interval = Number.isFinite(Number(intervalMs)) && Number(intervalMs) > 0
    ? Number(intervalMs)
    : DAY_MS
  if ( fetchedAtMs == null || !Number.isFinite(Number(fetchedAtMs)) || Number(fetchedAtMs) <= 0 ) {
    return true
  }
  return nowMs - Number(fetchedAtMs) >= interval
}

function formatFetchedAt (fetchedAtMs) {
  const n = Number(fetchedAtMs)
  if ( !Number.isFinite(n) || n <= 0 ) {
    return null
  }
  const d = new Date(n)
  if ( !Number.isFinite(d.getTime()) ) {
    return null
  }
  return d.toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
}

function rosterStatusText ({ count, fetchedAtMs, failed }) {
  const n = Math.max(0, Number(count) || 0)
  const loaded = n === 0 ? 'None loaded' : `${n} loaded`
  const when = formatFetchedAt(fetchedAtMs)
  const timeBit = when ? `Last successful GET ${when}` : 'No successful GET yet'
  if ( failed ) {
    return n > 0
      ? `${loaded} from cache. ${timeBit}. Directory GET failed.`
      : `None loaded. ${timeBit}. Directory GET failed.`
  }
  return `${loaded}. ${timeBit}`
}

function mmsiFromContext (context) {
  const s = String(context || '')
  const tagged = s.match(/mmsi:(\d{9})/)
  if ( tagged ) {
    return tagged[1]
  }
  return normalizeMmsi(s)
}

function matchRosterToVessels (roster, vesselContexts, selfMmsi) {
  const self = normalizeMmsi(unwrapPath(selfMmsi))
  const present = {}
  ;(vesselContexts || []).forEach(ctx => {
    const m = mmsiFromContext(ctx)
    if ( m ) {
      present[m] = ctx
    }
  })
  const matches = []
  ;(roster || []).forEach(row => {
    if ( !row || row.mmsi === self ) {
      return
    }
    const ctx = present[row.mmsi]
    if ( !ctx ) {
      return
    }
    matches.push({
      urn: ctx.indexOf('urn:') === 0 ? ctx : `urn:mrn:imo:mmsi:${row.mmsi}`,
      name: row.name,
      discord: row.discord || ''
    })
  })
  return matches
}

function fetchRoster (fetchFn, url, excludeMmsi) {
  return fetchFn(url, { headers: { Accept: 'application/json' } }).then(res => {
    if ( !res.ok ) {
      throw new Error('directory GET ' + res.status)
    }
    return res.json()
  }).then(data => parseRoster(data, Date.now(), excludeMmsi))
}

function postShare (fetchFn, url, body) {
  return fetchFn(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(res => {
    if ( !res.ok ) {
      throw new Error('directory POST ' + res.status)
    }
    return true
  })
}

function createShareQueue (send) {
  let pending = Promise.resolve()
  let latest = null
  return function enqueue (item) {
    latest = item
    const mine = latest
    pending = pending.catch(() => {}).then(() => {
      if ( latest !== mine ) {
        return
      }
      return send(mine)
    })
    return pending
  }
}

module.exports = {
  POST_URL,
  GET_URL,
  DAY_MS,
  unwrapPath,
  normalizeMmsi,
  identityFromSelf,
  normalizeDiscord,
  clampShareDays,
  nextRenewAtMs,
  shouldAttemptRenew,
  backoffMs,
  sharePayload,
  postShare,
  createShareQueue,
  parseRoster,
  shouldRefreshRoster,
  formatFetchedAt,
  rosterStatusText,
  mmsiFromContext,
  matchRosterToVessels,
  fetchRoster
}
