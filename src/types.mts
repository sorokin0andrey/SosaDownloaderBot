import { TOptions } from 'i18next'
import { Context, NarrowedContext } from 'telegraf'
import { MessageSubType, MountMap, UpdateType } from 'telegraf/typings/telegram-types'
import { LocaleKeys } from './locales/index.mjs'

export interface BotContext extends Context {
  t: (key: LocaleKeys, options?: TOptions) => string
  caption: string
}

export type MatchedContext<C extends BotContext, T extends UpdateType | MessageSubType> = NarrowedContext<
  C,
  MountMap[T]
>

export type MessageContext = MatchedContext<BotContext, 'text'>
