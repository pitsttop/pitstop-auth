# pitstop-auth/Dockerfile

# Usamos uma imagem oficial do Node.js como base
FROM node:18-alpine

# Define o diretório de trabalho dentro do contêiner
WORKDIR /app

# Copia os arquivos de definição de pacotes
COPY package.json package-lock.json ./

# Instala TODAS as dependências
RUN npm install

# Copia o resto do código-fonte do projeto
COPY . .