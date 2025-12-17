import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response } from "express";
import { getRatesToday, startBackgroundRefresh } from "./rates";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    name: "tasas-de-dolar-en-venezuela-api",
    endpoints: {
      health: "/health",
      ratesToday: "/api/rates/today",
    },
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get("/api/rates/today", (_req: Request, res: Response) => {
  res.json(getRatesToday());
});

startBackgroundRefresh();

const port = Number(process.env.PORT ?? 3001);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${port}`);
});
