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

function nearDetail (distanceM, relativeDeg) {
  const metres = Math.round(distanceM)
  if ( relativeDeg === null || relativeDeg === undefined ) {
    return `(${metres}m)`
  }
  return `(${metres}m, ${relativeDeg}°)`
}

function nearMessage (sentName, distanceM, relativeDeg) {
  return `Your buddy ${sentName} is near ${nearDetail(distanceM, relativeDeg)}`
}

module.exports = {
  headingDegrees,
  relativeBearingDeg,
  nearDetail,
  nearMessage
}
