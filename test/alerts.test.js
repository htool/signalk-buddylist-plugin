'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const alerts = require('../lib/alerts')

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

test('schema has resendAlertDistance default 0 after resendAlerts', () => {
  const plugin = require('../index.js')({
    debug: () => {},
    getPath: () => {},
    getSelfPath: () => {},
    handleMessage: () => {},
    subscriptionmanager: { subscribe: () => {} },
    setProviderError: () => {},
    savePluginOptions: () => {}
  })
  const keys = Object.keys(plugin.schema.properties)
  assert.equal(plugin.schema.properties.resendAlertDistance.type, 'number')
  assert.equal(plugin.schema.properties.resendAlertDistance.default, 0)
  assert.ok(keys.indexOf('resendAlertDistance') === keys.indexOf('resendAlerts') + 1)
})
