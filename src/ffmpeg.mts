import { execFileSync } from 'child_process'
import filenamify from 'filenamify'
import ffmpeg from 'fluent-ffmpeg'
import { Preview } from 'spotify-url-info'
import Downloader from 'nodejs-file-downloader'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import cwebp from 'cwebp-bin'
import { logger } from './logger.mjs'

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

const timemarkToSeconds = (timemark: string) => {
  const match = timemark.match(/(.*):(.*):(.*)/)

  if (!match) {
    return 0
  }

  const [hours, minutes, seconds] = [match[1], match[2], match[3]].map(Number)

  const sum = hours * 3600 + minutes * 60 + seconds

  return Math.ceil(sum)
}

export const getAudio = async (params: IGetAudioBufferParams) => {
  const { source, title, format = 'mp3', duration = 0, onProgress = () => null } = params

  const filename = `${filenamify(title)}.${format}`

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const _buf: Uint8Array[] = []

    const timeoutId = setTimeout(() => reject(), 40000)

    ffmpeg(source)
      .audioBitrate(320)
      .toFormat(format)
      .on('progress', (progress) => {
        const ratio = Math.min(timemarkToSeconds(progress.timemark) / duration, 1)
        onProgress(ratio)
      })
      .on('error', (err) => reject(err))
      .on('stderr', (stderrLine) => {
        logger.info('Stderr output: ' + stderrLine)
      })
      .pipe()
      .on('data', (chunk) => _buf.push(chunk))
      .on('end', () => {
        clearTimeout(timeoutId)
        resolve(Buffer.concat(_buf))
      })
      .on('error', (err) => {
        clearTimeout(timeoutId)
        reject(err)
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
