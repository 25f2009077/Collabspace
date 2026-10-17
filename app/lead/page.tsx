import Link from "next/link";
import { redirect } from "next/navigation";
import { logout, respondCoHost } from "@/app/actions";
import { getSession } from "@/lib/auth";
import { listEvents } from "@/lib/store";
import { cityName, fmt, houseById } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Lead() {
  const s = await getSession();
  if (s?.role !== "lead") redirect(s ? "/admin" : "/login");
  const me = s.houseId;
  const mine = (await listEvents()).filter(e => e.hostHouse === me || e.coHosts.some(c => c.houseId === me));
  const invites = mine.filter(e => e.status === "proposed" && e.coHosts.some(c => c.houseId === me && c.status === "pending"));
  return (
    <>
      <div className="top"><h1>{houseById(me).name} house lead</h1><form action={logout}><button className="btn ghost">Sign out</button></form></div>
      <section className="card" aria-labelledby="i-h">
        <h2 id="i-h">Co-host invitations</h2>
        {invites.length === 0 && <p>No invitations waiting.</p>}
        {invites.map(e => (
          <div className="row" key={e.id}>
            <div><b>{e.title}</b><small>{cityName(e.cityId)}, {fmt(e.startsAt)}, host {houseById(e.hostHouse).name}</small></div>
            <form action={respondCoHost.bind(null, e.id, me, "accepted")}><button className="btn">Accept</button></form>
            <form action={respondCoHost.bind(null, e.id, me, "declined")}><button className="btn ghost">Decline</button></form>
          </div>
        ))}
      </section>
      <section className="card" aria-labelledby="m-h">
        <h2 id="m-h">Your house's events</h2>
        <ul className="list">
          {mine.map(e => <li key={e.id}><Link href={`/events/${e.id}`}>{e.title}</Link><small>{e.status}, {cityName(e.cityId)}, {fmt(e.startsAt)}</small></li>)}
        </ul>
        <Link className="btn" href="/propose">Propose a meetup</Link>
      </section>
    </>
  );
}
