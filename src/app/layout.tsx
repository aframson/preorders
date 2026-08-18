import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, Raleway } from "next/font/google";
import { Toaster } from "sonner";
import { NavigationProgress } from "@/components/navigation-progress";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://bookpreorders.vercel.app",
  ),
  title: {
    default: "Preorders — run your WhatsApp preorders without the chaos",
    template: "%s · Preorders",
  },
  description:
    "Paid catalog, automatic cutoff, supplier buy-list, fair freight when the bill lands. One link for customers. The board for you — not another week of chat screenshots.",
  openGraph: {
    type: "website",
    siteName: "Preorders",
    title: "Run preorders like an operation.",
    description:
      "Paid catalog, automatic cutoff, supplier buy-list, fair freight when the bill lands. One link for customers. The board for you.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Run preorders like an operation.",
    description:
      "Paid catalog, automatic cutoff, supplier buy-list, fair freight when the bill lands. One link for customers. The board for you.",
  },
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
        <NavigationProgress />
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
