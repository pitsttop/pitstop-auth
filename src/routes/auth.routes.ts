import { Router, Request, Response } from "express";

import { createUser, loginUser } from "../services/user.services";

const router = Router();

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const user = await createUser(req.body);

    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };

    res.status(201).json({
      message: "Usuário criado com sucesso!",
      user: userResponse,
    });
  } catch (error) {
    console.error("Erro no signup:", error);
    res.status(500).json({ error: "Não foi possível realizar o cadastro." });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { token } = await loginUser(req.body);
    res.json({ token });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

export default router;
