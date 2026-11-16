/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow verification builds without overwriting a running preview.
  distDir: process.env.NEXT_BUILD_DIR || ".next",
  // WordPress URLs end with a slash (/partners/), keep them identical.
  trailingSlash: true,
  poweredByHeader: false,
  // Ship the snapshotted HTML with the server build (needed on Vercel / serverless).
  outputFileTracingIncludes: {
    "/[[...slug]]": ["./content/**/*"],
  },
  // The new design (app/redesign) is the home page. The old WordPress home stays at /old-home/.
  async rewrites() {
    return {
      beforeFiles: [{ source: "/", destination: "/redesign/" }],
    };
  },
};

export default nextConfig;
