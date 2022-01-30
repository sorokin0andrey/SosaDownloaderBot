import filenamify from 'filenamify'
import ffmpeg from 'fluent-ffmpeg'

interface IGetAudioBufferParams {
  source: string
  title: string
  format?: 'mp3' | 'wav'
  duration?: number
  onProgress?: (progress: number) => void
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
        console.log('Stderr output: ' + stderrLine)
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
