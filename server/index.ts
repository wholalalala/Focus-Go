import "dotenv/config";
import express from "express";
import { resolve } from "node:path";
import { createApp } from "./app";
const app = createApp();
app.use(express.static(resolve("dist")));
app.get("/{*path}", (_req, res) => res.sendFile(resolve("dist/index.html")));
const port = Number(process.env.PORT) || 3001;
app.listen(port, "0.0.0.0", () =>
  console.log(`Focus&Go API: http://0.0.0.0:${port}`),
);
