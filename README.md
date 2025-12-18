# ⚙️ Documentação do Backend - Node.js/Express

O backend do **AudioTools** é construído em **Node.js** com a framework **Express** e utiliza uma arquitetura modular para separar responsabilidades.  
Seu principal objetivo é fornecer endpoints eficientes para o processamento de áudio, aproveitando o poder do **FFmpeg**.

---

## 🚀 Tecnologias Chave

- **Framework:** Express.js (Node.js)  
- **Processamento de Áudio:** FFmpeg (Binário instalado via Docker)  
- **Wrapper FFmpeg:** fluent-ffmpeg (Biblioteca Node.js)  
- **Upload de Arquivos:** multer (Middleware Express)  
- **Linguagem:** JavaScript / TypeScript (para tipagem)

---

## 🏗️ Estrutura e Modularidade

O projeto segue um padrão modular para separar a lógica de negócios da camada de transporte (HTTP):

| Caminho | Descrição |
|----------|------------|
| `src/server.js` | Ponto de entrada, configura o servidor HTTP e os timeouts. |
| `src/app.js` | Configuração global do Express, CORS e middlewares gerais. |
| `src/middleware/upload.middleware.js` | Contém a configuração e a instância do **multer** para lidar com `multipart/form-data` (upload de arquivos). |
| `src/controllers/audio.controller.js` | Camada de transporte. Lida com a requisição HTTP (`req`, `res`), valida os dados de entrada e chama os serviços de negócios. |
| `src/routes/audio.routes.js` | Define os endpoints da API sob o prefixo `/api` e associa o middleware de upload aos respectivos controllers. |
| `src/services/audio.service.js` | Camada de Lógica de Negócios. Contém as implementações das chamadas FFmpeg (Junção, Corte, Mixagem), isolando a complexidade do processamento de áudio. |

---

## 🌐 Endpoints da API

Todos os endpoints estão prefixados com `/api`.  
Eles esperam arquivos do tipo **multipart/form-data**.

| Rota | Método | Descrição | Parâmetros de Entrada |
|------|---------|------------|------------------------|
| `/api/join` | **POST** | Junta (concatena) múltiplos arquivos MP3 em um só. | `mp3Files[]` (múltiplos arquivos) |
| `/api/cut` | **POST** | Corta um segmento de áudio baseado em tempo de início e duração. | `mp3File` (1 arquivo), `startTime`, `duration` |
| `/api/mix` | **POST** | Mescla simultaneamente dois arquivos de áudio em um único stream. | `mp3Files[]` (exatamente 2 arquivos) |

---

## ⚙️ Processamento de Áudio (FFmpeg)

O **AudioService** é a única camada que interage com o `fluent-ffmpeg`.  
O FFmpeg é usado para as seguintes operações:

- **Junção:** Utiliza a função `mergeToFile` para concatenação.  
- **Corte:** Utiliza `setStartTime` e `setDuration` para extração de segmentos.  
- **Mixagem:** Utiliza `complexFilter` com o filtro `amix=inputs=2` para mesclar streams de áudio.

Após o processamento, o backend envia o arquivo binário diretamente ao cliente usando `res.download()`  
e garante a **limpeza dos arquivos temporários** (`uploads/`) no sistema de arquivos.

---

## 🐳 Execução via Docker

O backend é totalmente **containerizado**.  
O **Dockerfile** instala o **FFmpeg** e as dependências do Node.js automaticamente.

```bash
docker build -t backend .
docker run -p 3000:3000 backend
