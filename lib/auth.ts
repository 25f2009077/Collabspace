// Sign-in for organisers (admin) and house leads. Session = HMAC-signed, httpOnly cookie, no extra dependencies.
// Fails closed in production: with no SESSION_SECRET (and ADMIN_PASSCODE for admins), nobody can sign in.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HOUSES, type HouseId } from "./types";

export type Session = { role: "admin" } | { role: "lead"; houseId: HouseId };
const COOKIE = "cs_session";
const TTL = 8 * 3600; // seconds
const dev = process.env.NODE_ENV !== "production";
const secret = () => process.env.SESSION_SECRET ?? (dev ? "dev-only-secret" : "");
const adminPasscode = () => process.env.ADMIN_PASSCODE ?? (dev ? "admin123" : "");
const sign = (v: string) => createHmac("sha256", secret()).update(v).digest("base64url");
const same = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/** Each house lead's passcode is derived from SESSION_SECRET; the admin dashboard lists them to hand out. */
export const leadPasscode = (h: HouseId) => sign(`lead-passcode.${h}`).slice(0, 8);
/** Shown on the login page only in dev with the built-in demo passcode. */
export const demoHint = dev && !process.env.ADMIN_PASSCODE ? "admin123" : null;

export function authenticate(who: string, input: string): Session | null {
  if (!secret()) return null;
  if (who === "admin") return adminPasscode() !== "" && same(input, adminPasscode()) ? { role: "admin" } : null;
  const h = HOUSES.find(x => x.id === who);
  return h && same(input, leadPasscode(h.id)) ? { role: "lead", houseId: h.id } : null;
}

export async function startSession(s: Session) {
  const who = s.role === "admin" ? "admin" : `lead:${s.houseId}`;
  const exp = String(Math.floor(Date.now() / 1000) + TTL);
  (await cookies()).set(COOKIE, `${who}.${exp}.${sign(`${who}.${exp}`)}`, { httpOnly: true, sameSite: "lax", secure: !dev, path: "/", maxAge: TTL });
}
export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<Session | null> {
  const v = (await cookies()).get(COOKIE)?.value;
  if (!v || !secret()) return null;
  const [who, exp, sig] = v.split(".");
  if (!who || !exp || !sig || Number(exp) <= Date.now() / 1000 || !same(sig, sign(`${who}.${exp}`))) return null;
  if (who === "admin") return { role: "admin" };
  const h = HOUSES.find(x => `lead:${x.id}` === who);
  return h ? { role: "lead", houseId: h.id } : null;
}
export const isAdmin = async () => (await getSession())?.role === "admin";

/** Call at the top of every admin page AND every Server Action (actions are public POST endpoints). */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  return s;
}
