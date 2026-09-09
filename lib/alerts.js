'use strict'

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
  latchName,
  latchDistance,
  shouldSendAlert
}
