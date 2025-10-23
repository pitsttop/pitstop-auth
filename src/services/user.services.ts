import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const createUser = async (userData: any) => {
  // Criptografa a senha antes de salvar no banco
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  const user = await prisma.user.create({
    data: {
      name: userData.name,
      email: userData.email,
      password: hashedPassword,
      role: UserRole.CLIENT,
    },
  });
  return user;
};

export const loginUser = async (loginData: any) => {
  // 1. Encontra o usuário pelo email
  const user = await prisma.user.findUnique({
    where: { email: loginData.email },
  });
  if (!user) {
    throw new Error("Credenciais inválidas");
  }

  // 2. Compara a senha enviada com a senha criptografada no banco
  const isPasswordValid = await bcrypt.compare(
    loginData.password,
    user.password
  );
  if (!isPasswordValid) {
    throw new Error("Credenciais inválidas");
  }

  // 3. Se tudo estiver correto, gera o Token JWT
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "8h" }
  );

  return { token };
};
