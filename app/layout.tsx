import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { site } from "@/lib/site";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: site.name, template: `%s | ${site.name}` },
  description: site.description,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-mono">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:border focus:border-accent focus:bg-bg focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <Navbar />
        <main
          id="main"
          className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 sm:px-6 sm:py-16"
        >
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
