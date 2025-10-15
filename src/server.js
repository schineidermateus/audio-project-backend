const app = require('./app');

const PORT = 3000;

// Configuração de Timeout (para lidar com processamento longo do FFmpeg)
const server = app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
    console.log(`API Docs/Health Check: http://localhost:${PORT}`);
    console.log(`API Endpoints em: http://localhost:${PORT}/api/...`);
});

// Aumenta o timeout do servidor para dar tempo do FFmpeg processar
server.timeout = 300000;