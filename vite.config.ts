import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin, Connect } from 'vite'
import type { IncomingMessage, ServerResponse } from 'http'
import { handleGeminiChatNode } from './server/geminiChatHandler.ts'

/**
 * Vite dev-only plugin: delegates /api/gemini/chat to the shared server Gemini handler.
 * Reads GEMINI_API_KEY (or fallback VITE_GEMINI_API_KEY) from .env.local without bundling it.
 */
function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-proxy',
    apply: 'serve',
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), '');
      const handler: Connect.NextHandleFunction = async (
        req: IncomingMessage,
        res: ServerResponse,
        next: Connect.NextFunction
      ) => {
        const pathname = req.url?.split('?')[0];
        if (pathname !== '/api/gemini/chat') {
          return next();
        }

        const apiKey =
          env.GEMINI_API_KEY ||
          process.env.GEMINI_API_KEY ||
          env.VITE_GEMINI_API_KEY ||
          process.env.VITE_GEMINI_API_KEY;
        await handleGeminiChatNode(req, res, apiKey);
      };

      server.middlewares.use(handler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    geminiApiPlugin(),
  ],
  build: {
    rolldownOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
          if (id.includes('firebase')) return 'vendor-firebase';
          if (id.includes('lucide-react') || id.includes('motion')) return 'vendor-ui';
          return undefined;
        },
      },
    },
  },
})
