/* eslint-disable @typescript-eslint/no-var-requires */
require('dotenv').config();
const pkg = require('./package.json');
const CLOUD_URL = 'https://cloud.umami.is';

const contentSecurityPolicy = `
  default-src 'self';
  img-src *;
  script-src 'self' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  connect-src 'self' api.umami.is;
  frame-ancestors 'self';
`;

const headers = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'Content-Security-Policy',
    value: contentSecurityPolicy.replace(/\s{2,}/g, ' ').trim(),
  },
];

if (process.env.FORCE_SSL) {
  headers.push({
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  });
}

const rewrites = [];

if (process.env.COLLECT_API_ENDPOINT) {
  rewrites.push({
    source: process.env.COLLECT_API_ENDPOINT,
    destination: '/api/send',
  });
}

if (process.env.TRACKER_SCRIPT_NAME) {
  const names = process.env.TRACKER_SCRIPT_NAME?.split(',').map(name => name.trim());

  if (names) {
    names.forEach(name => {
      rewrites.push({
        source: `/${name.replace(/^\/+/, '')}`,
        destination: '/script.js',
      });
    });
  }
}

const redirects = [
  {
    source: '/settings',
    destination: process.env.CLOUD_MODE ? '/settings/profile' : '/settings/websites',
    permanent: true,
  },
];

if (process.env.CLOUD_MODE && process.env.DISABLE_LOGIN && process.env.CLOUD_URL) {
  redirects.push({
    source: '/login',
    destination: process.env.CLOUD_URL,
    permanent: false,
  });
}

const config = {
  env: {
    currentVersion: pkg.version,
    isProduction: process.env.NODE_ENV === 'production',
  },
  basePath: process.env.BASE_PATH,
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      issuer: /\.{js|jsx|ts|tsx}$/,
      use: ['@svgr/webpack'],
    });

    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers,
      },
       {
        // matching all API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ];
  },
  async rewrites() {
    return [
      ...rewrites,
      {
        source: '/telemetry.js',
        destination: '/api/scripts/telemetry',
      },
    ];
  },
  async redirects() {
    return [...redirects];
  },
};

module.exports = config;
