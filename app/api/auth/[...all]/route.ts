import { getAuth } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

function handle(request: Request) {
  return getAuth().handler(request);
}

export { handle as GET, handle as POST };
