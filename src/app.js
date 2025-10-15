const express = require('express');
const cors = require('cors');
const audioRoutes = require('./routes/audio.routes');

const app = express();

// Configuração do CORS
const corsOptions = {
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
};
app.use(cors(corsOptions)); 

// Middleware para aumentar o limite do body (payload)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rota de saúde (Health Check)
app.get('/', (req, res) => {
    res.send('Audio Processing API is running!');
});

// Ponto de entrada ÚNICO para as rotas da API
app.use('/api', audioRoutes);

module.exports = app;