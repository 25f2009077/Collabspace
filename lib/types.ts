export type HouseId = "saranda" | "gir" | "kanha" | "bandipur" | "corbett" | "namdapha" | "pichavaram" | "wayanad" | "kaziranga";
export interface House { id: HouseId; name: string }
export const HOUSES: House[] = (["saranda", "gir", "kanha", "bandipur", "corbett", "namdapha", "pichavaram", "wayanad", "kaziranga"] as HouseId[])
  .map(id => ({ id, name: id[0].toUpperCase() + id.slice(1) }));
export const houseById = (id: HouseId) => HOUSES.find(h => h.id === id)!;

export interface City { id: string; name: string; lat: number; lng: number; peers: number }
// Sample peer counts for the demo; replace with a real members table.
export const CITIES: City[] = [
  { id: "chennai", name: "Chennai", lat: 13.08, lng: 80.27, peers: 64 },
  { id: "bengaluru", name: "Bengaluru", lat: 12.97, lng: 77.59, peers: 81 },
  { id: "hyderabad", name: "Hyderabad", lat: 17.38, lng: 78.48, peers: 47 },
  { id: "delhi", name: "Delhi NCR", lat: 28.61, lng: 77.21, peers: 58 },
  { id: "mumbai", name: "Mumbai", lat: 19.08, lng: 72.88, peers: 39 },
  { id: "pune", name: "Pune", lat: 18.52, lng: 73.86, peers: 33 },
  { id: "kolkata", name: "Kolkata", lat: 22.57, lng: 88.36, peers: 29 },
  { id: "kochi", name: "Kochi", lat: 9.93, lng: 76.27, peers: 21 },
  { id: "guwahati", name: "Guwahati", lat: 26.14, lng: 91.74, peers: 14 },
];
export const cityName = (id: string) => CITIES.find(c => c.id === id)?.name ?? id;

export type EventKind = "meetup" | "cowork" | "joint";
export type EventStatus = "proposed" | "approved" | "rejected";
export interface CoHost { houseId: HouseId; status: "pending" | "accepted" | "declined" }
export interface CampusEvent {
  id: string; title: string; kind: EventKind; cityId: string; venue: string; startsAt: string;
  hostHouse: HouseId; coHosts: CoHost[]; description: string; status: EventStatus; rejectReason?: string; checkinOverride?: "open" | "closed";
  code: string; // check-in secret, encoded in the QR; never sent to attendees
}
export type CheckInStatus = "verified" | "pending" | "rejected";
export interface CheckIn { id: string; eventId: string; name: string; houseId: HouseId; method: "qr" | "photo"; status: CheckInStatus }

export const POINTS = { attend: 10, crossHouseBonus: 5 } as const;
export const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(iso));
