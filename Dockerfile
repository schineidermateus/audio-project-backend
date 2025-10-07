# Usa uma imagem base oficial do Node.js
FROM node:20-slim

# Instala o FFmpeg e outras dependências básicas
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho dentro do container
WORKDIR /usr/src/app

# Copia os arquivos package.json e package-lock.json
COPY package*.json ./

# Instala as dependências do projeto (incluirá fluent-ffmpeg aqui)
RUN npm install

# Copia o restante do código da aplicação
COPY . .

# Expõe a porta que o Node.js vai rodar
EXPOSE 3000

# Comando para iniciar a aplicação
CMD [ "node", "src/server.js" ]