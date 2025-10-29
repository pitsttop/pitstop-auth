// test/auth.e2e-spec.ts

import { PrismaClient } from "@prisma/client";
import request from "supertest";
import * as util from "util";
import * as child_process from "child_process";
import { app } from "../src/app"; // Vamos precisar de ajustar o index.ts para exportar o 'app'

// Inicializaremos o Prisma Client dentro de beforeAll para garantir que
// a variável de ambiente TEST_DATABASE_URL esteja disponível
let prisma: PrismaClient;

// Converte a função 'exec' para uma Promise
const exec = util.promisify(child_process.exec);

describe("Auth Service (Integration / E2E)", () => {
  // Não precisamos de criar um servidor HTTP separado — o Supertest usa a app diretamente.

  // ANTES de todos os testes, preparamos o banco de dados de teste
  beforeAll(async () => {
    // Garante que a variável de ambiente está carregada
    if (!process.env.TEST_DATABASE_URL) {
      throw new Error("Variável de ambiente TEST_DATABASE_URL não definida");
    }
    // Garantir uma secret para os testes
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
    // Inicializa o Prisma apontando para o DB de teste
    prisma = new PrismaClient({
      datasources: {
        db: {
          url: process.env.TEST_DATABASE_URL,
        },
      },
    });

  // Executa as migrações do Prisma no banco de dados de TESTE (se houver migrations)
  // (O script wait-for-db.sh já garantiu que o schema foi aplicado via db push)
  await exec("npx prisma migrate deploy --schema=./prisma/schema.prisma").catch(()=>{});
  });

  // DEPOIS de todos os testes, fechamos a ligação e limpamos o banco
  afterAll(async () => {
    if (prisma) {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "public" CASCADE;`);
      await prisma.$disconnect();
    }
  });

  // Antes de CADA teste, limpamos a tabela de utilizadores
  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  // O nosso primeiro teste E2E
  describe("POST /auth/signup", () => {
    it("deve criar um novo utilizador e retornar 201", async () => {
      // 1. ARRANJO (Arrange)
      const newUser = {
        name: "Utilizador E2E",
        email: "e2e@teste.com",
        password: "senha123",
        phone: "123456789",
      };

      // 2. AÇÃO (Act)
      // Usamos o 'supertest' para fazer uma chamada HTTP real à nossa aplicação
      const response = await request(app).post("/auth/signup").send(newUser);

      // 3. ASSERÇÃO (Assert)
      // Verificamos a resposta HTTP
      expect(response.status).toBe(201);
      expect(response.body.message).toBe("Usuário criado com sucesso!");

      // 4. Verificação no Banco de Dados
      // Verificamos se o utilizador foi REALMENTE criado no banco de dados de teste
      const userInDb = await prisma.user.findUnique({
        where: { email: newUser.email },
      });
      expect(userInDb).toBeDefined();
      expect(userInDb?.name).toBe(newUser.name);
    });

    it("deve retornar 400 quando email for inválido", async () => {
      const res = await request(app).post('/auth/signup').send({ name: 'X', email: 'invalid-email', password: 'senha1234' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.code).toBe('INVALID_EMAIL');
    });

    it("deve retornar 409 quando email já estiver cadastrado", async () => {
      const newUser = { name: 'Dup', email: 'dup@teste.com', password: 'senha1234' };
      // cria primeiro
      const r1 = await request(app).post('/auth/signup').send(newUser);
      expect(r1.status).toBe(201);

      // tenta criar novamente
      const r2 = await request(app).post('/auth/signup').send(newUser);
      expect(r2.status).toBe(409);
      expect(r2.body).toHaveProperty('error');
      expect(r2.body.code).toBe('EMAIL_EXISTS');
    });

    it("deve retornar 400 quando senha for curta", async () => {
      const res = await request(app).post('/auth/signup').send({ name: 'Y', email: 'y@teste.com', password: 'short' });
      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
      expect(res.body.code).toBe('INVALID_PASSWORD');
    });
  });

  describe("POST /auth/login", () => {
    it("deve autenticar usuário e retornar token", async () => {
      const newUser = {
        name: "Utilizador E2E",
        email: "login-e2e@teste.com",
        password: "senha123",
      };

      // cria via endpoint
      await request(app).post("/auth/signup").send(newUser);

      // tenta autenticar
      const response = await request(app)
        .post("/auth/login")
        .send({ email: newUser.email, password: newUser.password });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
    });

    it('deve retornar 401 e code INVALID_CREDENTIALS quando senha estiver errada', async () => {
      const newUser = { name: 'BadLogin', email: 'badlogin@teste.com', password: 'senha1234' };
      await request(app).post('/auth/signup').send(newUser);

      const res = await request(app).post('/auth/login').send({ email: newUser.email, password: 'wrongpass' });
      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error');
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('deve retornar 401 e code INVALID_CREDENTIALS quando email não existir', async () => {
      const res = await request(app).post('/auth/login').send({ email: 'noexist@teste.com', password: 'whatever' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe("GET /protected (rota de teste)", () => {
    it("deve permitir acesso a rota protegida com token válido", async () => {
      const newUser = {
        name: "Protected E2E",
        email: "protected-e2e@teste.com",
        password: "senha123",
      };

      // cria e autentica
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
