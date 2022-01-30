import ytdl from 'ytdl-core'
import ffmpeg from 'fluent-ffmpeg'

const timemarkToSeconds = (timemark: string) => {
  const match = timemark.match(/(.*):(.*):(.*)/)

  if (!match) {
    return 0
  }

  const [hours, minutes, seconds] = [match[1], match[2], match[3]].map(Number)

  const sum = hours * 3600 + minutes * 60 + seconds

  return Math.ceil(sum)
}

export const getYoutubeAudio = async (link: string, onProgress: (progress: number) => void) => {
  const id = ytdl.getVideoID(link)

  const info = await ytdl.getInfo(id)

  const totalDuration = Number(info.videoDetails.lengthSeconds)

  const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' })

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const _buf: Uint8Array[] = []

    const timeoutId = setTimeout(() => reject(), 40000)

    ffmpeg(format.url)
      .audioBitrate(320)
      .toFormat('mp3')
      .on('progress', (progress) => onProgress(timemarkToSeconds(progress.timemark) / totalDuration))
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

  return { info, buffer }
}

export const isYoutubeLink = (link: string) => ytdl.validateURL(link)
