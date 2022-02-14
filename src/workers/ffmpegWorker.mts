import { parentPort, workerData } from 'worker_threads'
import ffmpeg from 'fluent-ffmpeg'
import { logger } from '../logger.mjs'
import { WorkerMessage } from '../types.mjs'

const { source, format, duration } = workerData

const postMessage = (message: WorkerMessage) => {
  parentPort?.postMessage(message)
}

const timemarkToSeconds = (timemark: string) => {
  const match = timemark.match(/(.*):(.*):(.*)/)

  if (!match) {
    return 0
  }

  const [hours, minutes, seconds] = [match[1], match[2], match[3]].map(Number)

  const sum = hours * 3600 + minutes * 60 + seconds

  return Math.ceil(sum)
}

new Promise<Uint8Array[]>((resolve, reject) => {
  const _buf: Uint8Array[] = []

  const timeoutId = setTimeout(() => reject(), 60000)

  ffmpeg(source)
    .audioBitrate(320)
    .toFormat(format)
    .on('progress', (progress) => {
      const ratio = Math.min(timemarkToSeconds(progress.timemark) / duration, 1)
      postMessage({ type: 'progress', progress: ratio })
    })
    .on('error', (err) => reject(err))
    .on('stderr', (stderrLine) => {
      logger.info('Stderr output: ' + stderrLine)
    })
    .pipe()
    .on('data', (chunk) => _buf.push(chunk))
    .on('end', () => {
      clearTimeout(timeoutId)
      resolve(_buf)
    })
    .on('error', (err) => {
      clearTimeout(timeoutId)
      reject(err)
    })
})
  .then((buffer) => {
    postMessage({ type: 'success', buffer })
  })
  .catch((error) => {
    postMessage({ type: 'error', error: String(error) })
  })
