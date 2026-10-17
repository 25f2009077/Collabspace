import { redirect } from "next/navigation";
import { login } from "@/app/actions";
import { demoHint, getSession } from "@/lib/auth";
import { HOUSES } from "@/lib/types";

export default async function Login({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const s = await getSession();
  if (s) redirect(s.role === "admin" ? "/admin" : "/lead");
  const q = await searchParams;
  return (
    <section className="card narrow">
      <h1>Sign in</h1>
      {q.error === "locked" && <p role="alert" className="note bad">Too many attempts. Try again in 15 minutes.</p>}
      {q.error === "1" && <p role="alert" className="note bad">That passcode didn't match. Try again.</p>}
      <form action={login} className="form">
        <label>I am the
          <select name="who">
            <option value="admin">Organiser (admin)</option>
            {HOUSES.map(h => <option key={h.id} value={h.id}>{h.name} house lead</option>)}
          </select>
        </label>
        <label>Passcode<input name="passcode" type="password" required autoComplete="current-password" /></label>
        <button className="btn">Sign in</button>
      </form>
      {demoHint && <small>Dev mode: the admin passcode is {demoHint}. House lead passcodes are listed on the admin dashboard.</small>}
    </section>
  );
}
