// src/server.ts

import { app } from "./app"; // Importa a aplicação que definimos

const port = 3002;

app.listen(port, () => {
  console.log(`🚀 Auth Service rodando em http://localhost:${port}`);
});
