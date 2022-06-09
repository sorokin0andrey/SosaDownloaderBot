import fetch from 'node-fetch'
import { SocksProxyAgent } from 'socks-proxy-agent'

const agent = new SocksProxyAgent('socks5h://127.0.0.1:9050')

export interface ITrillerVideo {
  video_url: string
  video_uuid: string
  width: number
  height: number
}

const checkin = async () => {
  await fetch('https://social.triller.co/v1.5/user/checkin', {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
      authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsImlhdCI6MTY1NDc3NjM5MywiZXhwIjoxNzA2NjE2MzkzfQ.eyJpZCI6IjU0MzE2NDM4MiIsInVzZXJfdXVpZCI6Ijk3ZGYzNzhhLWRjMGUtNGRhMS1iODc5LTM3MTBlZTZmNjIwZSJ9.uvuCSMDdALXWGg7mjQrcUzq5Bn-9zaEHl0nNA2NxaCc',
      'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
    referrerPolicy: 'same-origin',
    body: null,
    method: 'POST',
    agent,
  })
}

const getUserId = async (username: string) => {
  const response = await fetch(`https://social.triller.co/v1.5/api/users/by_username/${username}`, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
      authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsImlhdCI6MTY1NDc3NjM5MywiZXhwIjoxNzA2NjE2MzkzfQ.eyJpZCI6IjU0MzE2NDM4MiIsInVzZXJfdXVpZCI6Ijk3ZGYzNzhhLWRjMGUtNGRhMS1iODc5LTM3MTBlZTZmNjIwZSJ9.uvuCSMDdALXWGg7mjQrcUzq5Bn-9zaEHl0nNA2NxaCc',
      'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
    referrerPolicy: 'same-origin',
    body: null,
    method: 'GET',
    agent,
  })

  const data = (await response.json()) as { user: { user_id: string } }

  return data.user.user_id
}

const getVideos = async (userId: string): Promise<ITrillerVideo[]> => {
  const response = await fetch(`https://social.triller.co/v1.5/api/users/${userId}/videos?limit=10000`, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
      authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsImlhdCI6MTY1NDc3NjM5MywiZXhwIjoxNzA2NjE2MzkzfQ.eyJpZCI6IjU0MzE2NDM4MiIsInVzZXJfdXVpZCI6Ijk3ZGYzNzhhLWRjMGUtNGRhMS1iODc5LTM3MTBlZTZmNjIwZSJ9.uvuCSMDdALXWGg7mjQrcUzq5Bn-9zaEHl0nNA2NxaCc',
      'sec-ch-ua': '" Not A;Brand";v="99", "Chromium";v="98", "Google Chrome";v="98"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
    referrerPolicy: 'same-origin',
    body: null,
    method: 'GET',
    agent,
  })

  const data = (await response.json()) as {
    videos: ITrillerVideo[]
  }

  return data.videos
}

const parseUrl = async (url: string) => {
  const { url: unshortenedUrl } = await fetch(url, { agent })

  const data = unshortenedUrl.match('https://triller.co/@([^/]+)/video/([^/]+)')

  const username = data?.[1]
  const videoUUID = data?.[2]

  if (!username || !videoUUID) {
    throw new Error('unvalid url')
  }

  return { username, videoUUID }
}

export const getTrillerVideoByLink = async (link: string) => {
  const { username, videoUUID } = await parseUrl(link)

  // await checkin()

  const userId = await getUserId(username)

  const videos = await getVideos(userId)

  const video = videos.find((video) => video.video_uuid == videoUUID)

  if (!video) {
    throw new Error('Video is not found')
  }

  return video
}

export const isTrillerLink = (link: string) => {
  return /v.triller.co\/([^/]+)/.test(link) || /triller.co\/@([^/]+)\/video\/([^/]+)/.test(link)
}
