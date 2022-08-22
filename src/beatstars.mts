import fetch from 'node-fetch'
import { tall } from 'tall'
import ytdl from 'ytdl-core'
import ytsr from 'ytsr'
import { getAudio } from './ffmpeg.mjs'

const BEATSTARS_REGEX = /beatstars.com\/(.+)-([^/?]+)/
const BEATSTARS_SHORT_REGEX = /bsta.rs\/([^/?]+)/

const getFixedDuration = (input: number | string) => {
  const match = String(input).match(/(.*):(.*)/)

  if (!match) {
    return 0
  }

  const [minutes, seconds] = [match[1], match[2]].map(Number)

  const sum = minutes * 60 + seconds

  return Number.isInteger(sum) ? sum : 0
}

const getBeatstarsInfo = async (id: string) => {
  const response = await fetch('https://core.prod.beatstars.net/graphql?op=getNewTrackV3', {
    headers: {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
      app: 'WEB_MARKETPLACE',
      'content-type': 'application/json',
      'sec-ch-ua': '"Chromium";v="104", " Not A;Brand";v="99", "Google Chrome";v="104"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'cross-site',
      uuid: '98d2dee6-68e0-4e60-a3b3-d3625cdf8778',
      Referer: 'https://www.beatstars.com/',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: `{\"operationName\":\"getNewTrackV3\",\"variables\":{\"id\":\"TK${id}\"},\"query\":\"query getNewTrackV3($id: String!, $exclusiveAccess: String) {\\n  track(id: $id, exclusiveAccess: $exclusiveAccess) {\\n    ...MpTrackV3Data\\n    activeCollaborations {\\n      ...MpItemCollaboratorProfile\\n      __typename\\n    }\\n    __typename\\n  }\\n}\\n\\nfragment MpTrackV3Data on Track {\\n  id\\n  description\\n  releaseDate\\n  status\\n  streamUrl\\n  title\\n  category\\n  v2Id\\n  shareUrl\\n  price\\n  url\\n  socialInteractions(actions: [LIKE, FOLLOW, REPOST])\\n  bundle {\\n    hls {\\n      url\\n      duration\\n      __typename\\n    }\\n    stream {\\n      duration\\n      url\\n      __typename\\n    }\\n    __typename\\n  }\\n  seoMetadata {\\n    ...MpSeoMetadata\\n    __typename\\n  }\\n  metadata {\\n    ...MpItemMetadata\\n    keyNote {\\n      key\\n      value\\n      __typename\\n    }\\n    __typename\\n  }\\n  activities {\\n    ...MpItemActivities\\n    __typename\\n  }\\n  profile {\\n    ...MpItemOwnerProfile\\n    __typename\\n  }\\n  artwork {\\n    ...MpItemArtwork\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment MpSeoMetadata on SeoMetadata {\\n  description\\n  image\\n  slug\\n  url\\n  __typename\\n}\\n\\nfragment MpItemMetadata on Metadata {\\n  offerOnly\\n  free\\n  exclusive\\n  tags\\n  bpm\\n  __typename\\n}\\n\\nfragment MpItemActivities on Activities {\\n  comment\\n  follow\\n  like\\n  play\\n  purchase\\n  rePost\\n  follow\\n  __typename\\n}\\n\\nfragment MpItemOwnerProfile on Profile {\\n  displayName\\n  username\\n  badges\\n  achievements\\n  location\\n  v2Id\\n  memberId\\n  avatar {\\n    assetId\\n    sizes {\\n      mini\\n      __typename\\n    }\\n    __typename\\n  }\\n  __typename\\n}\\n\\nfragment MpItemArtwork on Image {\\n  fitInUrl(width: 700, height: 700)\\n  sizes {\\n    small\\n    medium\\n    mini\\n    __typename\\n  }\\n  assetId\\n  __typename\\n}\\n\\nfragment MpItemCollaboratorProfile on Collaboration {\\n  guestCollaborator {\\n    displayName\\n    username\\n    badges\\n    v2Id\\n    memberId\\n    avatar {\\n      assetId\\n      sizes {\\n        mini\\n        __typename\\n      }\\n      __typename\\n    }\\n    __typename\\n  }\\n  collaborationRole {\\n    key\\n    verboseName\\n    __typename\\n  }\\n  __typename\\n}\\n\"}`,
    method: 'POST',
  })

  const data = (await response.json()) as {
    data: {
      track: { streamUrl: string; title: string; metadata: { bpm: number }; bundle: { hls: { duration: number } } }
    }
  }

  const streamUrl = data?.data?.track?.streamUrl
  const title = data?.data?.track?.title
  const bpm = data?.data?.track?.metadata?.bpm
  const duration = data?.data?.track?.bundle?.hls?.duration

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

    if (diff > 1) {
      return null
    }

    const info = await ytdl.getInfo(item.id)

    const { url } = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' })

    return { url, duration: itemDuration }
  } catch {}

  return null
}

const parseUrl = async (link: string) => {
  const url = BEATSTARS_SHORT_REGEX.test(link) ? await tall(link) : link

  const match = url.match(BEATSTARS_REGEX)

  return match?.[2] || null
}

export const getBeatstarsAudio = async (link: string, onProgress: (progress: number) => void) => {
  const id = await parseUrl(link)

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

export const isBeatstarsLink = (link: string) => BEATSTARS_REGEX.test(link) || BEATSTARS_SHORT_REGEX.test(link)
