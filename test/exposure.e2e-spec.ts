import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as util from "util";
import * as child_process from "child_process";
import { app } from "../src/app";

let prisma: PrismaClient;
const exec = util.promisify(child_process.exec);

describe("Exposure tests (sensitive data)", () => {
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error("Variável de ambiente TEST_DATABASE_URL não definida");
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    prisma = new PrismaClient({
      datasources: {
        db: { url: process.env.TEST_DATABASE_URL },
      },
    });
    await exec(
      "npx prisma migrate deploy --schema=./prisma/schema.prisma"
    ).catch(() => {});
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "public" CASCADE;`);
      await prisma.$disconnect();
    }
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it("signup response must not expose password", async () => {
    const newUser = {
      name: "Expose",
      email: "expose@teste.com",
      password: "Segredo123!",
    };
    const res = await request(app).post("/auth/signup").send(newUser);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("user");
    expect(res.body.user).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("password");
    const userInDb = await prisma.user.findUnique({
      where: { email: newUser.email },
    });
    expect(userInDb).toBeDefined();
    expect(userInDb?.password).toBeDefined();
    expect(userInDb?.password).not.toBe(newUser.password);
  });

  it("login response must not expose password", async () => {
    const newUser = {
      name: "LoginExpose",
      email: "login-expose@teste.com",
      password: "Segredo123!",
    };
    await request(app).post("/auth/signup").send(newUser);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: newUser.email, password: newUser.password });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body).not.toHaveProperty("password");
  });

  it("error responses should not echo sensitive fields", async () => {
    const usr = {
      name: "Dup2",
      email: "dup2@teste.com",
      password: "Segredo123!",
    };
    const r1 = await request(app).post("/auth/signup").send(usr);
    expect(r1.status).toBe(201);
    const r2 = await request(app).post("/auth/signup").send(usr);
    expect(r2.status).toBe(409);
    expect(r2.body).toHaveProperty("error");
    expect(r2.body).not.toHaveProperty("password");
  });
});
