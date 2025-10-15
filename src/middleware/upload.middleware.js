const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR, TEMP_DIR } = require('../constants/directory.constants');

const uploadDir = path.join(__dirname, '..', UPLOAD_DIR);
const tempDir = path.join(__dirname, '..', TEMP_DIR);

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); 
    },
    filename: (req, file, cb) => {
        cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { 
        fileSize: 50 * 1024 * 1024
    }
});

module.exports = upload;