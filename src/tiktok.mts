// @ts-ignore
import { tiktokdownload } from 'tiktok-scraper-without-watermark'

export const getTikTokVideoURLByLink = async (link: string) => {
  const videoMeta = await tiktokdownload(link)

  const videoURL = videoMeta?.nowm as string

  if (!videoURL) {
    throw new Error('Video is not found')
  }

  return videoURL
}

export const isTikTokLink = (link: string) => {
  return (
    // https://vm.tiktok.com/ZSe4KwauS
    /vm.tiktok.com\/(.+)/.test(link) ||
    // https://www.tiktok.com/@ivyvibing/video/7054217932519394566
    /tiktok.com\/(.+)\/video\/(.+)/.test(link)
  )
}
