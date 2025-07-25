import express from 'express';
import path from 'path';
import session from 'express-session';
import passport from 'passport';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { authRouter } from './auth.js';
import { apiRouter } from './routes.js';
import { setupVite, serveStatic, log } from './vite.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'commission-tracker-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/auth', authRouter);
app.use('/api', apiRouter);

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server
const server = createServer(app);

// Setup Vite dev server or serve static files
if (process.env.NODE_ENV === 'production') {
  serveStatic(app);
} else {
  await setupVite(app, server);
}

server.listen(PORT, '0.0.0.0', () => {
  log(`serving on port ${PORT}`);
});