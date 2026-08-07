import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow image optimization for localhost subdomains
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '*.localhost',
        port: '3000',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
      },
    ],
    // Use unoptimized images for local development to avoid subdomain issues
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // async rewrites() {
  //   // Determine the backend URL based on the environment
  //   const isProduction = process.env.NODE_ENV === 'production';
  //   // const backendHost = process.env.NEXT_PUBLIC_BACKENDHOST || 'localhost:8000'; // Default for non-Docker dev
  //   // Updated: Add logging and ensure backendHost is set correctly
  //   const backendHost = process.env.NEXT_PUBLIC_BACKENDHOST || 'localhost:8000'; // Default for non-Docker dev
  //   console.log('Backend Host:', backendHost); // Debug: Log the backend host

  //   // Backend URL for proxying
  //   // const backendUrl = isProduction
  //   //   ? 'https://vowerp.co.in' // Production backend URL
  //   //   : `http://${backendHost}/api`; // Development (localhost or Docker service)
  //   // Updated: Add logging for backendUrl and ensure proper URL construction
  //   const backendUrl = isProduction
  //     ? 'https://vowerp.co.in' // Production backend URL
  //     // : `${backendHost}/api`; // Development (localhost or Docker service)
  //           : `http://localhost:8000/api`; // Development (localhost or Docker service)
  //   console.log('Backend URL for proxy:', backendUrl); // Debug: Log the constructed backend URL

  //   // Only apply the proxy in development
  //   if (isProduction) {
  //     return [];
  //   }

  //   return [
  //     {
  //       source: '/api/:path*', // Match all /api/* requests
  //       destination: `${backendUrl}/:path*`, // Proxy to backend
  //     },
  //   ];
  // }
  async rewrites() {
    const useProxy = process.env.USE_NEXT_PROXY === 'true';
    const backendHost = process.env.NEXT_PUBLIC_BACKENDHOST || 'localhost:8000';
    const backendUrl = backendHost.includes('http')
      ? `${backendHost}/api`
      : `http://${backendHost}/api`;
  
    console.log('USE_NEXT_PROXY:', useProxy);
    console.log('Backend proxy target:', backendUrl);
  
    if (!useProxy) {
      return [];
    }
  
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/:path*`,
      },
    ];
  },

 
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;