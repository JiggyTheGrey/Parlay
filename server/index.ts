import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import path from "path";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

async function startServer() {
  try {
    log("Starting server initialization...", "startup");
    
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    // Serve attached_assets directory for campaign banners and other uploaded assets
    app.use('/attached_assets', express.static(path.resolve(process.cwd(), 'attached_assets')));

    app.use((req, res, next) => {
      const start = Date.now();
      const reqPath = req.path;
      let capturedJsonResponse: Record<string, any> | undefined = undefined;

      const originalResJson = res.json;
      res.json = function (bodyJson, ...args) {
        capturedJsonResponse = bodyJson;
        return originalResJson.apply(res, [bodyJson, ...args]);
      };

      res.on("finish", () => {
        const duration = Date.now() - start;
        if (reqPath.startsWith("/api")) {
          let logLine = `${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`;
          if (capturedJsonResponse) {
            logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
          }

          log(logLine);
        }
      });

      next();
    });

    log("Registering routes...", "startup");
    const httpServer = await registerRoutes(app);
    log("Routes registered successfully", "startup");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error("Express error handler:", err);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (process.env.NODE_ENV === "production") {
      log("Setting up static file serving for production...", "startup");
      serveStatic(app);
    } else {
      log("Setting up Vite for development...", "startup");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || "5000", 10);
    
    httpServer.listen(
      {
        port,
        host: "0.0.0.0",
        reusePort: true,
      },
      () => {
        log(`Server started successfully on port ${port}`, "startup");
      },
    );
  } catch (error) {
    console.error("Fatal error during server startup:", error);
    process.exit(1);
  }
}

startServer();
