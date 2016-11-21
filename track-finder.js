class TrackFinder {

  constructor(pm) {
    this.pm = pm
  }

  getTracksInAlbumByArtist(album, artist, cb) {
    const term = artist ? artist + ' ' + album : album
    this.searchByType(term, 'album', (error, result) => {
      if (error) return cb(error)
      if (!result) return cb()
      this.pm.getAlbum(result.albumId, true, (error, data) => {
        if (error) return cb(error)
        cb(null, { meta: { artist: data.artist, album: data.name }, tracks: data.tracks })
      })
    })
  }

  getTracksByArtist(artist, cb) {
    this.searchByType(artist, 'artist', (error, result) => {
      if (error) return cb(error)
      if (!result) return cb()
      this.pm.getArtist(result.artistId, false, 1000, 0, (error, data) => {
        if (error) return cb(error)
        cb(null, { meta: { artist: result.name }, tracks: data.topTracks })
      })
    })
  }

  getTrack(title, cb) {
    this.searchByType(title, 'track', (error, track) => {
      if (error) return cb(error)
      if (!track) return cb()
      cb(error, { meta: { track: track.title, artist: track.artist }, tracks: [ track ] })
    })
  }

  searchByType(value, type, cb) {
    this.pm.search(value, 100, (error, data) => {
      if (error) return cb(error)
      if (!data.entries) return cb(new Error('no results'))
      const items = data.entries.filter((item) => {
        if (item[type]) return true
      })
      if (!items.length) return cb()
      const bestMatch = items[0][type]
      cb(null, bestMatch)
    })
  }

  getTracksInPlaylist(playlist, cb) {
    this.pm.getPlayLists((error, data) => {
      if (error) return cb(error)
      const items = data.data.items.filter((item) => {
        const regEx = new RegExp('.*' + playlist + '.*', 'i')
        if (item.type === 'USER_GENERATED' && regEx.test(item.name)) {
          return true
        }
      })
      if (!items.length) {
        return cb(new Error('not found'))
      }
      const playlistItem = items[0]
      this.pm.getSharedPlayListEntries({ shareToken: playlistItem.shareToken }, (error, data) => {
        if (error) return cb(error)
        let tracks = data.entries[0].playlistEntry
        tracks = tracks.map((t) => { return t.track })
        cb(null, { meta: { playlist: playlistItem.name }, tracks: tracks })
      })
    })
  }

  getTracksOnStation(station, cb) {
    this.pm.search(station, 100, (error, data) => {
      if (error) return cb(error)
      if (!data.entries || !data.entries.length) return cb()
      data.entries = data.entries.filter((item) => {
        if (item.type === '6' && item.station.seed.seedType === '9') return true
      })
      if (!data.entries.length) return cb()
      const randomlyChosenStation = data.entries[ Math.floor(Math.random() * data.entries.length) ].station
      const name = randomlyChosenStation.name
      const id = randomlyChosenStation.seed.curatedStationId
      this.pm.createStation(name, id, 'station', (error, response) => {
        if (error) return cb(error)
        this.pm.getStationTracks(response.mutate_response[0].id, 100, (error, response) => {
          if (error) return cb(error)
          cb(null, { meta: { station: randomlyChosenStation.name }, tracks: response.data.stations[0].tracks })
        })
      })
    })
  }
}

module.exports = TrackFinder