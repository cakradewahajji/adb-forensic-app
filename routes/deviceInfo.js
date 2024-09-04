const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

router.get('/', (req, res) => {
  const commands = [
    'adb shell getprop ro.product.model',
    'adb shell getprop ro.build.version.release',
    'adb shell df /sdcard',
  ];

  exec(commands.join(' && '), (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      res.status(500).send('Internal Server Error');
      return;
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      res.status(500).send('Internal Server Error');
      return;
    }

    const output = stdout.split('\n');
    const deviceInfo = {
      name: output[0].trim(),
      os: output[1].trim(),
      storage: parseDfOutput(output.slice(2).join('\n')),
    };

    res.json(deviceInfo);
  });
});

function parseDfOutput(dfOutput) {
  const lines = dfOutput.trim().split('\n');
  if (lines.length > 1) {
    const storageData = lines[1].split(/\s+/);
    return {
      total: storageData[1],
      used: storageData[2],
      available: storageData[3],
    };
  }
  return null;
}

module.exports = router;
