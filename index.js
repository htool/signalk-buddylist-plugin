/*
 * Copyright 2019 Scott Bender <scott@scottbender.net>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const geolib = require('geolib')
const alerts = require('./lib/alerts')
const directory = require('./lib/directory')
const fs = require('fs')
const path = require('path')

const apiBase = '/signalk/v1/api/resources/buddies'
const v2ApiBase = '/signalk/v2/api/resources/buddies'

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = []
  var skUnsubscribes = []
  const notifications = {}
  const skNotifications = {}
  const shareState = {
    props: null,
    renewAtMs: null,
    failCount: 0,
    timer: null,
    shareOn: false,
    rosterAtMs: 0,
    roster: [],
    rosterFetchedAt: 0
  }
  const enqueueShare = directory.createShareQueue(item => {
    return directory.postShare(global.fetch, directory.POST_URL, item.body).then(() => {
      shareState.failCount = 0
      if ( item.share ) {
        shareState.renewAtMs = directory.nextRenewAtMs(Date.now(), item.body.days)
      }
    }).catch(err => {
      shareState.failCount += 1
      shareState.renewAtMs = Date.now() + directory.backoffMs(shareState.failCount)
      app.debug('directory share failed: %s', err.message)
    })
  })

  plugin.start = function(props) {
    app.debug(`Loaded buddy list: ${JSON.stringify(props.buddies)}`)
    props.buddies = Array.isArray(props?.buddies) ?  props.buddies : []
    shareState.props = props
    shareState.shareOn = !!props.skShare
    shareState.renewAtMs = null
    shareState.failCount = 0

    setupSubscriptions(props)
    const cache = loadRosterCache(props)
    shareState.roster = cache.roster
    shareState.rosterFetchedAt = cache.fetchedAt
    shareState.rosterAtMs = cache.fetchedAt || 0
    props.skRosterStatus = directory.rosterStatusText({
      count: directory.parseRoster(shareState.roster, Date.now(), unwrapSelf('mmsi')).length,
      fetchedAtMs: shareState.rosterFetchedAt
    })
    stripRosterFromProps(props)
    applySkRoster(props)
    refreshSkRoster(props)
    pushShare(shareState.shareOn)
    shareState.timer = setInterval(() => {
      if ( directory.shouldAttemptRenew({
        share: shareState.shareOn,
        nowMs: Date.now(),
        renewAtMs: shareState.renewAtMs
      }) ) {
        pushShare(true)
      }
      if ( directory.shouldRefreshRoster({
        nowMs: Date.now(),
        fetchedAtMs: shareState.rosterAtMs,
        intervalMs: directory.DAY_MS
      }) ) {
        refreshSkRoster(shareState.props)
      }
    }, 60 * 1000)

    app.get(apiBase, (req, res) => {
      const list = (props.buddies || []).map(buddy => {
        return JSON.parse(JSON.stringify(buddy))
      })
      res.json(list)
    })

    app.get(v2ApiBase, (req, res) => {
      const list = {}
      props.buddies.forEach( buddy => {
        list[buddy.urn] = {name: buddy.name}
      })
      res.json(list)
    })

    app.post(apiBase, (req, res) => {

      if ( typeof req.body.urn === 'undefined' ) {
        res.status(400).send('Please include a urn')
        return
      }

      if ( props.buddies.find(b => b.urn == req.body.urn ) ) {
        res.status(400).send('Buddy already exists')
        return
      }

      props.buddies.push(req.body)
      saveConfig(props, res)
    })

    app.post(v2ApiBase, (req, res) => {
      if ( typeof req.body.urn === 'undefined' ) {
        res.status(400).json({
          "state": "FAILED",
          "statusCode": 400,
          "message": "Please include a urn!"
        })
        return
      }
      if ( props.buddies.find(b => b.urn === req.body.urn ) ) {
        res.status(400).json({
          "state": "FAILED",
          "statusCode": 400,
          "message": "Buddy already exists!"
        })
        return
      }
      props.buddies.push(req.body)
      saveConfigV2(props, res)
    })

    app.delete(apiBase + '/:urn', (req, res) => {
      const urn = req.params.urn

      if ( !props.buddies.find(b => b.urn == urn) ) {
        res.status(400).send('cannot find buddy with urn: ' + urn)
        return
      }
      
      props.buddies = props.buddies.filter(b => b.urn != urn)
      saveConfig(props, res)

      app.handleMessage(plugin.id, {
        context: `vessels.${urn}`,
        updates: [{
          values: [{
            path: '',
            value: { buddy: false }
          }]
        }]
      })
    })

    app.delete(v2ApiBase + '/:urn', (req, res) => {
      if ( !props.buddies.find(b => b.urn === req.params.urn) ) {
        res.status(404).json({
          "state": "FAILED",
          "statusCode": 404,
          "message": `Cannot find buddy with urn: ${req.params.urn}`
        })
        return
      }
      
      props.buddies = props.buddies.filter(b => b.urn !== req.params.urn)
      saveConfigV2(props, res)

      app.handleMessage(plugin.id, {
        context: `vessels.${req.params.urn}`,
        updates: [{
          values: [{
            path: '',
            value: { buddy: false }
          }]
        }]
      })
    })

    app.put(apiBase + '/:urn', (req, res) => {
      const urn = req.params.urn
      const buddy = props.buddies.find(b => b.urn == urn)

      if ( !buddy ) {
        res.status(400).send('cannot find buddy with urn: ' + urn)
        return
      }

      buddy.name = req.body.name
      saveConfig(props, res)
    })

    app.put(v2ApiBase + '/:urn', (req, res) => {
      const buddy = props.buddies.find(b => b.urn === req.params.urn )
      if ( !buddy ) {
        res.status(404).json({
          "state": "FAILED",
          "statusCode": 404,
          "message": `Cannot find buddy with urn: ${req.params.urn}`
        })
        return
      }
      if ( typeof req.body.name === 'undefined' ) {
        res.status(400).json({
          "state": "FAILED",
          "statusCode": 400,
          "message": "Please include a name!"
        })
        return
      }
      buddy.name = req.body.name
      saveConfigV2(props, res)
    })
  }

  function saveConfigV2(props, res) {
    app.savePluginOptions(props, err => {
      if ( err ) {
        res.status(404).json({
          "state": "FAILED",
          "statusCode": 400,
          "message": "Unable to save buddies!"
        })
      } else {
        res.json({
          "state": "COMPLETED",
          "statusCode": 200,
          "message": "Buddies saved!"
        })
        stopSuscriptions()
        setupSubscriptions(props)
        applySkRoster(props)
      }
    })
  }

  function saveConfig(props, res) {
    app.savePluginOptions(props, err => {
      if ( err ) {
        res.status(404).send('unable to save buddies')
      } else {
        res.send('ok')

        stopSuscriptions()
        setupSubscriptions(props)
        applySkRoster(props)
      }
    })
  }

  function setupSubscriptions(props) {
    (props.buddies || []).forEach(buddy => {
      let command = {
        context: `vessels.${buddy.urn}`,
        subscribe: [{
          path: `navigation.position`,
          policy: 'instant'
        }]
      }
      
      app.subscriptionmanager.subscribe(command, unsubscribes, subscription_error, delta => {
        delta.updates.forEach(update => {
          update.values.forEach(pv => {
            if ( pv.path == 'navigation.position' ) {
              checkBuddy(buddy.urn, buddy.name, pv.value, {
                flag: 'buddy',
                notif: 'buddy',
                latch: notifications,
                alert: props.alert,
                alertDistance: props.alertDistance,
                resendAlerts: props.resendAlerts,
                alertBearing: props.alertBearing,
                resendAlertDistance: props.resendAlertDistance
              })
            }
          })
        })
      })
    })
  }

  function stopSkSubscriptions () {
    skUnsubscribes.forEach(f => f())
    skUnsubscribes = []
  }

  function setupSkSubscriptions (props, matches) {
    stopSkSubscriptions()
    ;(matches || []).forEach(buddy => {
      let command = {
        context: `vessels.${buddy.urn}`,
        subscribe: [{
          path: `navigation.position`,
          policy: 'instant'
        }]
      }
      app.subscriptionmanager.subscribe(command, skUnsubscribes, subscription_error, delta => {
        delta.updates.forEach(update => {
          update.values.forEach(pv => {
            if ( pv.path == 'navigation.position' ) {
              checkBuddy(buddy.urn, buddy.name, pv.value, {
                flag: 'signalkBuddy',
                notif: 'signalkBuddy',
                latch: skNotifications,
                alert: props.skAlert,
                alertDistance: props.skAlertDistance,
                resendAlerts: props.skResendAlerts,
                alertBearing: props.skAlertBearing,
                resendAlertDistance: props.skResendAlertDistance,
                discord: buddy.discord
              })
            }
          })
        })
      })
    })
  }

  function rosterFile () {
    return path.join(app.getDataDirPath(), 'sk-roster.json')
  }

  function loadRosterCache (props) {
    let roster = []
    let fetchedAt = 0
    try {
      const data = JSON.parse(fs.readFileSync(rosterFile(), 'utf8'))
      roster = Array.isArray(data.skRoster) ? data.skRoster : []
      fetchedAt = Number(data.skRosterFetchedAt) || 0
    } catch (_) {}
    if ( !roster.length && Array.isArray(props.skRoster) && props.skRoster.length ) {
      roster = props.skRoster
      fetchedAt = Number(props.skRosterFetchedAt) || fetchedAt
    }
    return { roster, fetchedAt }
  }

  function writeRosterCache (roster, fetchedAtMs) {
    try {
      fs.writeFileSync(rosterFile(), JSON.stringify({
        skRoster: roster,
        skRosterFetchedAt: fetchedAtMs || 0
      }, null, 2))
    } catch (err) {
      app.debug('save SK roster file failed: %s', err.message)
    }
  }

  function stripRosterFromProps (props) {
    delete props.skRoster
    delete props.skRosterFetchedAt
  }

  function applySkRoster (props) {
    const roster = directory.parseRoster(shareState.roster || [], Date.now(), unwrapSelf('mmsi'))
    const vessels = app.getPath('vessels') || {}
    const matches = directory.matchRosterToVessels(
      roster,
      Object.keys(vessels),
      unwrapSelf('mmsi')
    )
    setupSkSubscriptions(props, matches)
  }

  function persistSkRoster (props, roster, fetchedAtMs, failed) {
    const selfMmsi = unwrapSelf('mmsi')
    const rows = directory.parseRoster(roster || [], fetchedAtMs || Date.now(), selfMmsi)
    if ( !failed ) {
      shareState.roster = rows
      shareState.rosterFetchedAt = fetchedAtMs
      writeRosterCache(rows, fetchedAtMs)
    }
    const shown = failed
      ? directory.parseRoster(shareState.roster || [], Date.now(), selfMmsi)
      : rows
    props.skRosterStatus = directory.rosterStatusText({
      count: shown.length,
      fetchedAtMs: shareState.rosterFetchedAt,
      failed
    })
    props.skRosterRefresh = false
    stripRosterFromProps(props)
    app.savePluginOptions(props, err => {
      if ( err ) {
        app.debug('save SK roster failed: %s', err.message)
      }
    })
  }

  function refreshSkRoster (props) {
    shareState.rosterAtMs = Date.now()
    const selfMmsi = unwrapSelf('mmsi')
    return directory.fetchRoster(global.fetch, directory.GET_URL, selfMmsi).then(roster => {
      const fetchedAt = Date.now()
      shareState.rosterAtMs = fetchedAt
      persistSkRoster(props, roster, fetchedAt, false)
      applySkRoster(props)
    }).catch(err => {
      app.debug('directory GET failed: %s', err.message)
      persistSkRoster(props, shareState.roster, shareState.rosterFetchedAt, true)
      applySkRoster(props)
    })
  }

  function subscription_error(err)
  {
    console.log("error: " + err)
    app.setProviderError(err.message)
  }
  
  function headingDegrees () {
    return alerts.headingDegrees(
      app.getSelfPath('navigation.headingTrue.value'),
      app.getSelfPath('navigation.headingMagnetic.value')
    )
  }

  function relativeBearingDeg (myPos, position) {
    const headingDeg = headingDegrees()
    if ( headingDeg === null ) {
      return null
    }
    return alerts.relativeBearingDeg(headingDeg, geolib.getGreatCircleBearing(myPos, position))
  }

  function checkBuddy(context, name, position, group) {
    const flag = group.flag
    const latch = group.latch
    const isFlagged = app.getPath(`vessels.${context}.${flag}`)
    if ( !isFlagged ) {
      app.debug('found %s: %s', flag, context)
      const value = {}
      value[flag] = true
      app.handleMessage(plugin.id, {
        context: `vessels.${context}`,
        updates: [{
          values: [{
            path: '',
            value
          }]
        }]
      })
    }
    if ( group.alert ) {
      const kname = app.getPath(`/vessels/${context}/name`)
      const myPos = app.getSelfPath('navigation.position.value')
      app.debug('my pos %j', myPos)
      if ( myPos && myPos.latitude && myPos.longitude ) {
        const distance = geolib.getDistance(myPos, position)
        app.debug('%s is %dm away', context, distance)
        const sentName = alerts.displayName(name, kname, context)
        const nameNote = alerts.nameNote(name)
        let nearDetail = alerts.nearDetail(distance, null)
        if ( group.alertBearing ) {
          const rel = relativeBearingDeg(myPos, position)
          if ( rel !== null ) {
            nearDetail = alerts.nearDetail(distance, rel)
          }
        }
        if ( distance < alerts.rangeThresholdM(group.alertDistance) ) {
          const sent = latch[context]
          const path = `notifications.${group.notif}.${context}`
          const existing = app.getSelfPath(path)

          let method = [ "visual", "sound" ]
          if ( existing && existing.value && existing.value.state !== 'normal' ) {
            method = existing.value.method
          }
          
          app.debug('sent: %j', sent)
          if ( alerts.shouldSendAlert({
            sent,
            sentName,
            distance,
            resendAlerts: group.resendAlerts,
            resendAlertDistance: group.resendAlertDistance
          }) ) {
            app.debug('send notification for %s', context)
            latch[context] = { name: sentName, distance }
            app.handleMessage(plugin.id, {
              updates: [{
                values: [{
                  path,
                  value: {
                    state: 'alert',
                    method,
                    message: alerts.nearMessage(sentName, name, nearDetail, group.discord)
                  }
                }]
              }]
            })
          }
        } else if ( latch[context] ) {
          app.debug('clear notification for %s', context)
          delete latch[context]
          app.handleMessage(plugin.id, {
            updates: [{
              values: [{
                path: `notifications.${group.notif}.${context}`,
                value: {
                  state: 'normal',
                  method: [],
                  message: `Your buddy ${sentName}${nameNote}${alerts.discordNote(group.discord)} is away`
              }
              }]
            }]
          })
        }
      }
    }
  }

  plugin.stop = function() {
    if ( shareState.timer ) {
      clearInterval(shareState.timer)
      shareState.timer = null
    }
    shareState.shareOn = false
    stopSuscriptions()
  }

  function stopSuscriptions() {
    unsubscribes.forEach(f => f())
    unsubscribes = []
    stopSkSubscriptions()
  }

  function unwrapSelf (path) {
    return directory.unwrapPath(app.getSelfPath(path))
  }

  function pushShare (share) {
    const id = directory.identityFromSelf(unwrapSelf('mmsi'), unwrapSelf('name'))
    if ( !id.ok ) {
      app.setProviderError(id.error)
      return
    }
    const days = directory.clampShareDays(shareState.props && shareState.props.skShareDays)
    const body = directory.sharePayload({
      mmsi: id.mmsi,
      name: id.name,
      share,
      days,
      discord: shareState.props && shareState.props.skDiscord
    })
    enqueueShare({ share: !!share, body })
  }
  
  plugin.id = "signalk-buddylist-plugin"
  plugin.name = "Buddy List"
  plugin.description = "Provides a buddy list for Signal K Node Server"

  plugin.feature = "buddies"
  plugin.getOpenApi = () => require('./openApi.json')
  plugin.registerWithRouter = function (router) {
    router.get('/refresh', (req, res) => {
      res.type('html').send(`<!doctype html>
<meta charset="utf-8">
<title>Refresh Signal K buddies</title>
<body style="font-family:sans-serif;margin:2rem">
<p>GET the directory and update the cache on this server. This vessel is omitted from the list.</p>
<form method="post" action="refresh">
  <button type="submit">Refresh now</button>
</form>
</body>`)
    })
    router.post('/refresh', (req, res) => {
      if ( !shareState.props ) {
        res.status(409).json({ error: 'plugin not started' })
        return
      }
      refreshSkRoster(shareState.props).then(() => {
        res.json({
          ok: true,
          status: shareState.props.skRosterStatus,
          roster: shareState.roster
        })
      }).catch(err => {
        res.status(502).json({ error: err.message })
      })
    })
  }

  plugin.schema = {
    type: "object",
    properties: {
      personalHeading: {
        type: 'object',
        title: 'Personal buddies',
        description: 'Manual URN list. Alert options in this section apply only to that list.',
        properties: {}
      },
      buddies: {
        type: "array",
        title: "Buddies",
        items: {
          type: "object",
          required: [ 'urn' ],
          properties: {
            urn: {
              type: 'string',
              title: 'URN',
              description: 'The Signal K urn of the buddy (ex: urn:mrn:imo:mmsi:123456)',
              default: 'urn:mrn:imo:mmsi:'
            },
            name: {
              type: 'string',
              title: 'Name',
              description: 'Optional name of the buddy'
            }
          }
        }
      },
      alert: {
        type: 'boolean',
        title: 'Alert',
        description: 'Send a notification when a buddy is near',
        default: true
      },
      alertDistance: {
        type: 'number',
        title: 'Alert Distance',
        description: 'Send the notification when a buddy is this near (NM)',
        default: 1
      },
      alertBearing: {
        type: 'boolean',
        title: 'Show bearing',
        description: 'Include buddy bearing relative to heading in the notification (0° ahead)',
        default: false
      },
      resendAlerts: {
        type: 'boolean',
        title: 'Resend Alerts',
        description: 'Send again while a buddy stays near. If Resend when distance changes is 0, every position; otherwise only after that many metres.',
        default: false
      },
      resendAlertDistance: {
        type: 'number',
        title: 'Resend when distance changes (m)',
        description: 'Only used when Resend Alerts is on. 0 = every position; otherwise resend after this many metres.',
        default: 0
      },
      signalkHeading: {
        type: 'object',
        title: 'Signal K buddies',
        description: 'Opt-in where boatname and MMSI are shared.',
        properties: {}
      },
      skShare: {
        type: 'boolean',
        title: 'Share this vessel',
        description: 'POST this vessel MMSI, name, and optional Discord username to the directory.',
        default: false
      },
      skShareDays: {
        type: 'number',
        title: 'Share for (days)',
        description: 'Lease length. Renewed at half this time when the directory is reachable. Default 90.',
        default: 90
      },
      skDiscord: {
        type: 'string',
        title: 'Discord username',
        description: 'Optional. Shared with the directory so others can ping you. Leading @ is stripped. Letters, numbers, underscore, and period; max 32.',
        default: '',
        maxLength: 32
      },
      skAlert: {
        type: 'boolean',
        title: 'Alert',
        description: 'Send a notification when an opted-in Signal K buddy is near (AIS match)',
        default: true
      },
      skAlertDistance: {
        type: 'number',
        title: 'Alert Distance',
        description: 'Send the notification when a Signal K buddy is this near (NM)',
        default: 1
      },
      skAlertBearing: {
        type: 'boolean',
        title: 'Show bearing',
        description: 'Include relative bearing in the Signal K buddy notification (0° ahead)',
        default: false
      },
      skResendAlerts: {
        type: 'boolean',
        title: 'Resend Alerts',
        description: 'Send again while a Signal K buddy stays near. If Resend when distance changes is 0, every position; otherwise only after that many metres.',
        default: false
      },
      skResendAlertDistance: {
        type: 'number',
        title: 'Resend when distance changes (m)',
        description: 'Only used when Resend Alerts is on. 0 = every position; otherwise resend after this many metres.',
        default: 0
      },
      skRosterStatus: {
        type: 'string',
        title: 'Directory status',
        description: 'Cached count on this server (this vessel omitted), and the date and time of the last successful HTTP GET (UTC). Reload this page after Save to see an update.',
        default: 'None loaded. No successful GET yet',
        readOnly: true
      },
      skRosterRefresh: {
        type: 'boolean',
        title: 'Refresh now',
        description: 'Tick, then Save, to GET the directory now.',
        default: false
      }
    }
  }

  plugin.uiSchema = {}

  return plugin;
}
