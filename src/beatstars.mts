import fetch from 'node-fetch'
import ytdl from 'ytdl-core'
import ytsr from 'ytsr'
import { getAudio } from './ffmpeg.mjs'

const BEATSTARS_REGEX = /beatstars.com\/(.+)-([^/?]+)/

const getFixedDuration = (input: string) => {
  const match = input.match(/(.*):(.*)/)

  if (!match) {
    return 0
  }

  const [minutes, seconds] = [match[1], match[2]].map(Number)

  const sum = minutes * 60 + seconds

  return Number.isInteger(sum) ? sum : 0
}

const getBeatstarsInfo = async (id: string) => {
  const response = await fetch(`https://main.v2.beatstars.com/beat?id=${id}&fields=details,stats,licenses`, {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
      app: 'PROPAGE',
      authorization: 'Bearer 4t9GB-9LtgGaQN34cn0P11WeurI',
      'sec-ch-ua': '" Not;A Brand";v="99", "Google Chrome";v="97", "Chromium";v="97"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      uuid: 'abed0d01-d746-cb7b-e906-27cc75a8c2e1',
      Referer: 'https://lxurentg.beatstars.com/',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: null,
    method: 'GET',
  })

  const data = (await response.json()) as any

  const streamUrl = data?.response?.data?.details?.stream_hls_url as string
  const title = data?.response?.data?.details?.title as string
  const bpm = data?.response?.data?.details?.bpm as number
  const duration = data?.response?.data?.details?.duration as string

  if (!streamUrl || !title || !duration) {
    throw new Error('unvalid url')
  }

  return { streamUrl, title, bpm, duration: getFixedDuration(duration) }
}

const tryFindOnYouTube = async (title: string, duration: number) => {
  try {
    const results = await ytsr(title, { pages: 1 })

    const item = results.items[0]

    if (item.type !== 'video' || !item.duration) {
      return null
    }

    const itemDuration = getFixedDuration(item.duration)

    const diff = Math.abs(duration - itemDuration)

    console.log('duration', duration, itemDuration, diff)

    if (diff > 1) {
      return null
    }

    const info = await ytdl.getInfo(item.id)

    const { url } = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' })

    return { url, duration: itemDuration }
  } catch {}

  return null
}

export const getBeatstarsId = (link: string) => {
  const match = link.match(BEATSTARS_REGEX)

  return match?.[2] || null
}

export const getBeatstarsAudio = async (link: string, onProgress: (progress: number) => void) => {
  const id = getBeatstarsId(link)

  if (!id) {
    throw new Error('invalid link')
  }

  const info = await getBeatstarsInfo(id)

  //const youtube = await tryFindOnYouTube(info.title, info.duration)

  const title = info.bpm ? `${info.bpm} BPM ${info.title}` : info.title

  const format = 'mp3'

  const source = info.streamUrl

  const duration = info.duration

  const { buffer, filename } = await getAudio({ source, title, format, duration, onProgress })

  return { info, buffer, filename, duration }
}

export const isBeatstarsLink = (link: string) => BEATSTARS_REGEX.test(link)
