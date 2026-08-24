import pino from "pino";

const redactPaths = [
  "password",
  "passwordHash",
  "wordpressPassword",
  "applicationPassword",
  "authorization",
  "cookie",
  "req.headers.authorization",
  "req.headers.cookie",
  "headers.authorization",
  "headers.cookie",
  "*.password",
  "*.secret",
  "*.token",
  "*.webhookUrl",
];

export const logger = pino({
  name: "antigravity-os",
  level: process.env.LOG_LEVEL ?? "info",
  base: {
    service: "antigravity-os",
    environment: process.env.NODE_ENV ?? "development",
  },
  redact: {
    paths: redactPaths,
    censor: "[REDACTED]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
