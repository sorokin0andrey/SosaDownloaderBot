import { Context, NarrowedContext } from 'telegraf'
import { MessageSubType, MountMap, UpdateType } from 'telegraf/typings/telegram-types'
import { Update } from 'typegram'

export type MatchedContext<C extends Context, T extends UpdateType | MessageSubType> = NarrowedContext<C, MountMap[T]>

export type MessageContext = MatchedContext<Context<Update>, "text">