import fetch from 'node-fetch'
import { tall } from 'tall'

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
        'Bearer eyJhbGciOiJIUzI1NiIsImlhdCI6MTY0MzQzMjEzOCwiZXhwIjoxNjk1MjcyMTM4fQ.eyJpZCI6IjUyOTI2MjYwNiJ9.CPBagBAhTIMvXY5JLIxgdfscy7vlaf8FGyTT9S08v8I',
      'sec-ch-ua': '" Not;A Brand";v="99", "Google Chrome";v="97", "Chromium";v="97"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
    referrerPolicy: 'same-origin',
    body: null,
    method: 'POST',
  })
}

const getUserId = async (username: string) => {
  const response = await fetch(`https://social.triller.co/v1.5/api/users/by_username/${username}`, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
      authorization:
        'Bearer eyJhbGciOiJIUzI1NiIsImlhdCI6MTY0MzQzMjEzOCwiZXhwIjoxNjk1MjcyMTM4fQ.eyJpZCI6IjUyOTI2MjYwNiJ9.CPBagBAhTIMvXY5JLIxgdfscy7vlaf8FGyTT9S08v8I',
      'sec-ch-ua': '" Not;A Brand";v="99", "Google Chrome";v="97", "Chromium";v="97"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
    referrerPolicy: 'same-origin',
    body: null,
    method: 'GET',
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
        'Bearer eyJhbGciOiJIUzI1NiIsImlhdCI6MTY0MzQzMjEzOCwiZXhwIjoxNjk1MjcyMTM4fQ.eyJpZCI6IjUyOTI2MjYwNiJ9.CPBagBAhTIMvXY5JLIxgdfscy7vlaf8FGyTT9S08v8I',
      'sec-ch-ua': '" Not;A Brand";v="99", "Google Chrome";v="97", "Chromium";v="97"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
    },
    referrerPolicy: 'same-origin',
    body: null,
    method: 'GET',
  })

  const data = (await response.json()) as {
    videos: ITrillerVideo[]
  }

  return data.videos
}

const parseUrl = async (url: string) => {
  const unshortenedUrl = await tall(url)

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

  await checkin()

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
