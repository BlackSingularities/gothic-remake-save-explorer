import type { CompanionApi } from './types'

declare global {
  interface Window {
    gothic?: CompanionApi
  }
}

export {}
