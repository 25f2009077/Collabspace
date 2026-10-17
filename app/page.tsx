import Link from "next/link";
import RegionMap from "@/components/RegionMap";
import { cityPins, leaderboard, listEvents } from "@/lib/store";
import { cityName, fmt, houseById } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [board, upcoming, pins] = await Promise.all([leaderboard(), listEvents("approved"), cityPins()]);
  const top = Math.max(board[0].points, 1);
  return (
    <>
      <section className="hero">
        <h1>Meet your house, wherever you are.</h1>
        <p>Find peers in your city, plan meetups with other houses, check in with a QR code and earn points for showing up.</p>
        <Link className="btn" href="/propose">Propose a meetup</Link>
      </section>
      <div className="grid">
        <section className="card wide" aria-labelledby="map-h">
          <h2 id="map-h">Regional map</h2>
          <RegionMap pins={pins} />
        </section>
        <section className="card" aria-labelledby="lb-h">
          <h2 id="lb-h">House leaderboard</h2>
          <ol className="lb">
            {board.map(({ houseId, points }) => (
              <li key={houseId}>
                <span>{houseById(houseId).name}</span>
                <meter min={0} max={top} value={points} aria-label={`${houseById(houseId).name} points`} />
                <b>{points}</b>
              </li>
            ))}
          </ol>
        </section>
        <section className="card" aria-labelledby="up-h">
          <h2 id="up-h">Upcoming meetups</h2>
          <ul className="list">
            {upcoming.map(e => (
              <li key={e.id}><Link href={`/events/${e.id}`}>{e.title}</Link><small>{cityName(e.cityId)}, {fmt(e.startsAt)}</small></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
