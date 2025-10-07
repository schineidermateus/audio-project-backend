const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');

const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const server = app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
});

server.timeout = 600000; 

const corsOptions = {
  origin: 'http://localhost:4200',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};

app.use(cors(corsOptions)); 

// Configuração do Multer para armazenar os uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Salva os arquivos no diretório 'uploads'
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        // Renomeia para evitar colisões (ex: 'audio-123456.mp3')
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});
const upload = multer({ storage: storage });

// Rota de saúde (Health Check)
app.get('/', (req, res) => {
    res.send('Audio Processing API is running!');
});

// Rota para JUNTAR MP3s
// Usamos .array() pois o usuário pode subir múltiplos arquivos
app.post('/api/join', upload.array('mp3Files', 10), async (req, res) => {
    const inputFiles = req.files;
    
    if (!inputFiles || inputFiles.length < 2) {
        return res.status(400).send('É necessário enviar pelo menos dois arquivos MP3 para junção.');
    }
    
    const outputFileName = `joined-${Date.now()}.mp3`;
    const outputPath = path.join(uploadDir, outputFileName);
    
    console.log(`Iniciando junção de ${inputFiles.length} arquivos...`);

    const command = ffmpeg();

    // Adiciona todos os arquivos de entrada
    inputFiles.forEach(file => {
        command.input(file.path);
    });

    // Força a concatenação (junção) de streams
    command.on('end', () => {
        console.log('Junção concluída! Enviando arquivo...');
        
        // 1. Envia o arquivo ao cliente
        res.download(outputPath, outputFileName, (err) => {
            if (err) {
                console.error('Erro no download:', err);
                // Lidar com o erro de download
            }
            // 2. Limpa os arquivos temporários após o envio
            inputFiles.forEach(file => fs.unlinkSync(file.path));
            fs.unlinkSync(outputPath);
        });

    }).on('error', (err, stdout, stderr) => {
        console.error('Erro no FFmpeg:', err.message, stdout, stderr);
        res.status(500).send('Erro no processamento do áudio.');
        
        // Limpa apenas os arquivos de entrada em caso de erro
        inputFiles.forEach(file => fs.unlinkSync(file.path));

    }).mergeToFile(outputPath, uploadDir); // Concatena e salva no caminho de saída
});

app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
});