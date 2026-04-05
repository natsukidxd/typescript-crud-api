//src/server.ts
import express, { Application } from "express";
import cors from "cors";
import { errorHandler } from "./_middleware/errorHandler";
import { initialize } from "./_helpers/db";
import usersController from "./users/users.controller";
import apiController from "./api/api.controller";

const app: Application = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = new Set([
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
      ]);
      if (!origin || origin === "null" || allowed.has(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  }),
);
app.use(express.static("public"));

// API Routes
app.use("/api", apiController);
app.use("/users", usersController);

// Global Error Handler (must be last)
app.use(errorHandler);

// Start server initialize database
const PORT = process.env.PORT || 4000;

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
