import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import wasm from 'vite-plugin-wasm';

export default defineConfig(({ mode }) => {
  // Load .env, .env.preview, .env.preprod etc. from the ui/ directory
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react(), wasm(), nodePolyfills()],

    // Expose env vars to the browser bundle with safe defaults
    define: {
      'import.meta.env.VITE_NETWORK_ID': JSON.stringify(
        env.VITE_NETWORK_ID ?? 'preview',
      ),
      'import.meta.env.VITE_CONTRACT_ADDRESS': JSON.stringify(
        env.VITE_CONTRACT_ADDRESS ?? '',
      ),
      'import.meta.env.VITE_INDEXER_URL': JSON.stringify(
        env.VITE_INDEXER_URL ?? 'https://indexer.preview.midnight.network/api/v4/graphql',
      ),
      'import.meta.env.VITE_INDEXER_WS_URL': JSON.stringify(
        env.VITE_INDEXER_WS_URL ?? 'wss://indexer.preview.midnight.network/api/v4/graphql/ws',
      ),
      'import.meta.env.VITE_PROOF_SERVER_URL': JSON.stringify(
        env.VITE_PROOF_SERVER_URL ?? 'https://lace-proof-pub.preview.midnight.network',
      ),
    },

    build: {
      // esnext target required for top-level await in WASM modules (ledger-v8, onchain-runtime)
      target: 'esnext',
    },
  };
});
