import { Router, Request, Response } from "express";
import { createUser, loginUser } from "../services/user.services";
// REMOVA O IMPORT DO CLIENT SERVICE!
// import { createClient } from "../services/client.services"; <--- APAGUE ISSO

const router = Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/signup", async (req: Request, res: Response) => {
  try {
    // Recebemos os dados. Note que 'phone' e 'address' não serão usados aqui no Auth,
    // mas o frontend pode enviar. Vamos usar apenas name, email e password.
    const { name, email, password } = req.body;

    // --- Validações ---
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Email inválido ou ausente.", code: 'INVALID_EMAIL' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: "Senha inválida: mínimo 8 caracteres.", code: 'INVALID_PASSWORD' });
    }
    if (!name) {
        return res.status(400).json({ error: "Nome é obrigatório.", code: 'MISSING_FIELDS' });
    }

    // --- Lógica Limpa (Apenas Auth) ---
    
    // 1. Cria o Usuário (Schema Auth)
    const user = await createUser({ name, email, password });

    // 2. Faz o login automático para gerar o token
    const { token } = await loginUser({ email, password });

    // 3. Retorna o sucesso
    // NÃO CRIAMOS O CLIENTE AQUI. O Frontend deve fazer isso usando o token.
    res.status(201).json({
      message: "Usuário criado com sucesso!",
      user: { id: user.id, email: user.email, name: user.name, role: user.role }, 
      accessToken: token 
    });

  } catch (error: any) {
    console.error("Erro no signup:", error);
    if (error && error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
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
    
    res.json({ accessToken: token }); 

  } catch (error: any) {
    const body: any = { error: error.message };
    if (error.code) body.code = error.code;
    return res.status(401).json(body);
  }
});

export default router;