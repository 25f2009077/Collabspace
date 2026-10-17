"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { authenticate, endSession, requireAdmin, requireSession, startSession } from "@/lib/auth";
import { MAX_PHOTO, sniffImage, type Photo } from "@/lib/photo";
import * as store from "@/lib/store";
import { CITIES, HOUSES, type HouseId } from "@/lib/types";

const text = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const isHouse = (v: string): v is HouseId => HOUSES.some(h => h.id === v);
const refresh = () => revalidatePath("/", "layout");

export async function proposeEvent(f: FormData) {
  const title = text(f, "title"), hostHouse = text(f, "hostHouse"), cityId = text(f, "cityId");
  const when = new Date(`${text(f, "startsAt")}+05:30`); // datetime-local has no zone; houses are in IST
  if (!title || !isHouse(hostHouse) || !CITIES.some(c => c.id === cityId) || isNaN(when.getTime())) redirect("/propose?error=1");
  const coHosts = f.getAll("coHosts").map(String).filter(isHouse).filter(h => h !== hostHouse);
  const e = await store.propose({
    title, hostHouse, cityId, coHosts, startsAt: when.toISOString(), venue: text(f, "venue"), description: text(f, "description"),
    kind: coHosts.length ? "joint" : text(f, "kind") === "cowork" ? "cowork" : "meetup",
  });
  refresh();
  redirect(`/events/${e.id}?proposed=1`);
}

export async function respondCoHost(id: string, houseId: HouseId, status: "accepted" | "declined") {
  const s = await requireSession();
  if (!(s.role === "admin" || s.houseId === houseId)) redirect("/lead"); // leads answer only for their own house
  await store.respondCoHost(id, houseId, status);
  refresh();
}

export async function reviewEvent(id: string, decision: "approved" | "rejected", f: FormData) {
  await requireAdmin();
  await store.review(id, decision, text(f, "reason"));
  refresh();
}

export async function verifyCheckIn(id: string, decision: "verified" | "rejected") {
  await requireAdmin();
  await store.verify(id, decision);
  refresh();
}

export async function submitCheckIn(eventId: string, f: FormData) {
  const houseId = text(f, "houseId");
  const file = f.get("photo");
  let photo: Photo | undefined;
  if (typeof file !== "string" && file && file.size > 0) {
    if (file.size > MAX_PHOTO) redirect(`/events/${eventId}?result=badphoto`);
    const data = Buffer.from(await file.arrayBuffer());
    const type = sniffImage(data);
    if (!type) redirect(`/events/${eventId}?result=badphoto`);
    photo = { type, data };
  }
  const result = isHouse(houseId) ? await store.checkIn(eventId, { name: text(f, "name"), houseId, code: text(f, "code"), photo }) : "invalid";
  refresh();
  redirect(`/events/${eventId}?result=${result}`);
}

export async function login(f: FormData) {
  const h = await headers();
  const key = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "local";
  if (await store.throttled(key)) redirect("/login?error=locked");
  const s = authenticate(text(f, "who"), text(f, "passcode"));
  await store.recordLogin(key, !!s);
  if (!s) redirect("/login?error=1");
  await startSession(s);
  redirect(s.role === "admin" ? "/admin" : "/lead");
}

export async function setCheckInMode(id: string, mode: "open" | "closed" | null) {
  await requireAdmin();
  await store.setCheckInMode(id, mode);
  refresh();
}

export async function logout() {
  await endSession();
  redirect("/");
}
