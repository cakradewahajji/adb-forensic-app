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
    const fields = row.split(',');

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
  
  // Fungsi untuk parsing pesan SMS
  function parseMessages(stdout) {
    const messages = [];
    const rows = stdout.split('\n').filter(row => row.trim()); // Pisahkan baris berdasarkan newline
  
    rows.forEach(row => {
      const message = {};
      const fields = row.split(',');
  
      fields.forEach(field => {
        const [key, value] = field.split('=');
        if (key && value) {
          message[key.trim()] = value.trim();
        }
      });
  
      if (Object.keys(message).length > 0) {
        messages.push(message);
      }
    });
  
    return messages;
  }
  

module.exports = router;
