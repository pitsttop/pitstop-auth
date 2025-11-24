import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as util from "util";
import * as child_process from "child_process";
import { app } from "../src/app";

let prisma: PrismaClient;
const exec = util.promisify(child_process.exec);

describe("Auth Service (Integration / E2E)", () => {
  beforeAll(async () => {
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error("Variável de ambiente TEST_DATABASE_URL não definida");
    }
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL,
        },
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
  describe("POST /auth/signup", () => {
    it("deve criar um novo utilizador e retornar 201", async () => {
      const newUser = {
        name: "Utilizador E2E",
        email: "e2e@teste.com",
        password: "senha123",
        phone: "123456789",
      };

      const response = await request(app).post("/auth/signup").send(newUser);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Usuário criado com sucesso!");

      const userInDb = await prisma.user.findUnique({
        where: { email: newUser.email },
      });
      expect(userInDb).toBeDefined();
      expect(userInDb?.name).toBe(newUser.name);
    });

    it("deve retornar 400 quando email for inválido", async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({ name: "X", email: "invalid-email", password: "senha1234" });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.code).toBe("INVALID_EMAIL");
    });

    it("deve retornar 409 quando email já estiver cadastrado", async () => {
      const newUser = {
        name: "Dup",
        email: "dup@teste.com",
        password: "senha1234",
      };
      const r1 = await request(app).post("/auth/signup").send(newUser);
      expect(r1.status).toBe(201);

      const r2 = await request(app).post("/auth/signup").send(newUser);
      expect(r2.status).toBe(409);
      expect(r2.body).toHaveProperty("error");
      expect(r2.body.code).toBe("EMAIL_EXISTS");
    });

    it("deve retornar 400 quando senha for curta", async () => {
      const res = await request(app)
        .post("/auth/signup")
        .send({ name: "Y", email: "y@teste.com", password: "short" });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("error");
      expect(res.body.code).toBe("INVALID_PASSWORD");
    });
  });

  describe("POST /auth/login", () => {
    it("deve autenticar usuário e retornar token", async () => {
      const newUser = {
        name: "Utilizador E2E",
        email: "login-e2e@teste.com",
        password: "senha123",
      };

      await request(app).post("/auth/signup").send(newUser);

      const response = await request(app)
        .post("/auth/login")
        .send({ email: newUser.email, password: newUser.password });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    it("deve retornar 401 e code INVALID_CREDENTIALS quando senha estiver errada", async () => {
      const newUser = {
        name: "BadLogin",
        email: "badlogin@teste.com",
        password: "senha1234",
      };
      await request(app).post("/auth/signup").send(newUser);

      const res = await request(app)
        .post("/auth/login")
        .send({ email: newUser.email, password: "wrongpass" });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error");
      expect(res.body.code).toBe("INVALID_CREDENTIALS");
    });

    it("deve retornar 401 e code INVALID_CREDENTIALS quando email não existir", async () => {
      const res = await request(app)
        .post("/auth/login")
        .send({ email: "noexist@teste.com", password: "whatever" });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe("INVALID_CREDENTIALS");
    });
  });

  describe("GET /protected (rota de teste)", () => {
    it("deve permitir acesso a rota protegida com token válido", async () => {
      const newUser = {
        name: "Protected E2E",
        email: "protected-e2e@teste.com",
        password: "senha123",
      };

      await request(app).post("/auth/signup").send(newUser);
      const loginRes = await request(app)
        .post("/auth/login")
        .send({ email: newUser.email, password: newUser.password });

      const token = loginRes.body.token;
      expect(token).toBeDefined();

      const protectedRes = await request(app)
        .get("/protected")
        .set("Authorization", `Bearer ${token}`);

      expect(protectedRes.status).toBe(200);
      expect(protectedRes.body.ok).toBe(true);
      expect(protectedRes.body.user).toBeDefined();
    });
  });
});
