import express from "express";
import authRoutes from "./routes/auth.routes";
import { authorize } from "./middlewares/auth.middlewares";
import { UserRole } from "@prisma/client";
import cors from "cors";

const app = express();

app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://pitstop-frontend.vercel.app',
    'https://pitstop-frontend-dh5to3w0m-joao-lucas-araujo-siqueiras-projects.vercel.app'
  ],
  credentials: true
}));
app.use("/auth", authRoutes);

if (process.env.NODE_ENV === "test") {
  app.get("/protected", authorize([UserRole.CLIENT]), (req, res) => {
    return res.json({ ok: true, user: (req as any).user });
  });
}

export { app };
