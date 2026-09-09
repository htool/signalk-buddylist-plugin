'use strict'

function rangeThresholdM (alertDistanceNm) {
  return Number(alertDistanceNm) * 1852
}

function configuredNameMissing (name) {
  return typeof name !== 'string' || name.trim() === ''
}

function displayName (name, kname, context) {
  return name || kname || context
}

function nameNote (name) {
  return configuredNameMissing(name) ? ' (name missing)' : ''
}

function headingDegrees (trueH, magH) {
  const rad = Number.isFinite(trueH) ? trueH : magH
  if ( !Number.isFinite(rad) ) {
    return null
  }
  return rad * 180 / Math.PI
}

function relativeBearingDeg (headingDeg, greatCircleBearing) {
  if ( headingDeg === null || headingDeg === undefined ) {
    return null
  }
  let rel = (greatCircleBearing - headingDeg) % 360
  if ( rel < 0 ) {
    rel += 360
  }
  return Math.round(rel) % 360
}

function nearDetail (distanceM, relativeDeg) {
  const metres = Math.round(distanceM)
  if ( relativeDeg === null || relativeDeg === undefined ) {
    return `(${metres}m)`
  }
  return `(${metres}m, ${relativeDeg}°)`
}

function nearMessage (sentName, name, detail, discord) {
  const ping = discordNote(discord)
  return `Your buddy ${sentName}${nameNote(name)} is near ${detail}${ping}`
}

function discordNote (discord) {
  const d = typeof discord === 'string' ? discord.trim().replace(/^@+/, '') : ''
  return d ? `; Discord @${d}` : ''
}

function latchName (sent) {
  if ( !sent ) {
    return undefined
  }
  return typeof sent === 'string' ? sent : sent.name
}

function latchDistance (sent) {
  return sent && typeof sent === 'object' ? sent.distance : undefined
}

function shouldSendAlert ({ sent, sentName, distance, resendAlerts, resendAlertDistance }) {
  const lastName = latchName(sent)
  const lastDist = latchDistance(sent)
  const delta = Number(resendAlertDistance) || 0
  const moved = Number.isFinite(lastDist) && Math.abs(distance - lastDist) >= delta
  const resend = resendAlerts && (delta > 0 ? moved : true)
  return !sent || lastName != sentName || resend
}

module.exports = {
  rangeThresholdM,
  configuredNameMissing,
  displayName,
  nameNote,
  headingDegrees,
  relativeBearingDeg,
  nearDetail,
  nearMessage,
  discordNote,
  latchName,
  latchDistance,
  shouldSendAlert
}
