const EventEmitter = require('events').EventEmitter
const async = require('async')
const lame = require('lame')
const request = require('request')
const through = require('through2')

class Player extends EventEmitter {

  constructor(pm) {
    super()
    this.pm = pm
    this.decoderStream = null
    this.outStream = null
    this.endTrack = null
    this.tracks = []
    this.currentTrackIndex = 0
    this.isPlaying = false
  }

  play(tracks, createOutStream) {
    createOutStream((error, stream) => {
      if (error) throw error
      this.outStream = stream
      this.tracks = tracks
      async.doWhilst(
        (cb) => {
          this.once('trackEnd', () => {
            this.currentTrackIndex++
            cb()
          })
          this.playTrack(this.tracks[this.currentTrackIndex])
        }
        , () => {
          return this.currentTrackIndex <= (this.tracks.length - 1)
        }
        , () => {
          this.isPlaying = false
          console.log('q done')
        }
      )
    })
  }

  playTrack(track) {
    this.isPlaying = true
    console.log('playing:', track.artist, '-', track.album, '-', track.title)
    this.pm.getStreamUrl(track.storeId, (error, res) => {
      if (error) return this.emit('error', error)

      var decoder = new lame.Decoder()
      var mp3Stream = request(res)

      var finished = false

      function endTrack(completelyEnd) {
        if (!finished) {
          finished = true
          this.pause()
          this.previousPlayingTrack = track
          this.emit('trackEnd')
        }
      }

      this.endTrack = endTrack

      mp3Stream.on('error', (error) => {
        console.log('request error:', error)
        endTrack.call(this)
      })

      mp3Stream.on('close', (error) => {
        console.log('closing...')
        endTrack.call(this)
      })

      mp3Stream.on('end', (error) => {
        console.log('ending...')
        endTrack.call(this)
      })

      this.decoderStream = decoder
      mp3Stream.pipe(decoder).pipe(this.outStream)

      this.currentPlayingTrack = track
      this.emit('nextTrack', { artist: track.artist, album: track.album, title: track.title })
    })
  }

  pause() {
    if (this.decoderStream) {
      this.decoderStream.unpipe()
    }
  }

  resume() {
    if (this.decoderStream && this.outStream) {
      this.decoderStream.pipe(this.outStream)
    }
  }

  stop() {
    this.pause()
    if (this.outStream) {
      this.outStream.end()
    }
    this.isPlaying = false
  }

  nextTrack() {
    this.pause()
    if (this.endTrack) {
      this.endTrack()
    }
  }

  meta() {
    if (!this.isPlaying) return null
    const currentTrack = this.tracks[this.currentTrackIndex]
    if (!currentTrack) return null
    return { track: currentTrack.title, album: currentTrack.album, artist: currentTrack.artist }
  }

  previousTrack() {
    this.pause()
    this.currentTrackIndex = this.currentTrackIndex - 2
    if (this.currentTrackIndex < 0) {
      this.currentTrackIndex = -1
    }
    if (this.endTrack) {
      this.endTrack()
    }
  }

}

module.exports = Player