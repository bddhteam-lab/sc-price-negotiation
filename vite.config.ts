import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import type { ApiService } from './src/server/apiService';
import { createSeededApiService } from './src/server/seedStore';
import type { ApiRequest } from './src/shared/types';

function readRawBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer | string) => {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, statusCode: number, data: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

function scApiMiddlewarePlugin(): Plugin {
  let service: ApiService | null = null;

  const getService = (): ApiService => {
    if (!service) {
      service = createSeededApiService();
    }
    return service;
  };

  const attachMiddleware = (middlewares: {
    use: (
      handler: (
        req: IncomingMessage,
        res: ServerResponse,
        next: () => void,
      ) => void,
    ) => void;
  }) => {
    middlewares.use((req, res, next) => {
      const urlPath = (req.url ?? '').split('?')[0];
      if (urlPath !== '/api' && urlPath !== '/api/health') {
        next();
        return;
      }

      if (urlPath === '/api/health' && req.method === 'GET') {
        const api = getService();
        void api
          .handleRequest({
            action: 'catalog.bootstrap',
            devEmail: 'bddhteam@gmail.com',
          })
          .then((boot) => {
            if (boot.ok) {
              const data = boot.data as {
                projects: unknown[];
                totalUnitCount: number;
              };
              sendJson(res, 200, {
                ok: true,
                status: 'healthy',
                projectsCount: data.projects.length,
                unitsCount: data.totalUnitCount,
              });
            } else {
              sendJson(res, 500, boot);
            }
          })
          .catch((err: unknown) => {
            sendJson(res, 500, {
              ok: false,
              errorCode: 'INTERNAL_ERROR',
              errorMessage: err instanceof Error ? err.message : 'Health check failed',
            });
          });
        return;
      }

      if (urlPath === '/api' && req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
      }

      if (urlPath === '/api' && req.method === 'POST') {
        void (async () => {
          try {
            const raw = await readRawBody(req);
            const parsed = JSON.parse(raw || '{}') as ApiRequest;
            const headerEmailRaw = req.headers['x-user-email'];
            const fallbackEmail = Array.isArray(headerEmailRaw)
              ? headerEmailRaw[0]
              : headerEmailRaw;

            const result = await getService().handleRequest(parsed, {
              fallbackEmail,
            });
            sendJson(res, 200, result);
          } catch (err: unknown) {
            sendJson(res, 400, {
              ok: false,
              errorCode: 'BAD_REQUEST',
              errorMessage:
                err instanceof Error ? err.message : 'Invalid JSON request body',
            });
          }
        })();
        return;
      }

      sendJson(res, 405, {
        ok: false,
        errorCode: 'BAD_REQUEST',
        errorMessage: `Method ${req.method ?? 'UNKNOWN'} not allowed on ${urlPath}`,
      });
    });
  };

  return {
    name: 'sc-api-middleware',
    configureServer(server) {
      attachMiddleware(server.middlewares);
    },
    configurePreviewServer(server) {
      attachMiddleware(server.middlewares);
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), scApiMiddlewarePlugin()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalized = id.replace(/\\/g, '/');
          if (normalized.includes('node_modules/xlsx')) {
            return 'xlsx-vendor';
          }
          if (
            normalized.includes('node_modules/react/') ||
            normalized.includes('node_modules/react-dom/')
          ) {
            return 'react-vendor';
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
