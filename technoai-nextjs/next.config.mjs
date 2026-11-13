/** @type {import('next').NextConfig} */
const nextConfig = {
  // WordPress URLs end with a slash (/partners/), keep them identical.
  trailingSlash: true,
  poweredByHeader: false,
  // Ship the snapshotted HTML with the server build (needed on Vercel / serverless).
  outputFileTracingIncludes: {
    "/[[...slug]]": ["./content/**/*"],
  },
};

export default nextConfig;
