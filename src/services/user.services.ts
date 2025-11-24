import { PrismaClient, UserRole } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import * as jwt from "jsonwebtoken";

const prisma = new PrismaClient();

export const createUser = async (userData: any) => {
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
    
    if (err.code === "P2002") {
      const e: any = new Error("Email já cadastrado");
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
};


export const createAdminUser = async (userData: any) => {
  const hashedPassword = await bcrypt.hash(userData.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: UserRole.ADMIN, 
      },
    });
    return user;
  } catch (err: any) {
    if (err.code === "P2002") {
      const e: any = new Error("Email já cadastrado");
      e.statusCode = 409;
      throw e;
    }
    throw err;
  }
};

export const loginUser = async (loginData: any) => {
  const user = await prisma.user.findUnique({
    where: { email: loginData.email },
  });

  if (!user) {
    const e: any = new Error("Credenciais inválidas");
    e.statusCode = 401;
    throw e;
  }

  const isPasswordValid = await bcrypt.compare(
    loginData.password,
    user.password
  );

  if (!isPasswordValid) {
    const e: any = new Error("Credenciais inválidas");
    e.statusCode = 401;
    throw e;
  }

 
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET || "secret", 
    { expiresIn: "8h" }
  );

  return { token };
};
