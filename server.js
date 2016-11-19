const EventEmitter = require('events').EventEmitter
const PlayMusic = require('playmusic')
const express = require('express')
const expressRequestSign = require('express-request-sign')
const bodyParser = require('body-parser')
const TrackFinder = require('./track-finder')
const Player = require('./player')

class Server extends EventEmitter {

  constructor(options, outStreamFn) {
    super()

    this.apiKey = options.apiKey
    this.googleEmail = options.googleEmail
    this.googlePassword = options.googlePassword

    this.app = express()
    this.app.use(bodyParser.json())
    this.app.use(expressRequestSign({ key: this.apiKey, maxDifference: 60000 }))

    this.pm = new PlayMusic()
    this.player = null

    this.outStreamFn = outStreamFn

    this.setupRoutes()
  }

  setupRoutes() {
    const routes =
      [ { action: 'pause' }
      , { action: 'resume' }
      , { action: 'stop' }
      , { action: 'nextTrack', path: 'next' }
      , { action: 'previousTrack', path: 'previous' }
      ]

    routes.forEach((route) => {
      const path = route.path ? route.path : route.action
      this.app.get('/' + path, (req, res) => {
        if (this.player) {
          this.player[route.action]()
        }
        console.log(route.action + ' called')
        res.json({ success: true })
      })
    })

    this.app.get('/meta', (req, res) => {
      let meta = null
      if (this.player) {
        meta = this.player.meta()
      }
      return res.json({ success: true, meta: meta })
    })

    this.app.post('/play', (req, res) => {
      console.log('request', req.body)
      if (this.player) {
        this.player.stop()
      }
      this.pm.init({ email: this.googleEmail, password: this.googlePassword }, (error) => {
        if (error) {
          return res.status(500).json({ success: false, error: error.message })
        }
        this.getTracks(req.body, (error, trackData) => {
          if (error) {
            return res.status(500).json({ success: false, error: error.message })
          }
          if (!trackData || (trackData && !trackData.tracks.length)) {
            return res.status(400).json({ success: false, error: 'No tracks found' })
          }
          this.player = new Player(this.pm)
          this.player.play(trackData.tracks, this.outStreamFn)
          trackData.meta.success = true
          console.log('trackMeta', trackData.meta)
          res.json(trackData.meta)
        })
      })
    })

  }

  listen(port, cb) {
    this.app.listen(port, cb)
  }

  getTracks(body, cb) {
    const trackFinder = new TrackFinder(this.pm)
    if (Object.keys(body).length === 1 && body.track) {
      // play track
      trackFinder.getTrack(body.track, cb)
    } else if (Object.keys(body).length === 2 && body.track && body.artist) {
      // play track by artist
      trackFinder.getTrack(body.artist + ' ' + body.track, cb)
    } else if (Object.keys(body).length === 1 && body.artist) {
      // play artist
      trackFinder.getTracksByArtist(body.artist, cb)
    } else if (Object.keys(body).length === 2 && body.album && body.artist) {
      // play album by artist
      trackFinder.getTracksInAlbumByArtist(body.album, body.artist, cb)
    } else if (Object.keys(body).length === 1 && body.playlist) {
      // play playlist
      trackFinder.getTracksInPlaylist(body.playlist, cb)
    } else {
      cb()
    }
  }

}

module.exports = Server