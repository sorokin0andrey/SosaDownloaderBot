import i18next from 'i18next'
import { getPreview } from 'spotify-url-info'
import { Markup, Telegraf } from 'telegraf'
import { ExtraVideo } from 'telegraf/typings/telegram-types'
import { checkAlreadyFollowed, checkFollowing, checkStolenInstagram, getInstagramUsername } from './auth.mjs'
import { getBeatstarsAudio, isBeatstarsLink } from './beatstars.mjs'
import { TELEGRAM_BOT_ADMIN_ID, TELEGRAM_BOT_API_TOKEN, TELEGRAM_BOT_USERNAME } from './config.mjs'
import { getUsers, initDB, saveUser } from './db.mjs'
import { IPromoteVideo, makePromoteVideo } from './ffmpeg.mjs'
import { getInstagramMediaByLink, isInstagramLink } from './instagram.mjs'
import { initLocales } from './locales/index.mjs'
import { logger } from './logger.mjs'
import { getTikTokVideoURLByLink, isTikTokLink } from './tiktok.mjs'
import { getTrillerVideoByLink, isTrillerLink } from './triller.mjs'
import { BotContext, MessageContext } from './types.mjs'
import { noop } from './utils.mjs'
import { getYoutubeAudio, isYoutubeLink } from './youtube.mjs'

const bot = new Telegraf<BotContext>(TELEGRAM_BOT_API_TOKEN)

const inProgressUsers = new Set<number>([])

bot.use((ctx, next) => {
  logger.info('message', ctx.message)

  const lng = ctx.from?.language_code || 'en'

  ctx.t = (key, options) => i18next.t(key, { lng, ...options })

  ctx.caption = ctx.t('caption', { botName: TELEGRAM_BOT_USERNAME })

  return next()
})

const replyError = (ctx: MessageContext, error: unknown) => {
  console.log(error)
  ctx.reply(ctx.t('errorMessage')).catch(noop)
}

const replyWithFollowButton = (ctx: MessageContext, message: string) =>
  ctx.reply(
    message,
    Markup.inlineKeyboard([Markup.button.url(ctx.t('follow'), 'https://instagram.com/_thecursedsoul')])
  )

const sendMedia = async (ctx: MessageContext, media: string[]) => {
  logger.info('sendMedia', media)

  ctx.reply(ctx.t('startSendingMessage')).catch(noop)

  for (const url of media) {
    ctx.replyWithChatAction('upload_document').catch(noop)

    try {
      await ctx.replyWithDocument(url, {
        caption: ctx.caption,
      })
    } catch {}
  }
}

const sendVideo = async (ctx: MessageContext, videoURL: string, extras?: ExtraVideo) => {
  logger.info('send video', { videoURL, extras })

  ctx.reply(ctx.t('startSendingMessage')).catch(noop)

  ctx.replyWithChatAction('upload_video').catch(noop)

  if (extras) {
    try {
      await ctx.replyWithVideo(
        { url: videoURL },
        {
          ...extras,
          caption: ctx.caption,
        }
      )
    } catch {}
  } else {
    try {
      await ctx.replyWithDocument(videoURL, {
        caption: ctx.caption,
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
  const userId = ctx.from.id

  const msg = await ctx.reply(ctx.t('processingMessage', { progress: '' }))

  const onProgress = (progress: number) => {
    ctx.telegram
      .editMessageText(
        ctx.message.chat.id,
        msg.message_id,
        undefined,
        ctx.t('processingMessage', { progress: `${Math.round(progress * 100)}%` })
      )
      .catch(noop)
  }

  inProgressUsers.add(userId)

  getYoutubeAudio(link, onProgress)
    .then(({ buffer, filename, duration }) => {
      logger.info('send youtube audio', { link, filename, duration })

      return ctx.replyWithAudio({ source: buffer, filename }, { duration, caption: ctx.caption })
    })
    .catch((e) => replyError(ctx, e))
    .finally(() => {
      inProgressUsers.delete(userId)
    })
}

const processBeatstarsLink = async (ctx: MessageContext, link: string) => {
  const userId = ctx.from.id

  const msg = await ctx.reply(ctx.t('processingMessage', { progress: '' }))

  const onProgress = (progress: number) => {
    ctx.telegram
      .editMessageText(
        ctx.message.chat.id,
        msg.message_id,
        undefined,
        ctx.t('processingMessage', { progress: `${Math.round(progress * 100)}%` })
      )
      .catch(noop)
  }

  inProgressUsers.add(userId)

  getBeatstarsAudio(link, onProgress)
    .then(({ buffer, filename, duration }) => {
      logger.info('send Beatstars audio', { link, filename, duration })

      return ctx.replyWithAudio({ source: buffer, filename }, { duration, caption: ctx.caption })
    })
    .catch((e) => replyError(ctx, e))
    .finally(() => {
      inProgressUsers.delete(userId)
    })
}

const unauthorizedFlow = async (ctx: MessageContext) => {
  const tgUser = ctx.from
  const text = ctx.message.text

  const instagramUsername = getInstagramUsername(text)

  if (!instagramUsername) {
    return replyWithFollowButton(ctx, ctx.t('howToAuthMessage')).catch(noop)
  }

  const stolen = checkStolenInstagram(tgUser.id, instagramUsername)

  if (stolen) {
    return ctx.reply(ctx.t('stolenMessage')).catch(noop)
  }

  const following = await checkFollowing(instagramUsername)

  if (!following) {
    return replyWithFollowButton(ctx, ctx.t('failedSubscriptionMessage')).catch(noop)
  }

  await saveUser({
    id: tgUser.id,
    username: tgUser.username,
    instagram: instagramUsername,
    language: tgUser.language_code || 'en',
  })

  ctx.reply(ctx.t('successSubscriptionMessage')).catch(noop)
}

const downloaderFlow = (ctx: MessageContext) => {
  const text = ctx.message.text
  const userId = ctx.from.id

  if (inProgressUsers.has(userId)) {
    ctx.reply(ctx.t('holdOnMessage')).catch(noop)
    return
  }

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

  ctx.reply(ctx.t('howToUseMessage')).catch(noop)
}

bot.command('start', async (ctx) => {
  try {
    const alreadyFollowed = await checkAlreadyFollowed(ctx.message.from.id, ctx.message.from.language_code)

    if (alreadyFollowed) {
      return ctx.reply(ctx.t('helloMessage') + ctx.t('howToUseMessage')).catch(noop)
    }
  } catch {}

  replyWithFollowButton(ctx, ctx.t('helloMessage') + ctx.t('helloInstructionMessage')).catch(noop)
})

const sendUpdateMessage = async (ctx: MessageContext, message: string) => {
  const users = getUsers()

  let successCount = 0

  for (const user of users) {
    try {
      await bot.telegram.sendMessage(user.id, message, { disable_notification: true })

      successCount++
    } catch (e) {
      logger.error(e)
    }
  }

  await ctx.reply(ctx.t('promotionSentMessage', { successCount, totalCount: users.length }))
}

const sendPromote = async (ctx: MessageContext, video: IPromoteVideo, url: string, text: string) => {
  const users = getUsers()

  const { source, ...meta } = video

  let successCount = 0

  for (const user of users) {
    try {
      await bot.telegram.sendVideo(
        user.id,
        { source },
        {
          ...meta,
          caption: text,
          reply_markup: {
            inline_keyboard: [[Markup.button.url(ctx.t('promotionListen', { lng: user.language }), url)]],
          },
        }
      )

      successCount++
    } catch (e) {
      logger.error(e)
    }
  }

  await ctx.reply(ctx.t('promotionSentMessage', { successCount, totalCount: users.length }))
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

    sendPromote(ctx, video, url, text)
  } catch (e) {
    ctx.reply(String(e)).catch(noop)
  }
})

bot.hears(/\/sendupdate (.+)/, async (ctx) => {
  ctx.replyWithChatAction('typing').catch(noop)

  if (ctx.message.from.id !== TELEGRAM_BOT_ADMIN_ID) {
    return ctx.replyWithSticker('CAACAgIAAxkBAAIBdWH7Fc1A-TcUnjT52BZQShjhD8d1AAJFAAN_J6wO6wcjwBMAAcZ8IwQ').catch(noop)
  }

  const message = ctx.message.text.replace('/sendupdate ', '')

  if (message && message.length) {
    sendUpdateMessage(ctx, message)
  }
})

bot.on('text', async (ctx) => {
  try {
    const message = ctx.message
    const userId = message.from.id
    const userLang = message.from.language_code

    ctx.replyWithChatAction('typing').catch(noop)

    const alreadyFollowed = await checkAlreadyFollowed(userId, userLang)

    if (!alreadyFollowed) {
      await unauthorizedFlow(ctx)
      return
    }

    await downloaderFlow(ctx)
  } catch (e) {
    replyError(ctx, e)
  }
})

const start = async () => {
  await initLocales()
  await initDB()

  await bot.launch()
}

start()
