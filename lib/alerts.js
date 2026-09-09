'use strict'

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

function nearMessage (sentName, relativeDeg) {
  if ( relativeDeg === null || relativeDeg === undefined ) {
    return `Your buddy ${sentName} is near`
  }
  return `Your buddy ${sentName} is near (${relativeDeg}°)`
}

module.exports = {
  headingDegrees,
  relativeBearingDeg,
  nearMessage
}
