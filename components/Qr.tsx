import QRCode from "qrcode";

export default async function Qr({ text }: { text: string }) {
  const svg = await QRCode.toString(text, { type: "svg", margin: 1, width: 168 });
  return <div className="qr" role="img" aria-label="Check-in QR code" dangerouslySetInnerHTML={{ __html: svg }} />;
}
