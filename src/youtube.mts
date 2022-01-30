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

  const audioFormats = ytdl.filterFormats(info.formats, 'audioonly')

  const format = ytdl.chooseFormat(audioFormats, { quality: 'highestaudio' })

  const stream = ytdl.downloadFromInfo({ ...info, formats: [format] })

  const buffer = await new Promise<Buffer>((resolve, reject) => {
    const _buf: Uint8Array[] = []

    ffmpeg(stream)
      .audioBitrate(320)
      .toFormat('mp3')
      .on('progress', (progress) => onProgress(timemarkToSeconds(progress.timemark) / totalDuration))
      .on('error', (err) => reject(err))
      .pipe()
      .on('data', (chunk) => _buf.push(chunk))
      .on('end', () => resolve(Buffer.concat(_buf)))
      .on('error', (err) => reject(err))
  })

  return { info, buffer }
}

export const isYoutubeLink = (link: string) => ytdl.validateURL(link)
