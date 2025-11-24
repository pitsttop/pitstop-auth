import express from "express";
import authRoutes from "./routes/auth.routes";
import { authorize } from "./middlewares/auth.middlewares";
import { UserRole } from "@prisma/client";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  })
);
app.use("/auth", authRoutes);

if (process.env.NODE_ENV === "test") {
  app.get("/protected", authorize([UserRole.CLIENT]), (req, res) => {
    return res.json({ ok: true, user: (req as any).user });
  });
}

export { app };
