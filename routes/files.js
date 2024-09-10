const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const exifParser = require('exif-parser');  // Untuk parsing EXIF data (khusus gambar)
const router = express.Router();

let progress = 0; // Variabel untuk menyimpan progres
let totalFiles = 0; // Total file yang akan diproses

async function initializeRouter() {
  const { default: pLimit } = await import('p-limit');
  const limit = pLimit(5);

  // Fungsi untuk mendapatkan detail file
  function getFileDetails(filePath, categorizedFiles) {
    return limit(() => {
      return new Promise((resolve, reject) => {
        // Mendapatkan detail file (timestamp) dari perangkat Android
        exec(`adb shell stat -c "%y,%x" "${filePath}"`, (error, stdout, stderr) => {
          if (error || stderr) {
            console.error(`Error getting file details for ${filePath}: ${error || stderr}`);
            progress++; // Update progres meskipun ada error
            return resolve(); // Skip file, jangan reject
          }

          let [modifiedTime, createdTime] = stdout.trim().split(',');

          // Format timestamp agar lebih mudah dibaca
          const formatTimestamp = (timestamp) => {
            let [datePart, timePart] = timestamp.split(' ');
            let [year, month, day] = datePart.split('-');
            year = year.substring(2);
            return `${day}-${month}-${year} ${timePart}`;
          };

          let fileInfo = {
            path: filePath,
            dateAdded: formatTimestamp(createdTime),
            dateModified: formatTimestamp(modifiedTime),
          };

          // Jika file adalah gambar, tarik file dan parse EXIF di server
          if (filePath.match(/\.(jpg|jpeg|png)$/i)) {
            const localTempDir = path.join(__dirname, '..', 'temp');
            const localPath = path.join(localTempDir, path.basename(filePath));

            // Cek jika folder temp ada, jika tidak buat folder
            if (!fs.existsSync(localTempDir)) {
              fs.mkdirSync(localTempDir);
            }

            // Tarik file dari perangkat Android ke server
            exec(`adb pull "${filePath}" "${localPath}"`, (pullError, stdout, stderr) => {
              if (pullError || stderr) {
                // console.error(`Error pulling file: ${pullError || stderr}`);
              } else {
                // console.log(`File pulled successfully: ${stdout}`);
                // Baca file lokal dan parse EXIF data
                const fileBuffer = fs.readFileSync(localPath);
                const parser = exifParser.create(fileBuffer);
                const exifData = parser.parse();

                if (exifData.tags) {
                  fileInfo.geolocation = {
                    latitude: exifData.tags.GPSLatitude || 'N/A',
                    longitude: exifData.tags.GPSLongitude || 'N/A',
                  };
                }
              }

              categorizeFile(fileInfo, categorizedFiles);
              progress++; // Update progres setelah selesai memproses file
              resolve();
            });
          } else if (filePath.match(/\.(mp4|mkv|avi)$/i)) {
            // Tangani file video
            const localTempDir = path.join(__dirname, '..', 'temp');
            const localPath = path.join(localTempDir, path.basename(filePath));

            // Cek jika folder temp ada, jika tidak buat folder
            if (!fs.existsSync(localTempDir)) {
              fs.mkdirSync(localTempDir);
            }

            // Tarik file video ke server
            // console.log(`Pulling video file: ${filePath} to ${localPath}`);
            exec(`adb pull "${filePath}" "${localPath}"`, (pullError, stdout, stderr) => {
              if (pullError || stderr) {
                // console.error(`Error pulling video file: ${pullError || stderr}`);
              } else {
                // console.log(`Video file pulled successfully: ${stdout}`);
              }

              // Jangan tambahkan geolocation untuk video
              delete fileInfo.geolocation;

              categorizeFile(fileInfo, categorizedFiles);
              progress++; // Update progres setelah selesai memproses video
              resolve();
            });
          } else {
            categorizeFile(fileInfo, categorizedFiles);
            progress++; // Update progres setelah selesai memproses file
            resolve();
          }
        });
      });
    });
  }

  // Fungsi untuk mengkategorikan file
  function categorizeFile(fileInfo, categorizedFiles) {
    if (fileInfo.path.match(/\.(jpg|jpeg|png|gif)$/i)) {
      categorizedFiles.images.push(fileInfo);
    } else if (fileInfo.path.match(/\.(pdf|docx|txt)$/i)) {
      categorizedFiles.documents.push(fileInfo);
    } else if (fileInfo.path.match(/\.(mp4|mkv|avi)$/i)) {
      categorizedFiles.videos.push(fileInfo);
    } else if (fileInfo.path.match(/\.(log)$/i)) {
      categorizedFiles.logs.push(fileInfo);
    } else if (fileInfo.path.match(/\.(msg|sms)$/i)) {
      categorizedFiles.messages.push(fileInfo);
    }
  }

  router.get('/contacts', (req, res) => {
    exec('adb shell content query --uri content://contacts/phones/ --projection display_name:number', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error fetching contacts: ${error}`);
        return res.status(500).json({ error: 'Failed to fetch contacts' });
      }
  
      if (stderr) {
        console.error(`Error output: ${stderr}`);
        return res.status(500).json({ error: 'Failed to fetch contacts' });
      }
  
      // Parsing hasil output dari adb shell
      const contacts = [];
      const lines = stdout.split('\n');
      lines.forEach(line => {
        const match = line.match(/display_name=(.+), number=(.+)/);
        if (match) {
          contacts.push({
            name: match[1],
            phone: match[2]
          });
        }
      });
  
      // Kirim data kontak ke frontend
      res.json({ contacts });
    });
  });
  
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
    // console.log('Fetching filtered file list...');
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
          // console.log('All files processed. Sending response...');
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
    // console.log(`Requested file path: ${filePath}`); // Logging path
  
    const localTempDir = path.join(__dirname, '..', 'temp');
    const localPath = path.join(localTempDir, path.basename(filePath));
  
    if (!fs.existsSync(localPath)) {
      console.error(`File not found: ${localPath}`);
      return res.status(404).json({ error: 'File not found' });
    }

    // Hapus kemungkinan pengiriman respons ganda
    res.sendFile(path.resolve(localPath), (err) => {
      if (err) {
        console.error(`Error sending file: ${err}`);
        if (!res.headersSent) {
          return res.status(500).json({ error: 'Failed to send file' });
        }
      }
    });
  });

  // Rute untuk mengirim detail file (path, dateAdded, dateModified) ke frontend
  router.get('/file-info', (req, res) => {
    const filePath = req.query.path;
    const localTempDir = path.join(__dirname, '..', 'temp');
    const localPath = path.join(localTempDir, path.basename(filePath));
  
    // Periksa apakah file sudah diunduh sebelumnya
    if (!fs.existsSync(localPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
  
    // Mendapatkan informasi tentang file, termasuk dateAdded dan dateModified
    const stats = fs.statSync(localPath);
    let dateAdded = new Date(stats.birthtime).toLocaleString(); // waktu pembuatan file
    let dateModified = new Date(stats.mtime).toLocaleString(); // waktu modifikasi terakhir
  
    // Jika file adalah gambar, coba ambil tanggal dari EXIF
    if (filePath.match(/\.(jpg|jpeg|png|gif)$/i)) {
      try {
        const fileBuffer = fs.readFileSync(localPath);
        const parser = exifParser.create(fileBuffer);
        const exifData = parser.parse();
  
        // Jika metadata EXIF memiliki tanggal, gunakan itu
        if (exifData.tags && exifData.tags.DateTimeOriginal) {
          dateAdded = new Date(exifData.tags.DateTimeOriginal * 1000).toLocaleString();
          dateModified = dateAdded; // Tanggal EXIF biasanya digunakan untuk keduanya
        }
  
        // Buat respons dengan detail file termasuk geolocation jika file adalah gambar
        const fileDetails = {
          path: filePath,
          dateAdded,    // Tampilkan dateAdded yang sebenarnya
          dateModified, // Tampilkan dateModified yang sebenarnya
          geolocation: {
            latitude: exifData.tags.GPSLatitude || 'N/A',
            longitude: exifData.tags.GPSLongitude || 'N/A'
          }
        };
  
        res.json(fileDetails);
      } catch (err) {
        console.error('Error reading file or extracting metadata:', err);
        res.status(500).json({ error: 'Failed to retrieve file details' });
      }
    } else if (filePath.match(/\.(mp4|mkv|avi)$/i)) {
      // Tangani file video - gunakan metadata sistem file
      const fileDetails = {
        path: filePath,
        dateAdded,    // Menggunakan dateAdded dari sistem file
        dateModified, // Menggunakan dateModified dari sistem file
        geolocation: null  // Tidak ada geolocation untuk file video
      };
  
      res.json(fileDetails);
    } else {
      // Jika file bukan gambar atau video, tidak mencoba parsing EXIF
      const fileDetails = {
        path: filePath,
        dateAdded,    // Tampilkan dateAdded yang sebenarnya
        dateModified, // Tampilkan dateModified yang sebenarnya
        geolocation: null  // Tidak ada geolocation untuk file non-gambar/non-video
      };
  
      res.json(fileDetails);
    }
  });

  // Endpoint untuk melihat file yang dihapus (dalam folder Trash)
// Endpoint untuk mengambil daftar file termasuk yang dihapus
router.get('/files', (req, res) => {
  exec('adb shell find /sdcard/ -type f', (error, stdout, stderr) => {
    if (error || stderr) {
      console.error('Error fetching files:', error || stderr);
      return res.status(500).json({ success: false, message: 'Failed to fetch files' });
    }

    const allFiles = stdout.split('\n').filter(file => file.trim());
    const categorizedFiles = {
      images: [],
      documents: [],
      videos: [],
      deletedFiles: [], // Pastikan kategori deletedFiles diinisialisasi
      others: []
    };

    allFiles.forEach(file => {
      if (file.match(/\.(jpg|jpeg|png|gif)$/i)) {
        if (file.includes('.trashed-')) {
          categorizedFiles.deletedFiles.push({ path: file, timestamp: new Date().toLocaleString() });
        } else {
          categorizedFiles.images.push({ path: file, timestamp: new Date().toLocaleString() });
        }
      } else if (file.match(/\.(mp4|mkv|avi)$/i)) {
        categorizedFiles.videos.push({ path: file, timestamp: new Date().toLocaleString() });
      } else if (file.includes('.trashed-')) {
        categorizedFiles.deletedFiles.push({ path: file, timestamp: new Date().toLocaleString() });
      } else {
        categorizedFiles.others.push({ path: file, timestamp: new Date().toLocaleString() });
      }
    });

    res.json(categorizedFiles);
  });
});

  return router;
}

module.exports = initializeRouter;
