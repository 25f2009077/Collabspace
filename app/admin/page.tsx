import { headers } from "next/headers";
import { logout, respondCoHost, reviewEvent, setCheckInMode, verifyCheckIn } from "@/app/actions";
import { leadPasscode, requireAdmin } from "@/lib/auth";
import Qr from "@/components/Qr";
import { checkInOpen, listEvents, pendingProofs, stats } from "@/lib/store";
import { HOUSES, cityName, fmt, houseById } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Admin() {
  await requireAdmin();
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const [s, proofs, queue, live] = await Promise.all([stats(), pendingProofs(), listEvents("proposed"), listEvents("approved")]);
  return (
    <>
      <div className="top"><h1>Admin dashboard</h1><form action={logout}><button className="btn ghost">Sign out</button></form></div>
      <ul className="stats" aria-label="Summary">
        <li><b>{s.awaitingApproval}</b>awaiting approval</li>
        <li><b>{s.pendingProofs}</b>proofs to review</li>
        <li><b>{s.verified}</b>verified check-ins</li>
        <li><b>{s.live}</b>live events</li>
      </ul>

      <section className="card" aria-labelledby="q-h">
        <h2 id="q-h">Approval queue</h2>
        {queue.length === 0 && <p>Nothing waiting. New proposals appear here.</p>}
        {queue.map(e => {
          const blocked = e.coHosts.some(c => c.status !== "accepted");
          return (
            <div className="row" key={e.id}>
              <div>
                <b>{e.title}</b>
                <small>{cityName(e.cityId)}, {fmt(e.startsAt)}, host {houseById(e.hostHouse).name}</small>
                {e.coHosts.map(c => (
                  <div className="chip" key={c.houseId}>
                    {houseById(c.houseId).name}: {c.status}
                    {c.status === "pending" && <form action={respondCoHost.bind(null, e.id, c.houseId, "accepted")}><button>Accept for house</button></form>}
                  </div>
                ))}
              </div>
              <form action={reviewEvent.bind(null, e.id, "approved")}>
                <button className="btn" disabled={blocked} title={blocked ? "Waiting for co-host houses" : undefined}>Approve</button>
              </form>
              <form action={reviewEvent.bind(null, e.id, "rejected")}>
                <input name="reason" placeholder="Reason" aria-label="Rejection reason" />
                <button className="btn ghost">Reject</button>
              </form>
            </div>
          );
        })}
      </section>

      <section className="card" aria-labelledby="p-h">
        <h2 id="p-h">Proof-of-presence review</h2>
        {proofs.length === 0 && <p>No photo proofs waiting.</p>}
        {proofs.map(c => (
          <div className="row" key={c.id}>
            <div className="shot"><a href={`/api/proof/${c.id}`} target="_blank" rel="noopener noreferrer"><img className="proof" src={`/api/proof/${c.id}`} alt={`Proof photo from ${c.name}`} loading="lazy" /></a></div>
            <div><b>{c.name}</b>, {houseById(c.houseId).name}<small>{c.eventTitle}</small></div>
            <form action={verifyCheckIn.bind(null, c.id, "verified")}><button className="btn">Verify</button></form>
            <form action={verifyCheckIn.bind(null, c.id, "rejected")}><button className="btn ghost">Reject</button></form>
          </div>
        ))}
      </section>

      <section className="card" aria-labelledby="l-h">
        <h2 id="l-h">Live events and check-in QR</h2>
        {live.map(e => (
          <div className="row" key={e.id}>
            <details>
              <summary>{e.title} <small>code {e.code}, check-in {checkInOpen(e) ? "open" : "closed"}{e.checkinOverride ? " (manual)" : ""}</small></summary>
              <Qr text={`${base}/events/${e.id}?code=${e.code}`} />
            </details>
            <form action={setCheckInMode.bind(null, e.id, "open")}><button className="btn">Open now</button></form>
            <form action={setCheckInMode.bind(null, e.id, "closed")}><button className="btn ghost">Close</button></form>
            <form action={setCheckInMode.bind(null, e.id, null)}><button className="btn ghost">Use schedule</button></form>
          </div>
        ))}
      </section>

      <section className="card" aria-labelledby="h-h">
        <h2 id="h-h">House lead access</h2>
        <p>Give each house lead their passcode. They sign in at /login to answer co-host invitations for their house.</p>
        <ul className="chips">{HOUSES.map(h => <li key={h.id}>{h.name}: <code>{leadPasscode(h.id)}</code></li>)}</ul>
      </section>
    </>
  );
}
