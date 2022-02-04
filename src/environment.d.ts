declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TELEGRAM_BOT_USERNAME: string
      TELEGRAM_BOT_API_TOKEN: string
      TELEGRAM_BOT_ADMIN_ID: string
    }
  }
}

export {}
