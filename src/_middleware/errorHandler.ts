//src/_middleware/errorHandler.ts
import type { Request, Response, NextFunction } from "express";
export function errorHandler(
  err: Error | string,
  req: Request,
  res: Response,
  next: NextFunction,
): Response | void {
  if (typeof err === "string") {
    // Custom application error
    const is404 = err.toLowerCase().endsWith("not found");
    const statusCode = is404 ? 404 : 400;
    return res.status(statusCode).json({ error: err, message: err });
  }
  if (err instanceof Error) {
    // Standard Error object
    return res.status(500).json({ error: err.message, message: err.message });
  }
  // Fallback
  return res
    .status(500)
    .json({ error: "Internal server error", message: "Internal server error" });
}
