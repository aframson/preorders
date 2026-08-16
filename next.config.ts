import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // The local Supabase stack serves storage from 127.0.0.1, which Next 16
    // refuses to optimise by default. Production hosts are public, so this
    // only ever loosens the rule for development.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "54321",
        pathname: "/storage/v1/**",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
  },
};

export default nextConfig;
