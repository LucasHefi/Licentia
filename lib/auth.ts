import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";

export const SITE_ORIGIN = "https://licentia-spdx.breakbonescrew.chatgpt.site";

type AuthRuntimeEnv = {
  DB?: D1Database;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
};

function getProcessEnv(): AuthRuntimeEnv {
  if (typeof process === "undefined") return {};
  return {
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
  };
}

async function getRuntimeEnv(): Promise<AuthRuntimeEnv> {
  try {
    const workers = await import("cloudflare:workers");
    return workers.env as AuthRuntimeEnv;
  } catch (error) {
    if (error instanceof Error && error.name === "Error" && "code" in error && error.code === "ERR_UNSUPPORTED_ESM_URL_SCHEME") {
      return getProcessEnv();
    }
    throw error;
  }
}

export async function configuredSocialProviders() {
  const env = await getRuntimeEnv();
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    github: Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
  };
}

export async function getAuth() {
  const env = await getRuntimeEnv();
  const baseURL = env.BETTER_AUTH_URL || SITE_ORIGIN;
  const secret = env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }
  if (!env.DB) throw new Error("Cloudflare D1 binding DB is unavailable.");

  const socialProviders = {
    ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: env.GOOGLE_CLIENT_ID,
            clientSecret: env.GOOGLE_CLIENT_SECRET,
            prompt: "select_account" as const,
          },
        }
      : {}),
    ...(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? {
          github: {
            clientId: env.GITHUB_CLIENT_ID,
            clientSecret: env.GITHUB_CLIENT_SECRET,
          },
        }
      : {}),
  };

  return betterAuth({
    appName: "Licentia",
    baseURL,
    secret,
    database: env.DB,
    trustedOrigins: [SITE_ORIGIN],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      revokeSessionsOnPasswordReset: true,
    },
    socialProviders,
    account: {
      encryptOAuthTokens: true,
      accountLinking: {
        enabled: true,
        trustedProviders: ["google", "github"],
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 120,
      storage: "database",
    },
    advanced: {
      database: { generateId: "uuid" },
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      useSecureCookies: true,
      cookiePrefix: "licentia",
    },
    plugins: [
      passkey({
        rpID: new URL(baseURL).hostname,
        rpName: "Licentia",
        origin: baseURL,
      }),
    ],
  });
}

export async function getBetterAuthSession(requestHeaders: Headers) {
  return (await getAuth()).api.getSession({ headers: requestHeaders });
}
