import ytdl from 'ytdl-core'
import { getAudio } from './ffmpeg.mjs'

export const getYoutubeAudio = async (link: string, onProgress: (progress: number) => void) => {
  const id = ytdl.getVideoID(link)

  const info = await ytdl.getInfo(id)

  const title = info.videoDetails.title

  const duration = Number(info.videoDetails.lengthSeconds)

  if (duration > 10 * 60) {
    throw new Error(`video is too long (${duration} sec)`)
  }

  const format = 'mp3'

  const { url } = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' })

  const { buffer, filename } = await getAudio({ source: url, title, format, duration, onProgress })

  return { info, buffer, filename, duration }
}

export const isYoutubeLink = (link: string) => ytdl.validateURL(link)
