const serverOptions = {
  googleEmail: process.env.GOOGLE_EMAIL,
  googlePassword: process.env.GOOGLE_PASS,
  apiKey: process.env.API_KEY
}
const airProxyHost = process.env.AIRPROXY_HOST
const airProxyPort = process.env.AIRPROXY_PORT || 5000

const AirTunes = require('airtunes').AirTunes
const Server = require('./server')
const server = new Server(serverOptions, (cb) => {
  const player = new AirTunes()
  let stopped = false
  player.on('buffer', (status) => {
    console.log('AirPlay status:', status)
    if (status === 'end' && !stopped) {
      stopped = true
      player.stopAll(() => {
        console.log('All devices stopped')
      })
    }
  })

  const device = player.add(airProxyHost, { port: airProxyPort })
  device.on('status', (status) => {
    console.log('Device status:', status)
  })

  cb(null, player)
})

server.listen(3000, () => {
  console.log('Listening on port 3000')
})

// const Speaker = require('speaker')
// const speaker = new Speaker({
//   channels: 2,          // 2 channels
//   bitDepth: 16,         // 16-bit samples
//   sampleRate: 44100     // 44,100 Hz sample rate
// })
// cb(null, speaker)