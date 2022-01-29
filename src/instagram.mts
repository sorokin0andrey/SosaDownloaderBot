// @ts-ignore
import { insta_post } from '@phaticusthiccy/open-apis'
import fetch from 'node-fetch'

export const INSTAGRAM_URL_REGEX = /instagram.com\/([^/]+)/

export const INSTAGRAM_USERNAME_REGEX = /^(?!.*\.\.)(?!.*\.$)[^\W][\w.]{0,29}$/

export const getInstagramMediaByLink = async (link: string) => {
  const media = (await insta_post(link)) as { url: string }[]

  if (!media) {
    throw new Error('Video is not found')
  }

  return media.map((item) => item.url)
}

export const isInstagramLink = (link: string) => {
  return INSTAGRAM_URL_REGEX.test(link)
}

export const isInstagramUsername = (link: string) => {
  return INSTAGRAM_USERNAME_REGEX.test(link)
}

export const getInstagramProfile = async (username: string) => {
  const response = await fetch(`https://www.instagram.com/${username}/?__a=1`, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
      'sec-ch-ua': '" Not;A Brand";v="99", "Google Chrome";v="97", "Chromium";v="97"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"macOS"',
      'x-asbd-id': '198387',
      'x-ig-app-id': '936619743392459',
      'x-ig-www-claim': 'hmac.AR368FDP3WiHnUXKV-niyHOu9DMzyouyRWKFpqDLWbu9YlKK',
      'x-requested-with': 'XMLHttpRequest',
      cookie:
        'mid=YZ-qGwAEAAFP58XaCA3pL283sS3v; ig_did=B56C5A7A-1A44-4AFB-B421-815207D23B50; ig_nrcb=1; csrftoken=DgbKG3GB14FpzCHrBg5X3CJU65aLgUi1; ds_user_id=1247838571; sessionid=1247838571%3AxhWr6RMuHUeFUv%3A23; ig_direct_region_hint="ASH\\0541247838571\\0541674736457:01f77ef5f1070e6cc3f584080e616b8aa08c9d3c87f90f12535a9941f226ab9a7b6aac15"; shbid="13572\\0541247838571\\0541674856076:01f7a76d840c6c0ca7add6f1af1cf335c99e00cd3c9709210607320b55cc6b4cb1577923"; shbts="1643320076\\0541247838571\\0541674856076:01f77c2a30c6d2455ec36d621e52ad3a1d7c795b9a850d276ae8dd8e5f2cb68a40b2fbed"; rur="FRC\\0541247838571\\0541675000549:01f7ff23eaa54bcf52730f4a27a0962cb18c1bb03b6cc55dcca6cb8dfaa02a2664780d55"',
    },
    body: null,
    method: 'GET',
  })

  const data = (await response.json()) as any

  const user = data?.graphql?.user

  if (!user) {
    throw new Error('instagram_user_not_found')
  }

  return user as { id: string; follows_viewer: boolean }
}
