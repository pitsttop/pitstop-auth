import { app } from "./app";

const port = 3002;

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 Auth Service rodando em http://localhost:${port}`);
});
