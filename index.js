const express = require('express');
const app = express();
const port = 3000;

// Import routes
const deviceInfoRoute = require('./routes/deviceInfo');
const initializeFilesRoute = require('./routes/files');
const logsRoute = require('./routes/logs');  // Tambahkan ini
const contactsRouter = require('./routes/contacts');
const clearTempFolder = require('./routes/clearTemp');

// Bersihkan folder temp saat server dimulai
clearTempFolder();

// Setup static files serving
app.use(express.static('public'));

// Gunakan rute yang diimport
app.use('/device-info', deviceInfoRoute);
app.use('/logs', logsRoute);  // Tambahkan ini
app.use(contactsRouter);

async function startServer() {
  try {
    const filesRoute = await initializeFilesRoute();
    app.use('/files', filesRoute);

    // Start the server
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to initialize routes:', error);
  }
}

startServer();
