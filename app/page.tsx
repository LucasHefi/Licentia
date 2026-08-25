import { headers } from "next/headers";
import { chatGPTSignInPath, chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import LicenseStudio from "../components/LicenseStudio";
import SignIn from "../components/SignIn";
import type { AppIdentity } from "../components/types";
import { configuredSocialProviders, getBetterAuthSession } from "../lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const chatGPTUser = await getChatGPTUser();
  let account: AppIdentity | null = null;

  if (chatGPTUser) {
    account = {
      id: chatGPTUser.userId,
      name: chatGPTUser.displayName,
      email: chatGPTUser.email,
      authSource: "chatgpt",
      providerLabel: "ChatGPT",
      signOutPath: chatGPTSignOutPath("/"),
    };
  } else {
    try {
      const session = await getBetterAuthSession(await headers());
      if (session) {
        account = {
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
          authSource: "licentia",
          providerLabel: "Licentia účet",
        };
      }
    } catch {
      account = null;
    }
  }

  if (!account) {
    let socialProviders = { google: false, github: false };
    try {
      socialProviders = await configuredSocialProviders();
    } catch {
      socialProviders = { google: false, github: false };
    }
    return <SignIn providers={socialProviders} chatGPTSignInPath={chatGPTSignInPath("/")} />;
  }

  return <LicenseStudio account={account} />;
}
