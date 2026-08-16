import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Raleway } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const display = Raleway({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Preorders — run your WhatsApp preorders without the chaos",
    template: "%s · Preorders",
  },
  description:
    "WhatsApp is for selling. This runs the batch: goods paid now, a tracking page for every customer, a buy-list for your supplier, and shipping split by weight when the bill arrives.",
};

export const viewport: Viewport = {
  themeColor: "#fdfbf8",
  // Customers arrive inside the WhatsApp webview, where an accidental
  // double-tap zoom on a product grid is easy and annoying to undo.
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-canvas text-ink">
        {children}
        <Toaster
          position="top-center"
          richColors
          toastOptions={{ className: "font-sans" }}
        />
      </body>
    </html>
  );
}
