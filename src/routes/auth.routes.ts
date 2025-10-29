import { Router, Request, Response } from "express";

import { createUser, loginUser } from "../services/user.services";

const router = Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    // Validações básicas
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Email inválido ou ausente.", code: 'INVALID_EMAIL' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: "Senha inválida: mínimo 8 caracteres.", code: 'INVALID_PASSWORD' });
    }

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
  } catch (error: any) {
    console.error("Erro no signup:", error);
    // Se o service lançou um erro com statusCode (ex: 409 para email duplicado), respeitamos
    if (error && error.statusCode) {
      const body: any = { error: error.message };
      if (error.code) body.code = error.code;
      return res.status(error.statusCode).json(body);
    }
    res.status(500).json({ error: "Não foi possível realizar o cadastro.", code: 'SIGNUP_ERROR' });
  }
});

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.', code: 'MISSING_CREDENTIALS' });
    }
    const { token } = await loginUser(req.body);
    res.json({ token });
  } catch (error: any) {
    const body: any = { error: error.message };
    if (error.code) body.code = error.code;
    return res.status(401).json(body);
  }
});

export default router;
