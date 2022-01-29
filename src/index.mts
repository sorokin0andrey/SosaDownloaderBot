import { Telegraf } from 'telegraf'
import { ExtraVideo } from 'telegraf/typings/telegram-types'
import { checkAlreadyFollowed, checkFollowing, getInstagramUsername } from './auth.mjs'
import { initDB, saveUser } from './db.mjs'
import { getInstagramMediaByLink, isInstagramLink } from './instagram.mjs'
import { getTikTokVideoURLByLink, isTikTokLink } from './tiktok.mjs'
import { getTrillerVideoByLink, isTrillerLink } from './triller.mjs'
import { MessageContext } from './types.mjs'

console.log(process.env)

const TELEGRAM_BOT_USERNAME = 'SosaDowloaderBot'
const TELEGRAM_BOT_API_TOKEN = '5192469864:AAGOxMilPDoIocUfuf1cwRrv9H4lk3RFD3g'

const CAPTION = `Скачано при помощи @${TELEGRAM_BOT_USERNAME}`

const START_SENDING_MESSAGE = 'Принял. Отправляю 🚀'

const HELLO_MESSAGE =
  `Привет👋` +
  `\n\nС моей помощью ты можешь получить любое видео из Triller / TikTok / Instagram без логотипов в самом лучшем качестве 😊` +
  `\n\nЧтобы воспользоваться ботом, подпишись на меня в instagram и отправь мне свой instagram для проверки 🙏` +
  `\nТем самым, ты поддержишь разработчика, который не спал ночь, чтобы создать меня 🐼`

const TO_USE_BOT_MESSAGE =
  'Чтобы воспользоваться ботом, подпишись на меня в instagram и отправь мне свой instagram для проверки 🙏'

const bot = new Telegraf(TELEGRAM_BOT_API_TOKEN)

bot.command('start', (ctx) => {
  ctx
    .reply(HELLO_MESSAGE)
    .catch(() => null)
})

const sendMedia = async (ctx: MessageContext, media: string[]) => {
  console.log('sendMedia', media)

  ctx.reply(START_SENDING_MESSAGE).catch(() => null)

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

  ctx.reply(START_SENDING_MESSAGE).catch(() => null)

  ctx.replyWithChatAction('upload_video').catch(() => null)

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

const unauthorizedFlow = async (ctx: MessageContext) => {
  const tgUser = ctx.from
  const text = ctx.message.text

  const instagramUsername = getInstagramUsername(text)

  if (!instagramUsername) {
    return ctx.reply(TO_USE_BOT_MESSAGE).catch(null)
  }

  const following = await checkFollowing(instagramUsername)

  if (!following) {
    return ctx.reply(`⚠️ Подписка не найдена. ${TO_USE_BOT_MESSAGE}`, {}).catch(null)
  }

  await saveUser({ id: tgUser.id, username: tgUser.username, instagram: instagramUsername })

  ctx
    .reply(
      'Отлично! Спасибо за подписку ❤️\n\nТеперь присылай мне ссылку на видео (Triller / TikTok / Instagram), а я тебе в ответ видео без логотипов в наилучшем качестве 😉'
    )
    .catch(null)
}

const downloaderFlow = (ctx: MessageContext) => {
  const text = ctx.message.text

  if (isTrillerLink(text)) {
    return processTrillerLink(ctx, text)
  }

  if (isTikTokLink(text)) {
    return processTikTokLink(ctx, text)
  }

  if (isInstagramLink(text)) {
    return processInstagramLink(ctx, text)
  }
}

bot.on('text', async (ctx) => {
  try {
    const message = ctx.message
    const userId = message.from.id

    ctx.replyWithChatAction('typing').catch(() => null)

    console.log('new message:', message)

    const alreadyFollowed = await checkAlreadyFollowed(userId)

    if (!alreadyFollowed) {
      return unauthorizedFlow(ctx)
    }

    downloaderFlow(ctx)
  } catch (e) {
    console.log(e)
    ctx.reply('Что то пошло не так... Попробуй еще раз')
  }
})

const start = async () => {
  await initDB()

  await bot.launch()
}

start()
