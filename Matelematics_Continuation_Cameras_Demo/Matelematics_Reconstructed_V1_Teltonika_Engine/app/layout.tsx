import "./globals.css";
import "leaflet/dist/leaflet.css";
export const metadata = {
  title: "Matelematics",
  description: "Fleet Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}