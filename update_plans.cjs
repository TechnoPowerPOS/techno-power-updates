const fs = require('fs');
let data = fs.readFileSync('utils/planPermissions.ts', 'utf8');
data = data.replace(/hasBackup: false,/g, 'hasBackup: false,\n        hasAutoBackup: false,\n        hasZipBackup: false,');
data = data.replace(/hasBackup: true,/g, 'hasBackup: true,\n        hasAutoBackup: true,\n        hasZipBackup: true,');
fs.writeFileSync('utils/planPermissions.ts', data);
