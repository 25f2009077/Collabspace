// Photo-proof helpers. Files are validated by their bytes, never by the name or MIME type the browser reports.
export interface Photo { type: string; data: Buffer }
export const MAX_PHOTO = 4 * 1024 * 1024;

export function sniffImage(b: Buffer): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  return null;
}

// Placeholder for the seeded sample entry in the admin review queue.
export const SAMPLE_PHOTO: Photo = {
  type: "image/svg+xml",
  data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#dbe9ea"/><text x="160" y="126" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#10272b">Sample proof photo</text></svg>'),
};
