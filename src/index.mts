import { getPreview, Preview } from 'spotify-url-info'
import { Markup, Telegraf } from 'telegraf'
import { ExtraVideo } from 'telegraf/typings/telegram-types'
import { checkAlreadyFollowed, checkFollowing, checkStolenInstagram, getInstagramUsername } from './auth.mjs'
import { getBeatstarsAudio, isBeatstarsLink } from './beatstars.mjs'
import { getUsers, initDB, IUser, saveUser } from './db.mjs'
import { IPromoteVideo, makePromoteVideo } from './ffmpeg.mjs'
import { getInstagramMediaByLink, isInstagramLink } from './instagram.mjs'
import {
  START_SENDING_MESSAGE,
  CAPTION,
  HOW_TO_AUTH_MESSAGE,
  HOW_TO_USE_MESSAGE,
  HELLO_MESSAGE,
  HELLO_INSTRUCTION_MESSAGE,
  STOLEN_MESSAGE,
  ERROR_MESSAGE,
} from './phrases.mjs'
import { getTikTokVideoURLByLink, isTikTokLink } from './tiktok.mjs'
import { getTrillerVideoByLink, isTrillerLink } from './triller.mjs'
import { MessageContext } from './types.mjs'
import { noop } from './utils.mjs'
import { getYoutubeAudio, isYoutubeLink } from './youtube.mjs'

const TELEGRAM_BOT_API_TOKEN = process.env.TELEGRAM_BOT_API_TOKEN
const TELEGRAM_BOT_ADMIN_ID = Number(process.env.TELEGRAM_BOT_ADMIN_ID)

const bot = new Telegraf(TELEGRAM_BOT_API_TOKEN)

const replyWithFollowButton = (ctx: MessageContext, message: string) =>
  ctx.reply(message, Markup.inlineKeyboard([Markup.button.url('Подписаться', 'https://instagram.com/_thecursedsoul')]))

const sendMedia = async (ctx: MessageContext, media: string[]) => {
  console.log('sendMedia', media)

  ctx.reply(START_SENDING_MESSAGE).catch(noop)

  for (const url of media) {
    ctx.replyWithChatAction('upload_document')

    try {
      await ctx.replyWithDocument(url, {
        caption: CAPTION,
      })
    } catch {}
  }
}

const sendVideo = async (ctx: MessageContext, videoURL: string, extras?: ExtraVideo) => {
  console.log('sendVideo', videoURL, extras)

  ctx.reply(START_SENDING_MESSAGE).catch(noop)

  ctx.replyWithChatAction('upload_video').catch(noop)

  if (extras) {
    try {
      await ctx.replyWithVideo(
        { url: videoURL },
        {
          ...extras,
          caption: CAPTION,
        }
      )
    } catch {}
  } else {
    try {
      await ctx.replyWithDocument(videoURL, {
        caption: CAPTION,
      })
    } catch {}
  }
}

const processTrillerLink = async (ctx: MessageContext, link: string) => {
  const { video_url, width, height } = await getTrillerVideoByLink(link)

  await sendVideo(ctx, video_url, { width, height })
}

const processTikTokLink = async (ctx: MessageContext, link: string) => {
  const videoURL = await getTikTokVideoURLByLink(link)

  await sendVideo(ctx, videoURL)
}

const processInstagramLink = async (ctx: MessageContext, link: string) => {
  const media = await getInstagramMediaByLink(link)

  await sendMedia(ctx, media)
}

const processYoutubeLink = async (ctx: MessageContext, link: string) => {
  const msg = await ctx.reply('Выполняю...')

  const onProgress = (progress: number) => {
    ctx.telegram
      .editMessageText(ctx.message.chat.id, msg.message_id, undefined, `Выполняю... ${Math.round(progress * 100)}%`)
      .catch(noop)
  }

  const { buffer, filename, duration } = await getYoutubeAudio(link, onProgress)

  await ctx.replyWithAudio({ source: buffer, filename }, { duration, caption: CAPTION })
}

const processBeatstarsLink = async (ctx: MessageContext, link: string) => {
  const msg = await ctx.reply('Выполняю...')

  const onProgress = (progress: number) => {
    ctx.telegram
      .editMessageText(ctx.message.chat.id, msg.message_id, undefined, `Выполняю... ${Math.round(progress * 100)}%`)
      .catch(noop)
  }

  const { buffer, filename, duration } = await getBeatstarsAudio(link, onProgress)

  await ctx.replyWithAudio({ source: buffer, filename }, { duration, caption: CAPTION })
}

const unauthorizedFlow = async (ctx: MessageContext) => {
  const tgUser = ctx.from
  const text = ctx.message.text

  const instagramUsername = getInstagramUsername(text)

  if (!instagramUsername) {
    return replyWithFollowButton(ctx, HOW_TO_AUTH_MESSAGE).catch(null)
  }

  const stolen = checkStolenInstagram(tgUser.id, instagramUsername)

  if (stolen) {
    return ctx.reply(STOLEN_MESSAGE).catch(noop)
  }

  const following = await checkFollowing(instagramUsername)

  if (!following) {
    return replyWithFollowButton(ctx, `⚠️ Подписка не найдена. ${HOW_TO_AUTH_MESSAGE}`).catch(null)
  }

  await saveUser({ id: tgUser.id, username: tgUser.username, instagram: instagramUsername })

  ctx.reply('Отлично! Спасибо за подписку ❤️' + HOW_TO_USE_MESSAGE).catch(null)
}

const downloaderFlow = (ctx: MessageContext) => {
  const text = ctx.message.text

  if (isBeatstarsLink(text)) {
    return processBeatstarsLink(ctx, text)
  }

  if (isYoutubeLink(text)) {
    return processYoutubeLink(ctx, text)
  }

  if (isTrillerLink(text)) {
    return processTrillerLink(ctx, text)
  }

  if (isTikTokLink(text)) {
    return processTikTokLink(ctx, text)
  }

  if (isInstagramLink(text)) {
    return processInstagramLink(ctx, text)
  }

  ctx.reply(HOW_TO_USE_MESSAGE)
}

bot.command('start', async (ctx) => {
  try {
    const alreadyFollowed = await checkAlreadyFollowed(ctx.message.from.id)

    if (alreadyFollowed) {
      return ctx.reply(HELLO_MESSAGE + HOW_TO_USE_MESSAGE).catch(noop)
    }
  } catch {}

  replyWithFollowButton(ctx, HELLO_MESSAGE + HELLO_INSTRUCTION_MESSAGE).catch(noop)
})

const sendPromote = async (video: IPromoteVideo, url: string, text: string) => {
  const users = getUsers()

  const { source, ...meta } = video

  let successCount = 0

  for (const user of users) {
    try {
      await bot.telegram.sendVideo(
        user.id,
        { source },
        { ...meta, caption: text, reply_markup: { inline_keyboard: [[Markup.button.url('Слушать', url)]] } }
      )

      successCount++
    } catch (e) {
      console.log(e)
    }
  }

  await bot.telegram.sendMessage(TELEGRAM_BOT_ADMIN_ID, `Сообщение отправлено ${successCount} из ${users.length} пользователям`)
}

bot.hears(/\/promote (.+)\s\|\s(.+)\s\|\s(.+)/, async (ctx) => {
  ctx.replyWithChatAction('typing').catch(noop)

  if (ctx.message.from.id !== TELEGRAM_BOT_ADMIN_ID) {
    return ctx.replyWithSticker('CAACAgIAAxkBAAIBdWH7Fc1A-TcUnjT52BZQShjhD8d1AAJFAAN_J6wO6wcjwBMAAcZ8IwQ').catch(noop)
  }

  const [, spotifyUrl, url, text] = ctx.match

  try {
    const preview = await getPreview(spotifyUrl)

    const video = await makePromoteVideo(preview)

    sendPromote(video, url, text)
  } catch (e) {
    ctx.reply(String(e)).catch(noop)
  }
})

bot.on('sticker', (ctx) => console.log(ctx.message.sticker))

bot.on('text', async (ctx) => {
  try {
    const message = ctx.message
    const userId = message.from.id

    ctx.replyWithChatAction('typing').catch(noop)

    console.log('new message:', message)

    const alreadyFollowed = await checkAlreadyFollowed(userId)

    if (!alreadyFollowed) {
      await unauthorizedFlow(ctx)
      return
    }

    await downloaderFlow(ctx)
  } catch (e) {
    console.log(e)
    ctx.reply(ERROR_MESSAGE)
  }
})

const start = async () => {
  await initDB()

  await bot.launch()
}

start()
