const fs = require('fs');
const path = require('path');

const targetDirs = ['pages/accounts', 'pages/hr', 'pages/operations', 'pages/TreasuryPage.tsx'];

const filesToProcess = [];

function walk(dir) {
    if (fs.statSync(dir).isFile()) {
        filesToProcess.push(dir);
        return;
    }
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            walk(file);
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                filesToProcess.push(file);
            }
        }
    });
}

targetDirs.forEach(walk);

filesToProcess.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let changed = false;

    if (content.includes("'firebase/firestore'")) {
        const nestLevel = file.split('/').length - 2;
        const relativePath = nestLevel === 0 ? './services/localFirestore' : '../'.repeat(nestLevel) + 'services/localFirestore';
        
        content = content.replace(/'firebase\/firestore'/g, `'${relativePath}'`);
        changed = true;
    }

    if (content.includes("../../services/firebase")) {
        if (content.match(/import\s+\{\s*db\s*\}\s+from\s+['"]\.\.\/\.\.\/services\/firebase['"]/)) {
            // Already handled by the localFirestore mock exporting db? 
            // Wait, we need to change where 'db' is imported from.
            content = content.replace(/import\s+\{\s*db([^\}]*)\}\s+from\s+['"]([\.\/]+)services\/firebase['"]/g, "import { db $1} from '$2services/localFirestore'");
            changed = true;
        }
    }
    
    if (content.includes("../services/firebase")) {
         content = content.replace(/import\s+\{\s*db([^\}]*)\}\s+from\s+['"]([\.\/]+)services\/firebase['"]/g, "import { db $1} from '$2services/localFirestore'");
         changed = true;
    }

    if (changed) {
        fs.writeFileSync(file, content, 'utf8');
        console.log('Refactored: ' + file);
    }
});
