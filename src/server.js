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

// Rota para CORTAR um MP3
// Usamos .single() pois o usuário enviará apenas um arquivo
app.post('/api/cut', upload.single('mp3File'), async (req, res) => {
    const inputFile = req.file;
    // O Multer salva campos de texto em req.body
    const { startTime, duration } = req.body; 

    if (!inputFile || !startTime || !duration) {
        return res.status(400).send('É necessário enviar um arquivo e especificar o tempo de início e a duração do corte.');
    }
    
    // Verificações básicas de tempo (você pode querer validações mais robustas)
    if (isNaN(parseFloat(startTime)) || isNaN(parseFloat(duration))) {
         return res.status(400).send('Tempo de início e duração devem ser números válidos (segundos).');
    }

    const outputFileName = `cut-${Date.now()}.mp3`;
    const outputPath = path.join(uploadDir, outputFileName);
    
    console.log(`Iniciando corte de áudio: Início=${startTime}s, Duração=${duration}s`);

    // Lógica do FFmpeg para Corte:
    ffmpeg(inputFile.path)
        .setStartTime(startTime)  // Define o tempo de início do corte (em segundos ou HH:MM:SS)
        .setDuration(duration)    // Define a duração do segmento a ser extraído (em segundos)
        .on('end', () => {
            console.log('Corte concluído! Enviando arquivo...');
            
            // 1. Envia o arquivo ao cliente
            res.download(outputPath, outputFileName, (err) => {
                if (err) {
                    console.error('Erro no download:', err);
                }
                // 2. Limpa os arquivos temporários após o envio
                fs.unlinkSync(inputFile.path);
                fs.unlinkSync(outputPath);
            });

        }).on('error', (err, stdout, stderr) => {
            console.error('Erro no FFmpeg:', err.message, stdout, stderr);
            res.status(500).send('Erro no processamento do áudio.');
            
            // Limpa o arquivo de entrada em caso de erro
            fs.unlinkSync(inputFile.path);

        }).save(outputPath); // Salva o arquivo cortado
});

// ... (imports, uploadDir, storage, upload setup, e as rotas /api/join e /api/cut permanecem)

// Rota para MIXAR dois MP3s (Mesclagem Simultânea)
// Usamos .array() para receber os dois arquivos de entrada
app.post('/api/mix', upload.array('mp3Files', 2), async (req, res) => {
    const inputFiles = req.files;
    
    if (!inputFiles || inputFiles.length !== 2) {
        return res.status(400).send('É necessário enviar exatamente dois arquivos MP3 para a mixagem.');
    }
    
    const [file1, file2] = inputFiles;

    const outputFileName = `mixed-${Date.now()}.mp3`;
    const outputPath = path.join(uploadDir, outputFileName);
    
    console.log(`Iniciando mixagem de dois arquivos: ${file1.originalname} e ${file2.originalname}`);

    // Lógica do FFmpeg para Mixagem (usando o filtro 'amix'):
    ffmpeg()
        // Adiciona o primeiro input
        .input(file1.path) 
        // Adiciona o segundo input
        .input(file2.path) 
        
        // Aplica o filtro complexo 'amix'
        // [0:a] e [1:a] referenciam o stream de áudio (a) do primeiro (0) e segundo (1) input.
        // inputs=2: Diz ao filtro 'amix' para combinar 2 streams.
        // [a] é o nome do stream de saída.
        .complexFilter([
            '[0:a] [1:a] amix=inputs=2 [a]'
        ], 'a') // O segundo argumento 'a' garante que o stream de áudio final seja usado
        
        .on('end', () => {
            console.log('Mixagem concluída! Enviando arquivo...');
            
            // 1. Envia o arquivo ao cliente
            res.download(outputPath, outputFileName, (err) => {
                if (err) {
                    console.error('Erro no download:', err);
                }
                // 2. Limpa os arquivos temporários após o envio
                inputFiles.forEach(file => fs.unlinkSync(file.path));
                fs.unlinkSync(outputPath);
            });

        }).on('error', (err, stdout, stderr) => {
            console.error('Erro no FFmpeg:', err.message, stdout, stderr);
            res.status(500).send('Erro no processamento do áudio.');
            
            // Limpa os arquivos de entrada em caso de erro
            inputFiles.forEach(file => fs.unlinkSync(file.path));

        }).save(outputPath); // Salva o arquivo mixado
});

app.listen(PORT, () => {
    console.log(`Backend rodando na porta ${PORT}`);
});