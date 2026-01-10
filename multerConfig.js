const multer = require('multer');
const storage = multer.memoryStorage(); // files stay in memory
const upload = multer({ storage });

module.exports = upload;
