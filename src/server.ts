import { app } from "./app";

const port = process.env.PORT || 3002;

app.listen(port as number, "0.0.0.0", () => {
  console.log(`🚀 Auth Service rodando em http://localhost:${port}`);
});
