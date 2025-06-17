
import type {NextConfig} from 'next';
import withPWAInit from 'next-pwa';

// const isDev = process.env.NODE_ENV !== 'production'; // Keep PWA enabled for dev as per previous request

const withPWA = withPWAInit({
  dest: 'public',
  disable: false, // PWA is now enabled in development and production
  register: true,
  skipWaiting: true, // Automatically activate new service worker
  // fallbacks: { // Optional: define fallbacks for offline
    // document: '/offline', // requires /pages/offline.tsx
    // image: '/static/images/fallback.png',
    // font: '/static/fonts/fallback.woff2',
    // audio: ...,
    // video: ...,
  //},
  dynamicStartUrl: false, // If true, `start_url` from manifest.json is not used by next-pwa. Defaults to false.
  reloadOnOnline: true, // Reload the page when the browser is online again
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: false, // Enforce TypeScript error checks
  },
  eslint: {
    ignoreDuringBuilds: false, // Enforce ESLint error checks
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com', 
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'maps.googleapis.com', 
        port: '',
        pathname: '/**',
      }
    ],
  },
};

export default withPWA(nextConfig);
