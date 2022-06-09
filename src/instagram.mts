// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { insta_post } from '@phaticusthiccy/open-apis'
import fetch from 'node-fetch'

export const INSTAGRAM_URL_REGEX = /instagram.com\/([^/?]+)/

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
  const response = await fetch(`https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`, {
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9,ru-RU;q=0.8,ru;q=0.7',
      'sec-fetch-dest': 'empty',
      'sec-fetch-mode': 'cors',
      'sec-fetch-site': 'same-site',
      'x-asbd-id': '198387',
      'x-csrftoken': 'XDLBFaJcn3RbfHFvUfUI4qUM1QF6ogFs',
      'x-ig-app-id': '1217981644879628',
      'x-ig-www-claim': 'hmac.AR368FDP3WiHnUXKV-niyHOu9DMzyouyRWKFpqDLWbu9YvXW',
      cookie:
        'ig_did=11EEB32A-4D72-412C-B4BC-3CADF8B870E9; ig_nrcb=1; mid=YkNXcQAEAAG4N4CdtjA0-cGUIX09; csrftoken=XDLBFaJcn3RbfHFvUfUI4qUM1QF6ogFs; ds_user_id=1247838571; sessionid=1247838571%3AQrFHZi8VOJ34Ri%3A12; datr=nrCZYhA_NifujwNj_mKmqDGF; shbid="13572\\0541247838571\\0541686119303:01f7394ad3fc8a7bf6c1dcce1190c5fc72fa8a0728d1a6946be37e8ad15a9e462c045708"; shbts="1654583303\\0541247838571\\0541686119303:01f7a5c820f7772ec32d4c23396db7bc23d7e4738fa8609e7578a1f0e4656dae55cc8144"; dpr=2.75; rur="LDC\\0541247838571\\0541686310875:01f7f21c6fcf98514b73b84c1c62aaadc299d01b4190952a483548e7868b51a38dfc4a72"',
      Referer: 'https://www.instagram.com/',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    },
    body: null,
    method: 'GET',
  })

  const data = (await response.json()) as { data?: { user?: { id: string; follows_viewer: boolean } } }

  const user = data?.data?.user

  if (!user) {
    throw new Error('instagram_user_not_found')
  }

  return user
}
