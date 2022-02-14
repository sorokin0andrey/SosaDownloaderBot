import { execFileSync } from 'child_process'
import { Worker } from 'worker_threads'
import filenamify from 'filenamify'
import ffmpeg from 'fluent-ffmpeg'
import { Preview } from 'spotify-url-info'
import Downloader from 'nodejs-file-downloader'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import cwebp from 'cwebp-bin'
import { logger } from './logger.mjs'
import { WorkerMessage } from './types.mjs'

interface IGetAudioBufferParams {
  source: string
  title: string
  format?: 'mp3' | 'wav'
  duration?: number
  onProgress?: (progress: number) => void
}

export interface IPromoteVideo {
  source: string
  duration: number
  width: number
  height: number
}

export const getAudio = async (params: IGetAudioBufferParams) => {
  const { source, title, format = 'mp3', duration = 0, onProgress = () => null } = params

  const filename = `${filenamify(title)}.${format}`

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const worker = new Worker('./build/workers/ffmpegWorker.mjs', { workerData: { source, format, duration } })

    worker.on('error', reject)

    worker.on('message', (message: WorkerMessage) => {
      if (message.type === 'error') {
        reject(message.error)
      }

      if (message.type === 'success') {
        resolve(Buffer.concat(message.buffer))
      }

      if (message.type === 'progress') {
        onProgress(message.progress)
      }
    })
  })

  if (buffer.length === 0) {
    throw new Error('Buffer is empty')
  }

  return { buffer, filename }
}

export const makePromoteVideo = async (preview: Preview): Promise<IPromoteVideo> => {
  const duration = 30
  const size = 640

  const downloader = new Downloader({ url: preview.image, onBeforeSave: () => 'promote.jpg' })

  await downloader.download()

  execFileSync(cwebp, ['promote.jpg', '-q', '100', '-o', 'promote.webp'])

  const source = await new Promise<string>((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(), 40000)

    const format = 'mp4'

    const filename = `promote.${format}`

    ffmpeg()
      .addInput('promote.webp')
      .addInput(preview.audio)
      .videoCodec('libx264')
      .size(`${size}x${size}`)
      .duration(duration)
      .saveToFile(filename)
      .on('error', (err) => {
        clearTimeout(timeoutId)
        reject(err)
      })
      .on('stderr', (stderrLine) => {
        logger.info('Stderr output: ' + stderrLine)
      })
      .on('end', () => {
        clearTimeout(timeoutId)
        resolve(filename)
      })
  })

  return { source, duration, width: size, height: size }
}
