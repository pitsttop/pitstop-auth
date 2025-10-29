import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const createUser = async (userData: any) => {
  // Criptografa a senha antes de salvar no banco
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: UserRole.CLIENT,
      },
    });
    return user;
  } catch (err: any) {
    // Tratamento para violações de unique constraint (e.g., email duplicado)
    // Prisma usa o código P2002 para unique constraint violations
    if (err.code === 'P2002' && err.meta && (err.meta.target as string[]).includes('email')) {
      const e: any = new Error('Email já cadastrado');
      e.statusCode = 409; // Conflict
      e.code = 'EMAIL_EXISTS';
      throw e;
    }
    throw err;
  }
};

export const loginUser = async (loginData: any) => {
  // 1. Encontra o usuário pelo email
  const user = await prisma.user.findUnique({
    where: { email: loginData.email },
  });
  if (!user) {
    const e: any = new Error("Credenciais inválidas");
    e.statusCode = 401;
    e.code = 'INVALID_CREDENTIALS';
    throw e;
  }

  // 2. Compara a senha enviada com a senha criptografada no banco
  const isPasswordValid = await bcrypt.compare(
    loginData.password,
    user.password
  );
  if (!isPasswordValid) {
    const e: any = new Error("Credenciais inválidas");
    e.statusCode = 401;
    e.code = 'INVALID_CREDENTIALS';
    throw e;
  }

  // 3. Se tudo estiver correto, gera o Token JWT
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "8h" }
  );

  return { token };
};
