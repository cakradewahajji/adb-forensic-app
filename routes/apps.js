const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

// Fungsi untuk mengambil daftar aplikasi yang terinstal
router.post('/installed-apps', (req, res) => {
  exec('adb shell pm list packages', (error, stdout, stderr) => {
    if (error || stderr) {
      console.error('Error fetching installed apps:', error || stderr);
      return res.status(500).json({ success: false, message: 'Failed to fetch installed apps' });
    }

    // Parsing hasil daftar aplikasi dari stdout
    const apps = parseInstalledApps(stdout);
    res.json({ success: true, apps });
  });
});

// Fungsi untuk parsing daftar aplikasi
function parseInstalledApps(stdout) {
  const apps = [];
  const rows = stdout.split('\n').filter(row => row.trim());

  rows.forEach(row => {
    const appPackage = row.replace('package:', '').trim();
    if (appPackage) {
      apps.push({ packageName: appPackage });
    }
  });

  return apps;
}

module.exports = router;
