import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Next.js caps Server Action request bodies at 1MB by default — too
      // small for this app's photo uploads (a single real product/banner
      // photo from a phone camera can exceed that on its own, and hero
      // banners submit three full-size images in one request). Individual
      // file size/type is still validated per-file in
      // src/lib/storage/types.ts (assertValidImage, 8MB/file) — this only
      // raises the ceiling on the total request so those checks get a
      // chance to run instead of Next.js rejecting the request first.
      bodySizeLimit: "40mb",
    },
    // Separate 10MB-default limit for request bodies read by src/proxy.ts
    // (matches every /admin/* route) — independent of serverActions'
    // bodySizeLimit above. Without raising this too, a large multipart
    // upload gets silently truncated to 10MB by the proxy before it ever
    // reaches the Server Action, surfacing as "Unexpected end of form".
    proxyClientMaxBodySize: "40mb",
  },
};

export default nextConfig;
