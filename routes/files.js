const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const router = express.Router();

let progress = 0; // Variabel untuk menyimpan progres
let totalFiles = 0; // Total file yang akan diproses

async function initializeRouter() {
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(5);

  function getFileDetails(filePath, categorizedFiles) {
    return limit(() => {
      return new Promise((resolve, reject) => {
        exec(`adb shell stat -c "%y" "${filePath}"`, (error, stdout, stderr) => {
          if (error || stderr) {
            console.error(`Error getting file details for ${filePath}: ${error || stderr}`);
            progress++; // Update progres meskipun ada error
            return resolve(); // Skip file, jangan reject
          }

          let timestamp = stdout.trim();
          let [datePart, timePart] = timestamp.split(' ');
          let [year, month, day] = datePart.split('-');
          year = year.substring(2);
          timestamp = `${day}-${month}-${year} ${timePart.replace(/:/g, '-')}`;

          const fileInfo = { path: filePath, timestamp };

          if (filePath.match(/\.(jpg|jpeg|png|gif)$/i)) {
            categorizedFiles.images.push(fileInfo);
          } else if (filePath.match(/\.(pdf|docx|txt)$/i)) {
            categorizedFiles.documents.push(fileInfo);
          } else if (filePath.match(/\.(mp4|mkv|avi)$/i)) {
            categorizedFiles.videos.push(fileInfo);
          } else if (filePath.match(/\.(log)$/i)) {
            categorizedFiles.logs.push(fileInfo);
          } else if (filePath.match(/\.(msg|sms)$/i)) {
            categorizedFiles.messages.push(fileInfo);
          }

          progress++; // Update progres setelah selesai memproses file
          resolve();
        });
      });
    });
  }

  // Endpoint untuk mendapatkan progres
  router.get('/progress', (req, res) => {
    if (totalFiles === 0) {
      return res.json({ progress: 0 });
    }
    const percentage = Math.round((progress / totalFiles) * 100);
    res.json({ progress: percentage });
  });

  // Endpoint utama untuk mendapatkan daftar file dari perangkat Android
  router.get('/', (req, res) => {
    console.log('Fetching filtered file list...');
    const cmd = `adb shell "find /sdcard/ -type f | grep -E '\\.(jpg|jpeg|png|mp4|mkv|avi)$'"`;

    exec(cmd, (error, stdout, stderr) => {
      if (error || stderr) {
        console.error(`Error: ${error || stderr}`);
        res.status(500).send('Internal Server Error');
        return;
      }

      const output = stdout.split('\n');
      const categorizedFiles = {
        images: [],
        documents: [],
        videos: [],
      };

      progress = 0; // Reset progres
      totalFiles = output.filter(line => line.trim() !== '').length; // Hitung total file

      const fileDetailsPromises = output
        .filter(line => line.trim() !== '')
        .map(filePath => getFileDetails(filePath.trim(), categorizedFiles));

      Promise.all(fileDetailsPromises)
        .then(() => {
          console.log('All files processed. Sending response...');
          res.json(categorizedFiles); // Kirim semua file ke front-end
        })
        .catch(err => {
          console.error(`Error processing files: ${err}`);
          res.status(500).send('Internal Server Error');
        });
    });
  });
  

  // Endpoint untuk menyajikan file dari perangkat Android
  router.get('/file', (req, res) => {
    const filePath = req.query.path;
    const localTempDir = path.join(__dirname, '..', 'temp');
    const localPath = path.join(localTempDir, path.basename(filePath));
  
    // Cek jika folder temp ada, jika tidak buat folder
    if (!fs.existsSync(localTempDir)) {
      fs.mkdirSync(localTempDir);
    }
  
    console.log(`Pulling file: ${filePath} to ${localPath}`);
    exec(`adb pull "${filePath}" "${localPath}"`, (error, stdout, stderr) => {
      // Periksa apakah output stderr adalah sebuah kesalahan atau hanya informasi
      if (error) {
        console.error(`Error pulling file: ${error}`);
        res.status(500).send('Internal Server Error');
        return;
      }
  
      // Jika stderr berisi informasi biasa, abaikan
      if (stderr && !stderr.includes('error')) {
        console.log(`ADB Output: ${stderr}`); // Hanya log output dari adb
      } else if (stderr) {
        // Jika ada error yang sebenarnya
        console.error(`Error pulling file: ${stderr}`);
        res.status(500).send('Internal Server Error');
        return;
      }
  
      console.log(`File pulled successfully: ${stdout}`);
  
      // Kirim file yang diambil ke klien
      res.sendFile(path.resolve(localPath));
    });
  });
  

  return router;
}

module.exports = initializeRouter;
