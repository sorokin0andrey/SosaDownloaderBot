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

  const command = ffmpeg(stream)
    .audioBitrate(320)
    .toFormat('mp3')
    .on('progress', (progress) => onProgress(timemarkToSeconds(progress.timemark) / totalDuration))
    .on('stderr', function(stderrLine) {
      console.log('Stderr output: ' + stderrLine);
    })
    .on('error', function(err, stdout, stderr) {
      console.log('Cannot process video: ' + err.message);
    })

  const ffstream = command.pipe()

  const buffer = await new Promise<Buffer>((resolve) => {
    let _buf: Uint8Array[] = []

    ffstream.on('data', (chunk) => _buf.push(chunk))

    ffstream.on('end', () => resolve(Buffer.concat(_buf)))
  })

  return { info, buffer }
}

export const isYoutubeLink = (link: string) => ytdl.validateURL(link);