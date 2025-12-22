import type { Express } from "express";
import { createServer, type Server } from "http";
import { registerAuthRoutes } from "./routes/auth";
import apiRoutes from "./routes/index";

export async function registerRoutes(app: Express): Promise<Server> {
  // Register auth routes
  await registerAuthRoutes(app);

  // Register API routes with new MVC structure
  app.use('/api', apiRoutes);

  const httpServer = createServer(app);
  return httpServer;
}
