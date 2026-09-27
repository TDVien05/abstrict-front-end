/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_DEMO_CUSTOMER?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
