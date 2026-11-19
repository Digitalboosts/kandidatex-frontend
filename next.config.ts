import type { NextConfig } from 'next';

/** The Python API server (see docs/API.md). Override with BACKEND_URL, for example for a local copy. */
const backendUrl = process.env.BACKEND_URL ?? 'http://20.244.10.52:9090';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Let phones on the same Wi-Fi load the dev server (by default only localhost
  // may, and the page then never becomes interactive). Dev only.
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.*.*.*'],
  // The browser only ever talks to this origin, so the session cookie stays
  // first-party and the backend needs no CORS.
  async rewrites() {
    return [{ source: '/api/:path*', destination: `${backendUrl}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'same-origin' },
          // Interviewer pages only receive media. They never capture any.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // The candidate's joining page runs the session in the browser, so it alone
        // may use this origin's camera and microphone. Listed last, so it wins.
        source: '/join/:path*',
        headers: [{ key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=()' }],
      },
    ];
  },
};

export default nextConfig;
