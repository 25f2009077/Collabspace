"use client";
import Link from "next/link";
import { useState } from "react";

interface Pin { id: string; name: string; lat: number; lng: number; peers: number; events: { id: string; title: string; when: string }[] }

// Dependency-free SVG map: lat/lng projected onto a stylised outline of India.
const W = 560, H = 580;
const px = (lng: number) => ((lng - 67) / 31) * W;
const py = (lat: number) => ((38 - lat) / 32) * H;
const LEFT_LABEL = new Set(["mumbai", "bengaluru", "kochi"]);
const OUTLINE: [number, number][] = [
  [68.2, 23.7], [70.2, 20.8], [72.8, 21.2], [72.8, 19.0], [73.6, 16.0], [74.8, 12.8], [76.3, 9.6], [77.5, 8.1], [78.6, 9.2], [79.9, 10.4],
  [80.3, 13.2], [80.1, 15.7], [82.2, 16.9], [84.9, 19.2], [86.9, 21.4], [88.2, 21.8], [89.0, 22.2], [89.1, 25.2], [91.7, 25.2], [92.4, 24.0],
  [93.4, 23.0], [94.6, 25.5], [95.3, 27.6], [97.2, 28.3], [95.5, 29.4], [92.5, 28.0], [89.6, 28.0], [88.1, 27.8], [84.0, 28.7], [80.5, 30.4],
  [79.0, 32.4], [78.0, 35.0], [76.0, 36.2], [74.4, 34.6], [74.6, 32.8], [75.2, 32.2], [74.5, 31.0], [74.0, 30.0], [72.0, 28.4], [70.4, 27.0], [70.0, 25.0],
];

export default function RegionMap({ pins }: { pins: Pin[] }) {
  const [sel, setSel] = useState(pins[0].id);
  const cur = pins.find(p => p.id === sel) ?? pins[0];
  return (
    <div className="map">
      <svg viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Cities with house peers and upcoming meetups">
        <polygon className="land" points={OUTLINE.map(([x, y]) => `${px(x)},${py(y)}`).join(" ")} />
        {pins.map(p => {
          const x = px(p.lng), y = py(p.lat), left = LEFT_LABEL.has(p.id);
          return (
            <g key={p.id} className={p.id === sel ? "pin on" : "pin"} tabIndex={0} role="button" aria-pressed={p.id === sel}
              aria-label={`${p.name}: ${p.peers} peers, ${p.events.length} meetups`} onClick={() => setSel(p.id)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(p.id); } }}>
              <circle cx={x} cy={y} r={6 + Math.sqrt(p.peers)} />
              <text x={left ? x - 12 : x + 12} y={y + 4} textAnchor={left ? "end" : "start"}>{p.name}</text>
            </g>
          );
        })}
      </svg>
      <div aria-live="polite">
        <h3>{cur.name}</h3>
        <p>{cur.peers} house peers in this city</p>
        {cur.events.length ? (
          <ul className="list">{cur.events.map(e => <li key={e.id}><Link href={`/events/${e.id}`}>{e.title}</Link><small>{e.when}</small></li>)}</ul>
        ) : <p>No meetups yet. Be the first to plan one.</p>}
        <Link className="btn" href={`/propose?city=${cur.id}`}>Plan a meetup in {cur.name}</Link>
      </div>
    </div>
  );
}
