const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

// Route untuk mendapatkan data kontak
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

    res.json({ contacts });
  });
});

module.exports = router;
