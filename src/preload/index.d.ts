import type { PresenterApi } from './index'

declare global {
  interface Window {
    api: PresenterApi
  }
}
