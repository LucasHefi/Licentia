import { getBetterAuthSession } from "./auth";

export async function getRequestIdentity(headers: Headers) {
  const chatGPTId = headers.get("oai-authenticated-user-id");
  const chatGPTEmail = headers.get("oai-authenticated-user-email");
  if (chatGPTId && chatGPTEmail) return { key: `chatgpt:${chatGPTId}`, source: "chatgpt" as const };
  try {
    const session = await getBetterAuthSession(headers);
    if (session?.user.id) return { key: `licentia:${session.user.id}`, source: "licentia" as const };
  } catch { /* unauthenticated */ }
  return null;
}
