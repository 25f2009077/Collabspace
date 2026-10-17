import { listEvents } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Public JSON feed of events. The check-in code is never exposed. */
export async function GET(req: Request) {
  const s = new URL(req.url).searchParams.get("status");
  const status = s === "proposed" || s === "rejected" ? s : "approved";
  return Response.json((await listEvents(status)).map(({ code: _code, ...e }) => e));
}
