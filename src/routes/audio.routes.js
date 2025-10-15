const express = require('express');
const router = express.Router();
const audioController = require('../controllers/audio.controller');
const upload = require('../middleware/upload.middleware');

// Define as rotas usando o middleware de upload e os controladores
// Rota de Junção: recebe um array de arquivos
router.post('/join', upload.array('mp3Files', 10), audioController.joinAudios);

// Rota de Corte: recebe um único arquivo
router.post('/cut', upload.single('mp3File'), audioController.cutAudio);

// Rota de Mixagem: recebe um array de 2 arquivos
router.post('/mix', upload.array('mp3Files', 2), audioController.mixAudios);

module.exports = router;