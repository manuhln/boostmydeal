// Load environment variables first
import { config } from 'dotenv';
config();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { connectDB } from "./config/database";
import authRoutes from "./routes/auth";

// Initialize workers and services
import './modules/calls/workers';
import { invoiceScheduler } from './modules/billing/services/InvoiceScheduler';
import { callbackScheduler } from './modules/calls/services/CallbackScheduler';

const app = express();

// Connect to MongoDB
connectDB().catch(console.error);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Auth routes
app.use('/api/auth', authRoutes);

// Webhook routes (BEFORE other API routes to avoid auth middleware)  
import { webhookRouter } from './modules/calls/routes/callRoutes';
import { webhookRoutes } from './routes/webhook.routes';
app.use('/api/webhook', webhookRouter);
app.use('/api/webhook', webhookRoutes);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start the invoice scheduler after server is ready
    try {
      invoiceScheduler.startScheduler();
      console.log('✅ [Server] Invoice scheduler initialized');
    } catch (error) {
      console.error('❌ [Server] Failed to start invoice scheduler:', error);
    }
    
    // Start the callback scheduler after server is ready
    try {
      callbackScheduler.startScheduler();
      console.log('✅ [Server] Callback scheduler initialized');
    } catch (error) {
      console.error('❌ [Server] Failed to start callback scheduler:', error);
    }
  });
})();
