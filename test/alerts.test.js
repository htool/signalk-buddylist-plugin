'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const alerts = require('../lib/alerts')

test('alert distance 1 NM is 1852 m', () => {
  assert.equal(alerts.rangeThresholdM(1), 1852)
  assert.equal(alerts.rangeThresholdM(2), 3704)
})

test('400 m is inside 2 NM, 4000 m is not', () => {
  const limit = alerts.rangeThresholdM(2)
  assert.ok(400 < limit)
  assert.ok(!(4000 < limit))
})

test('name missing note and AIS/urn fallback', () => {
  assert.equal(alerts.configuredNameMissing(undefined), true)
  assert.equal(alerts.configuredNameMissing('  '), true)
  assert.equal(alerts.configuredNameMissing('Dankbaarheid'), false)
  assert.equal(alerts.displayName(undefined, 'WAVE', 'urn:x'), 'WAVE')
  assert.equal(alerts.nameNote(undefined), ' (name missing)')
  assert.equal(alerts.nameNote('Dankbaarheid'), '')
  assert.equal(
    alerts.nearMessage('WAVE', undefined, '(400m)'),
    'Your buddy WAVE (name missing) is near (400m)'
  )
})

test('near detail: metres, optional relative bearing without leading zeros', () => {
  assert.equal(alerts.nearDetail(400.2, null), '(400m)')
  assert.equal(alerts.nearDetail(559, 52), '(559m, 52°)')
  assert.equal(alerts.nearDetail(400, 7), '(400m, 7°)')
})

test('headingTrue preferred, else magnetic; relative 0 is ahead', () => {
  const trueDeg = alerts.headingDegrees(5.3653, 1)
  assert.ok(Math.abs(trueDeg - 307.4) < 0.2)
  assert.equal(alerts.headingDegrees(undefined, Math.PI), 180)
  assert.equal(alerts.headingDegrees(undefined, undefined), null)
  assert.equal(alerts.relativeBearingDeg(307.4, 0), 53)
  assert.equal(alerts.relativeBearingDeg(0, 0), 0)
  assert.equal(alerts.relativeBearingDeg(null, 90), null)
})

test('first enter always alerts', () => {
  assert.equal(alerts.shouldSendAlert({
    sent: undefined,
    sentName: 'Dankbaarheid',
    distance: 400,
    resendAlerts: false,
    resendAlertDistance: 100
  }), true)
})

test('without resend, +160 m does not send again', () => {
  assert.equal(alerts.shouldSendAlert({
    sent: { name: 'Dankbaarheid', distance: 400 },
    sentName: 'Dankbaarheid',
    distance: 560,
    resendAlerts: false,
    resendAlertDistance: 100
  }), false)
})

test('with resend and 100 m: +10 m does not send, +160 m does', () => {
  const latch = { name: 'Dankbaarheid', distance: 400 }
  const base = {
    sent: latch,
    sentName: 'Dankbaarheid',
    resendAlerts: true,
    resendAlertDistance: 100
  }
  assert.equal(alerts.shouldSendAlert({ ...base, distance: 410 }), false)
  assert.equal(alerts.shouldSendAlert({ ...base, distance: 560 }), true)
})

test('with resend and X=0, every position resends', () => {
  assert.equal(alerts.shouldSendAlert({
    sent: { name: 'Dankbaarheid', distance: 400 },
    sentName: 'Dankbaarheid',
    distance: 401,
    resendAlerts: true,
    resendAlertDistance: 0
  }), true)
})

test('name change resends even if resend is off', () => {
  assert.equal(alerts.shouldSendAlert({
    sent: { name: 'Old', distance: 400 },
    sentName: 'Dankbaarheid',
    distance: 400,
    resendAlerts: false,
    resendAlertDistance: 100
  }), true)
})

test('schema order: alert options then resend options', () => {
  const plugin = require('../index.js')({
    debug: () => {},
    getPath: () => {},
    getSelfPath: () => {},
    handleMessage: () => {},
    subscriptionmanager: { subscribe: () => {} },
    setProviderError: () => {},
    savePluginOptions: () => {}
  })
  assert.deepEqual(Object.keys(plugin.schema.properties), [
    'personalHeading',
    'buddies',
    'alert',
    'alertDistance',
    'alertBearing',
    'resendAlerts',
    'resendAlertDistance',
    'signalkHeading',
    'skShare',
    'skShareDays',
    'skAlert',
    'skAlertDistance',
    'skAlertBearing',
    'skResendAlerts',
    'skResendAlertDistance'
  ])
  assert.equal(plugin.schema.properties.personalHeading.title, 'Personal buddies')
  assert.equal(plugin.schema.properties.signalkHeading.title, 'Signal K buddies')
})
