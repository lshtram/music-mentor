import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { MusicProvider } from "@/context/MusicContext";
import ClientGate from "@/components/ClientGate";

const inter = Inter({ subsets: ["latin"] });

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
      <body className={`${inter.className} bg-gray-950 text-gray-100`}>
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
