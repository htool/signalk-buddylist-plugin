'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const alerts = require('../lib/alerts')

test('headingTrue preferred, else magnetic', () => {
  const trueDeg = alerts.headingDegrees(5.3653, 1)
  assert.ok(Math.abs(trueDeg - 307.4) < 0.2)
  assert.equal(alerts.headingDegrees(undefined, Math.PI), 180)
  assert.equal(alerts.headingDegrees(undefined, undefined), null)
})

test('relative bearing: 0 is ahead, no leading zeros, wraps', () => {
  assert.equal(alerts.relativeBearingDeg(0, 0), 0)
  assert.equal(alerts.relativeBearingDeg(0, 47), 47)
  assert.equal(alerts.relativeBearingDeg(307.4, 0), 53)
  assert.equal(alerts.relativeBearingDeg(10, 350), 340)
  assert.equal(alerts.relativeBearingDeg(null, 90), null)
})

test('near message omits bearing when heading is missing', () => {
  assert.equal(alerts.nearMessage('WAVE', null), 'Your buddy WAVE is near')
  assert.equal(alerts.nearMessage('WAVE', 47), 'Your buddy WAVE is near (47°)')
  assert.equal(alerts.nearMessage('WAVE', 7), 'Your buddy WAVE is near (7°)')
})

test('schema includes alertBearing default false', () => {
  const plugin = require('../index.js')({
    debug: () => {},
    getPath: () => {},
    getSelfPath: () => {},
    handleMessage: () => {},
    subscriptionmanager: { subscribe: () => {} },
    setProviderError: () => {},
    savePluginOptions: () => {}
  })
  assert.equal(plugin.schema.properties.alertBearing.type, 'boolean')
  assert.equal(plugin.schema.properties.alertBearing.default, false)
})
