'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')
const directory = require('../lib/directory')

test('identity needs 9-digit MMSI and a name', () => {
  assert.equal(directory.identityFromSelf('244670524', 'WAVE').ok, true)
  assert.equal(directory.identityFromSelf({ value: '244670524' }, { value: 'WAVE' }).mmsi, '244670524')
  assert.equal(directory.identityFromSelf('123', 'WAVE').ok, false)
  assert.equal(directory.identityFromSelf('244670524', '  ').ok, false)
})

test('share days default 90, cap 1–365', () => {
  assert.equal(directory.clampShareDays(undefined), 90)
  assert.equal(directory.clampShareDays(0), 90)
  assert.equal(directory.clampShareDays(90), 90)
  assert.equal(directory.clampShareDays(400), 365)
})

test('renew at half lease and on start', () => {
  const now = 1_000_000
  const half90 = directory.nextRenewAtMs(now, 90)
  assert.equal(half90, now + 45 * directory.DAY_MS)
  assert.equal(directory.shouldAttemptRenew({ share: true, nowMs: now, renewAtMs: null }), true)
  assert.equal(directory.shouldAttemptRenew({ share: true, nowMs: now, renewAtMs: now + 1000 }), false)
  assert.equal(directory.shouldAttemptRenew({ share: true, nowMs: now + 1000, renewAtMs: now }), true)
  assert.equal(directory.shouldAttemptRenew({ share: false, nowMs: now, renewAtMs: null }), false)
})

test('backoff grows then caps at one hour', () => {
  assert.equal(directory.backoffMs(0), 60 * 1000)
  assert.equal(directory.backoffMs(3), 60 * 60 * 1000)
  assert.equal(directory.backoffMs(99), 60 * 60 * 1000)
})

test('POST payload and success/failure', async () => {
  const body = directory.sharePayload({
    mmsi: '244670524',
    name: 'WAVE',
    share: true,
    days: 90
  })
  assert.deepEqual(body, { mmsi: '244670524', name: 'WAVE', share: true, days: 90 })
  const okFetch = async () => ({ ok: true })
  assert.equal(await directory.postShare(okFetch, directory.POST_URL, body), true)
  const badFetch = async () => ({ ok: false, status: 500 })
  await assert.rejects(() => directory.postShare(badFetch, directory.POST_URL, body))
})

test('schema includes skShare and skShareDays', () => {
  const plugin = require('../index.js')({
    debug: () => {},
    getPath: () => {},
    getSelfPath: () => {},
    handleMessage: () => {},
    subscriptionmanager: { subscribe: () => {} },
    setProviderError: () => {},
    savePluginOptions: () => {}
  })
  assert.equal(plugin.schema.properties.skShare.default, false)
  assert.equal(plugin.schema.properties.skShareDays.default, 90)
})
