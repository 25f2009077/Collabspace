// Data layer: libSQL (SQLite-compatible). Locally it opens data/collabsphere.db; in production point
// DATABASE_URL at a hosted Turso database so it works on serverless hosts like Netlify.
// All SQL lives here. Photos are stored as BLOBs next to the data.
import type { Client, InValue } from "@libsql/client";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { CITIES, HOUSES, POINTS, fmt, type CampusEvent, type CoHost, type EventStatus, type HouseId } from "./types";
import { SAMPLE_PHOTO, type Photo } from "./photo";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, title TEXT NOT NULL, kind TEXT NOT NULL, city_id TEXT NOT NULL, venue TEXT, starts_at TEXT NOT NULL,
  host_house TEXT NOT NULL, description TEXT, status TEXT NOT NULL, reject_reason TEXT, code TEXT NOT NULL, checkin_override TEXT);
CREATE TABLE IF NOT EXISTS cohosts (event_id TEXT NOT NULL, house_id TEXT NOT NULL, status TEXT NOT NULL, PRIMARY KEY (event_id, house_id));
CREATE TABLE IF NOT EXISTS checkins (id TEXT PRIMARY KEY, event_id TEXT NOT NULL, name TEXT NOT NULL, house_id TEXT NOT NULL, method TEXT NOT NULL, status TEXT NOT NULL,
  UNIQUE (event_id, name COLLATE NOCASE));
CREATE TABLE IF NOT EXISTS photos (checkin_id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL);
CREATE TABLE IF NOT EXISTS throttle (key TEXT PRIMARY KEY, n INTEGER NOT NULL, until INTEGER NOT NULL);`;

type Stmt = { sql: string; args: InValue[] };
const g = globalThis as unknown as { __cs?: Promise<Client> };
const client = () => (g.__cs ??= open().catch(e => { g.__cs = undefined; throw e; })); // lazy: `next build` never connects

async function open(): Promise<Client> {
  const url = process.env.DATABASE_URL ?? "file:data/collabsphere.db";
  const local = url.startsWith("file:");
  if (local) mkdirSync(dirname(url.slice(5)), { recursive: true });
  // The web client is pure JS (no native binary), so production builds on Netlify stay simple.
  const { createClient } = await (local ? import("@libsql/client") : import("@libsql/client/web"));
  const c = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  await c.executeMultiple(SCHEMA);
  if (!Number((await c.execute("SELECT COUNT(*) n FROM events")).rows[0].n)) await seed(c);
  return c;
}

const q = async <T>(sql: string, args: InValue[] = []) => (await (await client()).execute({ sql, args })).rows as unknown as T[];
const run = async (sql: string, args: InValue[] = []) => (await client()).execute({ sql, args });
const tx = async (stmts: Stmt[]) => (await client()).batch(stmts, "write");
const count = async (sql: string, args: InValue[] = []) => Number((await q<{ n: number }>(sql, args))[0].n);

async function seed(c: Client) {
  const at = (mins: number) => new Date(Date.now() + mins * 6e4).toISOString();
  const DAY = 1440;
  const ev = (...args: InValue[]): Stmt => ({ sql: "INSERT OR IGNORE INTO events (id,title,kind,city_id,venue,starts_at,host_house,description,status,code) VALUES (?,?,?,?,?,?,?,?,?,?)", args });
  const co = (...args: InValue[]): Stmt => ({ sql: "INSERT OR IGNORE INTO cohosts VALUES (?,?,?)", args });
  const ci = (...args: InValue[]): Stmt => ({ sql: "INSERT OR IGNORE INTO checkins VALUES (?,?,?,?,?,?)", args });
  const nikhil = randomUUID();
  await c.batch([
    ev("e1", "Chennai co-working Saturday", "joint", "chennai", "Anna Nagar library hall", at(30), "pichavaram", "Bring a laptop. Assignment sprint, then chai.", "approved", "CHN24A"),
    co("e1", "saranda", "accepted"),
    ev("e2", "Bengaluru cross-house tech meetup", "joint", "bengaluru", "Indiranagar community hub", at(6 * DAY), "kanha", "Lightning talks and project show-and-tell.", "approved", "BLR7Q2"),
    co("e2", "gir", "accepted"), co("e2", "wayanad", "accepted"),
    ev("e3", "Kolkata study circle", "meetup", "kolkata", "College Street cafe", at(9 * DAY), "namdapha", "Casual meetup for BS students in and around Kolkata.", "approved", "KOL9X1"),
    ev("e4", "Delhi NCR winter meetup", "joint", "delhi", "Saket public library", at(14 * DAY), "corbett", "Three-house meetup before term exams.", "proposed", "DEL3M8"),
    co("e4", "bandipur", "pending"), co("e4", "kaziranga", "accepted"),
    ev("e5", "Hyderabad co-working day", "cowork", "hyderabad", "Madhapur co-working space", at(11 * DAY), "saranda", "Full-day quiet co-working session.", "proposed", "HYD5K4"),
    ...[["e1", "Asha", "pichavaram"], ["e1", "Ravi", "saranda"], ["e1", "Meera", "pichavaram"], ["e2", "Karthik", "kanha"],
      ["e2", "Divya", "gir"], ["e2", "Arjun", "wayanad"], ["e2", "Sana", "kanha"]].map(([e, name, house]) => ci(randomUUID(), e, name, house, "qr", "verified")),
    ci(nikhil, "e1", "Nikhil", "saranda", "photo", "pending"),
    { sql: "INSERT OR IGNORE INTO photos VALUES (?,?,?)", args: [nikhil, SAMPLE_PHOTO.type, SAMPLE_PHOTO.data] },
  ], "write");
}

// ---- Events ----
interface EventRow {
  id: string; title: string; kind: CampusEvent["kind"]; city_id: string; venue: string; starts_at: string; host_house: HouseId;
  description: string; status: EventStatus; reject_reason: string | null; code: string; checkin_override: "open" | "closed" | null;
}
async function events(where = "", args: InValue[] = []): Promise<CampusEvent[]> {
  const [rows, co] = await Promise.all([
    q<EventRow>(`SELECT * FROM events ${where} ORDER BY starts_at`, args),
    q<CoHost & { event_id: string }>("SELECT event_id, house_id AS houseId, status FROM cohosts ORDER BY rowid"),
  ]);
  return rows.map(r => ({
    id: r.id, title: r.title, kind: r.kind, cityId: r.city_id, venue: r.venue, startsAt: r.starts_at, hostHouse: r.host_house,
    description: r.description, status: r.status, rejectReason: r.reject_reason ?? undefined, code: r.code, checkinOverride: r.checkin_override ?? undefined,
    coHosts: co.filter(c => c.event_id === r.id).map(c => ({ houseId: c.houseId, status: c.status })),
  }));
}
export const listEvents = (status?: EventStatus) => (status ? events("WHERE status = ?", [status]) : events());
export const getEvent = async (id: string) => (await events("WHERE id = ?", [id]))[0] as CampusEvent | undefined;

export async function cityPins() {
  const live = await listEvents("approved");
  return CITIES.map(c => ({ ...c, events: live.filter(e => e.cityId === c.id).map(e => ({ id: e.id, title: e.title, when: fmt(e.startsAt) })) }));
}

// ---- Lifecycle: propose -> co-hosts accept -> admin approves -> check in -> verify -> points ----
export type Proposal = Omit<CampusEvent, "id" | "status" | "code" | "coHosts" | "rejectReason" | "checkinOverride"> & { coHosts: HouseId[] };
export async function propose(p: Proposal): Promise<CampusEvent> {
  const id = randomBytes(4).toString("hex"), code = randomBytes(3).toString("hex").toUpperCase();
  await tx([
    { sql: "INSERT INTO events (id,title,kind,city_id,venue,starts_at,host_house,description,status,code) VALUES (?,?,?,?,?,?,?,?,'proposed',?)",
      args: [id, p.title, p.kind, p.cityId, p.venue, p.startsAt, p.hostHouse, p.description, code] },
    ...p.coHosts.map(h => ({ sql: "INSERT INTO cohosts VALUES (?,?,'pending')", args: [id, h] })),
  ]);
  return (await getEvent(id))!;
}

export async function respondCoHost(eventId: string, houseId: HouseId, status: "accepted" | "declined") {
  await run("UPDATE cohosts SET status = ? WHERE event_id = ? AND house_id = ?", [status, eventId, houseId]);
}

/** Approval is blocked until every co-host house has accepted. */
export async function review(id: string, decision: "approved" | "rejected", reason = ""): Promise<boolean> {
  const e = await getEvent(id);
  if (!e || e.status !== "proposed") return false;
  if (decision === "approved" && e.coHosts.some(c => c.status !== "accepted")) return false;
  await run("UPDATE events SET status = ?, reject_reason = ? WHERE id = ?", [decision, decision === "rejected" ? reason || "No reason given" : null, id]);
  return true;
}

/** Check-in is open from 1h before the start to 6h after, unless an admin forces it open or closed. */
export function checkInOpen(e: CampusEvent, now = Date.now()) {
  if (e.status !== "approved") return false;
  if (e.checkinOverride) return e.checkinOverride === "open";
  const t = Date.parse(e.startsAt);
  return now >= t - 3600e3 && now <= t + 6 * 3600e3;
}
export async function setCheckInMode(id: string, mode: "open" | "closed" | null) {
  await run("UPDATE events SET checkin_override = ? WHERE id = ?", [mode, id]);
}

export type CheckInResult = "verified" | "pending" | "duplicate" | "invalid" | "closed";
/** A correct QR code verifies instantly; photo proof goes to the admin review queue. */
export async function checkIn(eventId: string, i: { name: string; houseId: HouseId; code?: string; photo?: Photo }): Promise<CheckInResult> {
  const e = await getEvent(eventId);
  if (!e || !checkInOpen(e)) return "closed";
  if (i.name.length < 2) return "invalid";
  const qrOk = !!i.code && i.code.toUpperCase() === e.code;
  if (!qrOk && !i.photo) return "invalid";
  const id = randomUUID(), status = qrOk ? "verified" : "pending";
  try {
    await tx([
      { sql: "INSERT INTO checkins VALUES (?,?,?,?,?,?)", args: [id, eventId, i.name, i.houseId, qrOk ? "qr" : "photo", status] },
      ...(qrOk ? [] : [{ sql: "INSERT INTO photos VALUES (?,?,?)", args: [id, i.photo!.type, i.photo!.data] }]),
    ]);
  } catch (err) {
    if (/constraint/i.test(`${(err as { code?: string }).code} ${(err as Error).message}`)) return "duplicate"; // UNIQUE(event, name)
    throw err;
  }
  return status;
}

export async function verify(id: string, decision: "verified" | "rejected") {
  const r = await run("UPDATE checkins SET status = ? WHERE id = ? AND status = 'pending'", [decision, id]);
  if (r.rowsAffected && decision === "rejected") await run("DELETE FROM photos WHERE checkin_id = ?", [id]); // don't keep rejected photos
}
export async function getPhoto(checkInId: string): Promise<Photo | undefined> {
  const [r] = await q<{ type: string; data: ArrayBuffer }>("SELECT type, data FROM photos WHERE checkin_id = ?", [checkInId]);
  return r && { type: r.type, data: Buffer.from(r.data) };
}
export const pendingProofs = () =>
  q<{ id: string; name: string; houseId: HouseId; eventTitle: string }>(
    "SELECT c.id, c.name, c.house_id AS houseId, e.title AS eventTitle FROM checkins c JOIN events e ON e.id = c.event_id WHERE c.status = 'pending'");

// ---- Points: attendance + bonus for cross-house events ----
export async function leaderboard() {
  const rows = await q<{ houseId: HouseId; points: number }>(`
    SELECT c.house_id AS houseId,
      SUM(${POINTS.attend} + CASE WHEN c.house_id != e.host_house OR EXISTS (SELECT 1 FROM cohosts h WHERE h.event_id = e.id) THEN ${POINTS.crossHouseBonus} ELSE 0 END) AS points
    FROM checkins c JOIN events e ON e.id = c.event_id WHERE c.status = 'verified' GROUP BY c.house_id`);
  const m = new Map(rows.map(r => [r.houseId, Number(r.points)]));
  return HOUSES.map(h => ({ houseId: h.id, points: m.get(h.id) ?? 0 })).sort((a, b) => b.points - a.points);
}

export const attendance = (eventId: string) => count("SELECT COUNT(*) n FROM checkins WHERE event_id = ? AND status = 'verified'", [eventId]);
export async function stats() {
  const [awaitingApproval, pendingProofs, verified, live] = await Promise.all([
    count("SELECT COUNT(*) n FROM events WHERE status = 'proposed'"),
    count("SELECT COUNT(*) n FROM checkins WHERE status = 'pending'"),
    count("SELECT COUNT(*) n FROM checkins WHERE status = 'verified'"),
    count("SELECT COUNT(*) n FROM events WHERE status = 'approved'"),
  ]);
  return { awaitingApproval, pendingProofs, verified, live };
}

// ---- Login rate limit: 5 failures lock a client out for 15 minutes ----
export async function throttled(key: string): Promise<boolean> {
  const [r] = await q<{ until: number }>("SELECT until FROM throttle WHERE key = ?", [key]);
  if (r && r.until && r.until <= Date.now()) { await run("DELETE FROM throttle WHERE key = ?", [key]); return false; } // lock expired
  return !!r && r.until > Date.now();
}
export async function recordLogin(key: string, ok: boolean) {
  if (ok) { await run("DELETE FROM throttle WHERE key = ?", [key]); return; }
  await run("INSERT INTO throttle VALUES (?, 1, 0) ON CONFLICT(key) DO UPDATE SET n = n + 1, until = CASE WHEN n + 1 >= 5 THEN ? ELSE until END", [key, Date.now() + 15 * 60e3]);
}
