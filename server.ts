import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DJANGO_PORT = 8008; // Safe isolated port (avoid 8000 which is internal control plane)
const DJANGO_URL = `http://127.0.0.1:${DJANGO_PORT}`;

// Launch Django backend server child process if python environment has django
let djangoProcess: ChildProcess | null = null;
let isDjangoAvailable = false;

function findPythonCommand(): string {
  if (process.env.PYTHON_PATH) return process.env.PYTHON_PATH;
  // Common Windows user python install path if present
  const userPy = 'C:\\Users\\ankit\\AppData\\Local\\Python\\bin\\python.exe';
  try {
    const fs = (globalThis as any).fs || null;
  } catch {}
  return process.platform === 'win32' ? (process.env.PYTHON || 'python') : 'python3';
}

function startDjango() {
  const pythonCmd = process.env.PYTHON_EXEC || (process.platform === 'win32' ? 'C:\\Users\\ankit\\AppData\\Local\\Python\\bin\\python.exe' : 'python3');
  try {
    djangoProcess = spawn(pythonCmd, ['backend/manage.py', 'runserver', `127.0.0.1:${DJANGO_PORT}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    djangoProcess.stdout?.on('data', (data) => {
      isDjangoAvailable = true;
      console.log(`[Django] ${data.toString().trim()}`);
    });

    djangoProcess.stderr?.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg.includes('Watching for file changes') || msg.includes('Quit the server with') || msg.includes('Starting development server')) {
        isDjangoAvailable = true;
      }
      if (!msg.includes('ModuleNotFoundError')) {
        console.warn(`[Django] ${msg}`);
      }
    });

    djangoProcess.on('exit', () => {
      isDjangoAvailable = false;
    });
  } catch (err) {
    console.log('[Django] Standalone client execution active');
  }
}

// Cleanup on process shutdown
process.on('SIGINT', () => {
  if (djangoProcess) djangoProcess.kill('SIGINT');
  process.exit();
});
process.on('SIGTERM', () => {
  if (djangoProcess) djangoProcess.kill('SIGTERM');
  process.exit();
});

async function createServer() {
  startDjango();

  const app = express();

  // Proxy /api and /admin to Django REST Framework backend
  const djangoProxy = createProxyMiddleware({
    target: DJANGO_URL,
    changeOrigin: true,
    pathRewrite: (path, req) =>
      (req as any).originalUrl?.startsWith('/api')
        ? `/api${path}`
        : path,
    ws: false,
    on: {
      error: (err: any, req: any, res: any) => {
        console.warn('[Proxy Warning] Waiting for Django server to respond...', err.message);
        if (!res.headersSent && typeof res.status === 'function') {
          res.status(503).json({
            detail: 'Django backend initializing... Please retry in a few seconds.',
            code: 'BACKEND_INITIALIZING'
          });
        }
      }
    }
  });

  app.use('/api', djangoProxy);
  app.use('/admin', djangoProxy);

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Vite middleware for development
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[RoutePool Applet] Ready at http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error('[Server Error]', err);
});
