import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer({
  reactStrictMode: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['@mantine/core', '@mantine/hooks'],
  },
  webpack: (config, { isServer, webpack }) => {
    // pptxgenjs 4.x (`dist/pptxgen.es.js`): uses `import JSZip from 'jszip'` and guarded dynamic
    // `import('node:fs')` / `import('node:https')` on Node-only paths. Do NOT alias to
    // `pptxgen.bundle.js`: that UMD ends with `})(JSZip)` but never defines `JSZip` in module
    // scope, so webpack emits `ReferenceError: JSZip is not defined` in the client bundle.
    // Rewrite `node:*` → `*` so fallbacks apply; browser code never executes those branches.
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.plugins = [...(config.plugins || [])];
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        path: false,
        crypto: false,
        stream: false,
        zlib: false,
        util: false,
        buffer: false,
      };
    }
    return config;
  },
});
