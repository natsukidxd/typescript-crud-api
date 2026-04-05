//src/server.ts
import express, { Application } from "express";
import cors from "cors";
import { errorHandler } from "./_middleware/errorHandler";
import { initialize } from "./_helpers/db";
import { env } from "./_helpers/env";
import { setupSwagger } from "./_helpers/swagger";
import usersController from "./users/users.controller";
import apiController from "./api/api.controller";

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || origin === "null") return callback(null, true);
      try {
        const url = new URL(origin);
        const host = url.hostname.toLowerCase();
        if (host === "localhost" || host === "127.0.0.1") {
          return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
      } catch {
        return callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);
app.use(express.static("public"));

// API Routes
app.use("/api", apiController);
app.use("/auth", apiController);
app.use("/users", usersController);

setupSwagger(app);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found" });
});
app.use("/auth", (req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Global Error Handler (must be last)
app.use(errorHandler);

// Start server initialize database
const PORT = env.PORT;

initialize()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Test with: POST /users with { email, password,... }`);
    });
  })
  .catch((err) => {
    console.error("X Failed to initialize database:", err);
    process.exit(1);
  });
