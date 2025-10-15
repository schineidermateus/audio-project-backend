const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { UPLOAD_DIR } = require('../constants/directory.constants');

const outputDir = path.join(__dirname, '..', UPLOAD_DIR); 

// Função auxiliar para download e limpeza
const sendFileAndCleanup = (res, inputFiles, outputPath, outputFileName) => {
    res.download(outputPath, outputFileName, (err) => {
        if (err) {
            console.error('Erro no download:', err);
        }
        if (Array.isArray(inputFiles)) {
            inputFiles.forEach(file => fs.unlinkSync(file.path));
        } else if (inputFiles && inputFiles.path) {
            fs.unlinkSync(inputFiles.path);
        }
        fs.unlinkSync(outputPath);
    });
};

// 1. Lógica de JUNÇÃO
exports.joinAudios = (req, res) => {
    const inputFiles = req.files;
    
    if (!inputFiles || inputFiles.length < 2) {
        return res.status(400).send('É necessário enviar pelo menos dois arquivos MP3.');
    }
    
    const outputFileName = `joined-${Date.now()}.mp3`;
    const outputPath = path.join(outputDir, outputFileName);
    
    const command = ffmpeg();
    inputFiles.forEach(file => command.input(file.path));

    command.on('end', () => {
        sendFileAndCleanup(res, inputFiles, outputPath, outputFileName);
    })
    .on('error', (err) => {
        console.error('Erro no FFmpeg (Junção):', err.message);
        // Limpa inputs mesmo com erro
        inputFiles.forEach(file => fs.unlinkSync(file.path));
        res.status(500).send('Erro no processamento da junção de áudio.');
    })
    .mergeToFile(outputPath, outputDir);
};

// 2. Lógica de CORTE
exports.cutAudio = (req, res) => {
    const inputFile = req.file;
    const { startTime, duration } = req.body; 

    if (!inputFile || !startTime || !duration) {
        return res.status(400).send('Arquivo, tempo de início e duração são obrigatórios.');
    }

    const outputFileName = `cut-${Date.now()}.mp3`;
    const outputPath = path.join(outputDir, outputFileName);
    
    ffmpeg(inputFile.path)
        .setStartTime(startTime)
        .setDuration(duration)
        .on('end', () => {
            sendFileAndCleanup(res, inputFile, outputPath, outputFileName);
        })
        .on('error', (err) => {
            console.error('Erro no FFmpeg (Corte):', err.message);
            fs.unlinkSync(inputFile.path);
            res.status(500).send('Erro no processamento do corte de áudio.');
        })
        .save(outputPath);
};

// 3. Lógica de MIXAGEM
exports.mixAudios = (req, res) => {
    const inputFiles = req.files;
    
    if (!inputFiles || inputFiles.length !== 2) {
        return res.status(400).send('É necessário enviar exatamente dois arquivos MP3 para a mixagem.');
    }
    
    const [file1, file2] = inputFiles;

    const outputFileName = `mixed-${Date.now()}.mp3`;
    const outputPath = path.join(outputDir, outputFileName);

    ffmpeg()
        .input(file1.path) 
        .input(file2.path) 
        .complexFilter([
            '[0:a] [1:a] amix=inputs=2 [a]'
        ], 'a') 
        .on('end', () => {
            sendFileAndCleanup(res, inputFiles, outputPath, outputFileName);
        })
        .on('error', (err) => {
            console.error('Erro no FFmpeg (Mixagem):', err.message);
            inputFiles.forEach(file => fs.unlinkSync(file.path));
            res.status(500).send('Erro no processamento da mixagem de áudio.');
        })
        .save(outputPath);
};