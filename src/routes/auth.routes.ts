import { Router, Request, Response } from "express";
import { createUser, loginUser } from "../services/user.services";
// 1. IMPORTAR O SERVIÇO QUE VOCÊ COPIOU PARA ESTE REPO
import { createClient } from "../services/client.services"; 

const router = Router();

// Expressão regular para validar email
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/signup", async (req: Request, res: Response) => {
  try {
    // Esta é a linha que estava incompleta. 
    // Certifique-se de que o frontend envie 'name', 'email', 'password', 'phone', 'address'.
    const { name, email, password, phone, address } = req.body;

    // --- 2. Validações de email e senha ---
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: "Email inválido ou ausente.", code: 'INVALID_EMAIL' });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: "Senha inválida: mínimo 8 caracteres.", code: 'INVALID_PASSWORD' });
    }
    if (!name || !phone) {
        return res.status(400).json({ error: "Nome e telefone são obrigatórios.", code: 'MISSING_FIELDS' });
    }

    // --- 3. Lógica "Inteligente" (criar os dois) ---
    
    // 3a. Cria o registro de autenticação (User)
    // O service 'createUser' deve retornar o usuário (sem a senha!)
    const user = await createUser({ name, email, password }); // Passa apenas os dados do User

    // 3b. Cria o registro de negócio (Client)
    const client = await createClient({
      name: name, // Usa os dados do 'user' recém-criado
      email: user.email,
      phone: phone, // Usa o 'phone' do req.body
      address: address || null, // Usa o 'address' (opcional)
      // Se o model Client tiver um link para o User (ex: userId),
      // você deve fazer a conexão aqui.
      // Ex: userId: user.id 
    });

    // 4. (Opcional, mas recomendado) Faça o login automático
    const { token } = await loginUser({ email, password });

    res.status(201).json({
      message: "Usuário e Cliente criados com sucesso!",
      // Nunca retorne a senha!
      user: { id: user.id, email: user.email, name: user.name, role: user.role }, 
      client,
      accessToken: token // Envia o token para o frontend já sair logado
    });

  } catch (error: any) {
    console.error("Erro no signup:", error);
    // Trata erros (ex: email duplicado) que vêm do service
    if (error && error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    res.status(500).json({ error: "Não foi possível realizar o cadastro.", code: 'SIGNUP_ERROR' });
  }
});

// --- ROTA DE LOGIN CORRIGIDA ---
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios.', code: 'MISSING_CREDENTIALS' });
    }
    
    const { token } = await loginUser(req.body);
    
    // MUDANÇA IMPORTANTE: O frontend (useAuth.tsx) espera 'accessToken'
    res.json({ accessToken: token }); 

  } catch (error: any) {
    // Trata erros (ex: senha inválida) que vêm do service
    const body: any = { error: error.message };
    if (error.code) body.code = error.code;
    return res.status(401).json(body);
  }
});

export default router;