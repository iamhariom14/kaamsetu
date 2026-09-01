/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FAST2SMS_API_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
