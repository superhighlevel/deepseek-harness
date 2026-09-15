/**
 * Verifies the speech player's lifetime contract outside React: playback must
 * survive a subscriber unmounting, and an explicit stop must still stop it.
 * Run with: node scripts/verify-player.mjs
 */

/** Minimal Audio stand-in recording the calls that matter. */
class FakeAudio {
  static instances = []
  constructor(url) {
    this.url = url
    this.paused = false
    this.ended = null
    this.errored = null
    FakeAudio.instances.push(this)
  }
  play() { this.paused = false; return Promise.resolve() }
  pause() { this.paused = true }
}

const revoked = []
globalThis.Audio = FakeAudio
globalThis.URL.createObjectURL = () => 'blob:fake'
globalThis.URL.revokeObjectURL = (url) => { revoked.push(url) }

let fetchCalls = 0
globalThis.fetch = async () => {
  fetchCalls += 1
  return { ok: true, blob: async () => ({ size: 1234 }) }
}

const { speechPlayer } = await import('../lib/types/client/player.js')

const req = (id) => ({
  messageId: id, text: 'hello', voice: 'af_heart', speed: 1, path: '/api/tts.speech',
})

let notifications = 0
const unsubscribe = speechPlayer.subscribe(() => { notifications += 1 })

const results = []
const check = (name, pass) => results.push({ name, pass })

// 1. Starting a read reaches 'playing'.
speechPlayer.toggle(req('m1'))
await new Promise(r => setTimeout(r, 20))
check('reaches playing', speechPlayer.getSnapshot().status === 'playing')

// 2. THE REGRESSION: a control unmounting must not stop the audio.
unsubscribe()
const audioAfterUnmount = FakeAudio.instances.at(-1)
check('audio not paused by unmount', audioAfterUnmount.paused === false)
check('still playing after unmount', speechPlayer.getSnapshot().status === 'playing')

// 3. A second read for the SAME message toggles it off.
const u2 = speechPlayer.subscribe(() => {})
speechPlayer.toggle(req('m1'))
await new Promise(r => setTimeout(r, 10))
check('toggle stops same message', speechPlayer.getSnapshot().status === 'idle')
check('pause called on stop', audioAfterUnmount.paused === true)
check('blob url revoked on stop', revoked.includes('blob:fake'))

// 4. A different message while one plays switches the read.
audioAfterUnmount.paused = false
speechPlayer.toggle(req('m2'))
await new Promise(r => setTimeout(r, 20))
check('second message plays', speechPlayer.getSnapshot().status === 'playing'
  && speechPlayer.getSnapshot().messageId === 'm2')

u2()
console.log(JSON.stringify({ results, fetchCalls, notifications }, null, 2))
const failed = results.filter(r => !r.pass)
console.log(failed.length === 0 ? 'ALL PASS' : `FAILED: ${failed.map(f => f.name).join(', ')}`)
process.exit(failed.length === 0 ? 0 : 1)
