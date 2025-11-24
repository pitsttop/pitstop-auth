FROM node:18-alpine

WORKDIR /app

# Instala dependências
COPY package*.json ./
RUN npm install

# Copia código
COPY . .

# Gera o Prisma Client (Essencial!)
RUN npx prisma generate

# Compila o TypeScript (Cria a pasta dist)
RUN npm run build

# Porta do Auth (Geralmente 3002, mas o Render injeta a PORT correta)
EXPOSE 3002

# Comando de inicialização
CMD ["npm", "run", "start"]