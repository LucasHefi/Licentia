import { headers } from "next/headers";
import { chatGPTSignOutPath, getChatGPTUser } from "./chatgpt-auth";
import LicenseStudio from "../components/LicenseStudio";
import type { AppIdentity } from "../components/types";
import { getBetterAuthSession } from "../lib/auth";

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
          canAddPasskey: true,
        };
      }
    } catch {
      account = null;
    }
  }

  return <LicenseStudio account={account} />;
}
