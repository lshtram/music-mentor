import type { Metadata } from "next";
import { Libre_Baskerville, Source_Sans_3 } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { MusicProvider } from "@/context/MusicContext";
import ClientGate from "@/components/ClientGate";

const serif = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif",
});

const sans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "SoundPath",
  description: "Your personal music learning environment.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable}`}>
        <ClientGate>
          <MusicProvider>
            <Header />
            <main>{children}</main>
          </MusicProvider>
        </ClientGate>
      </body>
    </html>
  );
}
