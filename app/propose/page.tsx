import { proposeEvent } from "@/app/actions";
import { CITIES, HOUSES } from "@/lib/types";

export default async function Propose({ searchParams }: { searchParams: Promise<{ city?: string; error?: string }> }) {
  const q = await searchParams;
  return (
    <section className="card narrow">
      <h1>Propose a meetup</h1>
      {q.error && <p role="alert" className="note bad">Add a title, city, valid date and host house, then submit again.</p>}
      <form action={proposeEvent} className="form">
        <label>Title<input name="title" required maxLength={80} /></label>
        <label>Type<select name="kind"><option value="meetup">Meetup</option><option value="cowork">Co-working</option></select></label>
        <label>City<select name="cityId" defaultValue={q.city}>{CITIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label>Venue<input name="venue" required /></label>
        <label>Date and time (IST)<input name="startsAt" type="datetime-local" required /></label>
        <label>Host house<select name="hostHouse">{HOUSES.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
        <fieldset>
          <legend>Co-host houses (optional)</legend>
          {HOUSES.map(h => <label key={h.id} className="check"><input type="checkbox" name="coHosts" value={h.id} />{h.name}</label>)}
        </fieldset>
        <label>Description<textarea name="description" rows={3} /></label>
        <button className="btn">Send for approval</button>
      </form>
    </section>
  );
}
