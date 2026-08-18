import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Preorders",
    short_name: "Preorders",
    description:
      "Run WhatsApp preorder batches — board, buy-list, and paid orders.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#fdfbf8",
    theme_color: "#5a2a4e",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
