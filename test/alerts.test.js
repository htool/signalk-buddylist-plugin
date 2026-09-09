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

test('near message includes metres; bearing sits in the same parens', () => {
  assert.equal(alerts.nearDetail(400.2, null), '(400m)')
  assert.equal(alerts.nearDetail(412, 47), '(412m, 47°)')
  assert.equal(alerts.nearDetail(400, 7), '(400m, 7°)')
  assert.equal(alerts.nearMessage('WAVE', 412, null), 'Your buddy WAVE is near (412m)')
  assert.equal(alerts.nearMessage('WAVE', 412, 47), 'Your buddy WAVE is near (412m, 47°)')
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
