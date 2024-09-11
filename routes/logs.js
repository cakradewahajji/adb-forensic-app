const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

// Fungsi untuk mengambil log panggilan
router.post('/fetch', (req, res) => {
  exec('adb shell content query --uri content://call_log/calls', (error, stdout, stderr) => {
    if (error || stderr) {
      console.error('Error fetching call logs:', error || stderr);
      return res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }

    // Parsing hasil log panggilan dari stdout
    const logs = parseCallLogs(stdout);
    res.json({ success: true, logs });
  });
});

// Fungsi untuk parsing log panggilan
function parseCallLogs(stdout) {
  const logs = [];
  const rows = stdout.split('\n').filter(row => row.trim()); // Pisahkan baris berdasarkan newline

  rows.forEach(row => {
    const log = {};
    const fields = row.split(',');  // Masih bisa pakai koma untuk call logs jika aman
    fields.forEach(field => {
      const [key, value] = field.split('=');
      if (key && value) {
        log[key.trim()] = value.trim();
      }
    });

    if (Object.keys(log).length > 0) {
      logs.push(log);
    }
  });

  return logs;
}

// Fungsi untuk mengambil data pesan SMS
router.post('/messages', (req, res) => {
  exec('adb shell content query --uri content://sms', (error, stdout, stderr) => {
    if (error || stderr) {
      console.error('Error fetching messages:', error || stderr);
      return res.status(500).json({ success: false, message: 'Failed to fetch messages' });
    }

    // Parsing hasil pesan dari stdout
    const messages = parseMessages(stdout);
    res.json({ success: true, messages });
  });
});

// Fungsi untuk parsing pesan SMS dan membedakan *from* dan *to*
// Fungsi untuk parsing pesan SMS dan membedakan *from* dan *to*
// Fungsi untuk parsing pesan SMS dan membedakan *from* dan *to*
function parseMessages(stdout) {
  const messages = [];
  const rows = stdout.split('\n').filter(row => row.trim()); // Pisahkan baris berdasarkan newline

  rows.forEach(row => {
    const message = {};

    // Gunakan regex untuk memisahkan kunci tertentu seperti 'address', 'date', 'body', dll.
    const addressMatch = row.match(/address=([^\s,]+)/);
    const dateMatch = row.match(/date=([^\s,]+)/);
    const bodyMatch = row.match(/body=(.*?)(?=, service_center=|locked=|error_code=|creator=|seen=|$)/); // Tangkap seluruh body sampai ke field berikutnya

    if (addressMatch) {
      message.address = addressMatch[1];
    }
    if (dateMatch) {
      message.date = dateMatch[1];
    }
    if (bodyMatch) {
      message.body = bodyMatch[1].trim();  // Ambil hanya body pesan tanpa field tambahan
    }

    // Tentukan apakah pesan adalah *from* (pesan masuk) atau *to* (pesan keluar)
    if (row.includes('type=1')) {
      // Pesan masuk
      message.from = message.address; // Pengirim adalah address
      message.to = 'Me'; // Penerima adalah pengguna
    } else if (row.includes('type=2')) {
      // Pesan keluar
      message.from = 'Me'; // Pengirim adalah pengguna
      message.to = message.address; // Penerima adalah address
    }

    if (Object.keys(message).length > 0 && message.body) {
      messages.push(message); // Hanya masukkan pesan jika ada body
    }
  });

  return messages;
}

module.exports = router;
