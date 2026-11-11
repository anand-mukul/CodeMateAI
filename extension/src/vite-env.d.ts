/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WEB_PORTAL_URL?: string;
  readonly VITE_ALLOWED_ORIGINS?: string;
  readonly VITE_PLATFORM_MATCHES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
