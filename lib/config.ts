import { resolve } from "node:path";

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) {
    return fallback;
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") {
    return true;
  }
  if (normalized === "false" || normalized === "0" || normalized === "no") {
    return false;
  }
  return fallback;
}

function parseCsv(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

export const config = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "Canvas Accessibility Converter",
  appBaseUrl: process.env.APP_BASE_URL ?? "http://localhost:3000",
  databasePath: resolve(process.cwd(), process.env.DATABASE_PATH ?? ".data/capstone.db"),
  storageRoot: resolve(process.cwd(), process.env.STORAGE_ROOT ?? ".storage"),
  maxUploadBytes: parseNumber(process.env.MAX_UPLOAD_BYTES, 10 * 1024 * 1024),
  retentionDays: parseNumber(process.env.RETENTION_DAYS, 30),
  workerPollMs: parseNumber(process.env.WORKER_POLL_MS, 5000),
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
    timeoutSeconds: parseNumber(process.env.OPENAI_TIMEOUT_SECONDS, 45),
    maxRetries: parseNumber(process.env.OPENAI_MAX_RETRIES, 3)
  },
  session: {
    cookieName: process.env.SESSION_COOKIE_NAME ?? "cac_session",
    ttlHours: parseNumber(process.env.SESSION_TTL_HOURS, 12),
    secure: parseBoolean(process.env.SESSION_SECURE, false)
  },
  adminEmails: parseCsv(process.env.ADMIN_EMAILS),
  saml: {
    spEntityId: process.env.SAML_SP_ENTITY_ID ?? "",
    spAcsUrl: process.env.SAML_SP_ACS_URL ?? "",
    idpEntityId: process.env.SAML_IDP_ENTITY_ID ?? "",
    idpSsoUrl: process.env.SAML_IDP_SSO_URL ?? "",
    idpCert: process.env.SAML_IDP_CERT ?? "",
    attributeUid: process.env.SAML_ATTRIBUTE_UID ?? "uid",
    attributeEmail: process.env.SAML_ATTRIBUTE_EMAIL ?? "email",
    attributeName: process.env.SAML_ATTRIBUTE_NAME ?? "displayName"
  }
};

export function assertOpenAiConfigured(): void {
  if (!config.openai.apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }
}

export function assertSamlConfigured(): void {
  if (!config.saml.spEntityId || !config.saml.spAcsUrl || !config.saml.idpEntityId || !config.saml.idpSsoUrl || !config.saml.idpCert) {
    throw new Error("SAML configuration is incomplete. Check SAML_* environment variables.");
  }
}
