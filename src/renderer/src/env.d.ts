/// <reference types="vite/client" />

import type { DeepdexApi } from '../../preload/index'

declare global {
  interface Window {
    deepdex: DeepdexApi
  }
}

export {}
