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
    // pptxgenjs ES build (`dist/pptxgen.es.js`) uses dynamic `import('node:fs')` /
    // `import('node:https')` on Node-only paths. Webpack 5 does not handle the
    // `node:` URI scheme → UnhandledSchemeError. Strip the prefix so requests
    // resolve as `fs` / `https` and map to `false` via fallbacks (browser never
    // executes those branches). Do NOT alias to `pptxgen.bundle.js` — UMD expects
    // global JSZip and breaks with ReferenceError (see CHANGELOG / PowerPoint spec).
    if (!isServer) {
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource) => {
          resource.request = resource.request.replace(/^node:/, '');
        }),
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        https: false,
        http: false,
        os: false,
        crypto: false,
        stream: false,
        zlib: false,
        util: false,
        buffer: false,
        assert: false,
      };
    }
    return config;
  },
});
