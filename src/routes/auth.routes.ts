import { Router, Request, Response } from "express";
import {
  createUser,
  loginUser,
  createAdminUser,
} from "../services/user.services";
import { authorize } from "../middlewares/auth.middlewares";
import { UserRole } from "@prisma/client";

const router = Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!email || !emailRegex.test(email))
      return res.status(400).json({ error: "Email inválido." });
    if (!password || password.length < 8)
      return res.status(400).json({ error: "Senha curta." });
    if (!name) return res.status(400).json({ error: "Nome obrigatório." });

    const user = await createUser({ name, email, password });
    const { token } = await loginUser({ email, password });

    res.status(201).json({
      message: "Usuário criado!",
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken: token,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post(
  "/admin",
  authorize([UserRole.ADMIN]),
  async (req: Request, res: Response) => {
    try {
      const { name, email, password } = req.body;

      if (!email || !emailRegex.test(email))
        return res.status(400).json({ error: "Email inválido." });
      if (!password || password.length < 6)
        return res.status(400).json({ error: "Senha curta." });
      if (!name) return res.status(400).json({ error: "Nome obrigatório." });

      const admin = await createAdminUser({ name, email, password });

      res.status(201).json({
        message: "Administrador criado com sucesso!",
        user: {
          id: admin.id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
        },
      });
    } catch (error: any) {
      console.error("Erro ao criar admin:", error);
      res
        .status(400)
        .json({ error: error.message || "Erro ao criar administrador" });
    }
  }
);

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const { token } = await loginUser({ email, password });
    res.json({ accessToken: token });
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
});

export default router;
