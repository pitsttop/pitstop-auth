// pitstop-auth/src/index.ts

import express from "express";
import authRoutes from "./routes/auth.routes";

const app = express();
// O serviço de autenticação pode rodar em uma porta diferente, ex: 3002
const port = 3002;

app.use(express.json());

// A "Fiação"
app.use("/auth", authRoutes);

app.listen(port, () => {
  console.log(`🚀 Auth Service rodando em http://localhost:${port}`);
});
