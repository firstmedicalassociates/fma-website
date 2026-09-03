import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@fontsource/material-symbols-outlined";
import ThirdPartyScripts from "./components/third-party-scripts";
import {
  CANONICAL_ORIGIN,
  SITE_NAME,
  shouldNoIndexDeployment,
} from "./lib/config/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: {
    default: `Primary Care & Specialized Care Services in Maryland | ${SITE_NAME}`,
    template: "%s",
  },
  description:
    "Primary care locations, provider profiles, and health resources from First Medical Associates.",
  metadataBase: new URL(CANONICAL_ORIGIN),
  robots: shouldNoIndexDeployment()
    ? {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false,
        },
      }
    : undefined,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script
          type="text/javascript"
          src="https://cdn.rlets.com/capture_static/mms/mms.js"
          async
        ></script>
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        {children}
        <ThirdPartyScripts />
      </body>
    </html>
  );
}
