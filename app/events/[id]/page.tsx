import Link from "next/link";
import { notFound } from "next/navigation";
import { submitCheckIn } from "@/app/actions";
import { attendance, checkInOpen, getEvent } from "@/lib/store";
import { HOUSES, cityName, fmt, houseById } from "@/lib/types";

const MSG: Record<string, string> = {
  verified: "You're checked in. Points were added to your house.",
  pending: "Photo proof received. An organiser will verify it shortly.",
  duplicate: "That name is already checked in for this event.",
  invalid: "Check your name, house and event code (or add a valid photo link) and try again.",
  closed: "Check-in isn't open for this event right now.",
  badphoto: "Photos must be JPEG, PNG or WebP and under 4 MB.",
};

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ result?: string; code?: string; proposed?: string }> };

export default async function EventPage({ params, searchParams }: Props) {
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const e = await getEvent(id);
  if (!e) notFound();
  return (
    <article className="card narrow">
      <p className={`badge ${e.status}`}>{e.status}</p>
      <h1>{e.title}</h1>
      <p>{cityName(e.cityId)}, {e.venue}<small>{fmt(e.startsAt)}</small></p>
      <p>{e.description}</p>
      <h2>Hosts</h2>
      <ul className="chips">
        <li>{houseById(e.hostHouse).name} (host)</li>
        {e.coHosts.map(c => <li key={c.houseId}>{houseById(c.houseId).name}: {c.status}</li>)}
      </ul>
      {q.proposed && <p role="status" className="note">Proposal sent. It goes live once every co-host accepts and an admin approves.</p>}
      {e.rejectReason && <p role="status" className="note bad">Rejected: {e.rejectReason}</p>}
      {q.result && MSG[q.result] && <p role="status" className="note">{MSG[q.result]}</p>}
      {e.status === "approved" && !checkInOpen(e) && <p className="note">Check-in opens an hour before the start and closes six hours after.</p>}
      {checkInOpen(e) && (
        <>
          <h2>Check in <small>{await attendance(e.id)} verified so far</small></h2>
          <form action={submitCheckIn.bind(null, e.id)} className="form">
            <label>Your name<input name="name" required minLength={2} autoComplete="name" /></label>
            <label>Your house<select name="houseId">{HOUSES.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
            <label>Event code (filled in when you scan the QR)<input name="code" defaultValue={q.code ?? ""} autoCapitalize="characters" /></label>
            <label>No code? Add a photo taken at the meetup<input name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" /><small>JPEG, PNG or WebP, up to 4 MB. An organiser reviews it before points count.</small></label>
            <button className="btn">Check in</button>
          </form>
        </>
      )}
      <p><Link href="/">Back to the map</Link></p>
    </article>
  );
}
