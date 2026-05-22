import fs from 'fs';

const content = fs.readFileSync('utils/planPermissions.ts', 'utf8');
const lines = content.split('\n');
const newLines = [];
let currentPlan = "";

for(let i=0; i<lines.length; i++) {
    const line = lines[i];
    
    if (line.match(/^\s+'(.*)': \{/)) {
        currentPlan = line.match(/^\s+'(.*)': \{/)[1];
    }
    
    if (line.includes('hasNotifications:')) {
        let isLastInObject = lines[i+1] && lines[i+1].includes('}');
        let hasTrailingComma = line.trim().endsWith(',');
        
        let modifiedLine = line;
        // if it doesn't have trailing comma but we are about to add a new property, add it
        if (!hasTrailingComma) {
            modifiedLine += ',';
        }
        
        newLines.push(modifiedLine);
        
        // determine branches
        let branches = 1;
        if (currentPlan.includes('Business') || currentPlan === 'Lifetime' || currentPlan === 'Yearly' || currentPlan === 'Semiannual') {
            branches = 999999;
        } else if (currentPlan.includes('Pro') || currentPlan === 'Monthly') {
            branches = 5;
        } else if (currentPlan === 'Trial') {
            branches = 999;
        }
        
        // Before pushing, check if line already has maxBranches. We know Free and Trial do, we just added them via multi_edit_file! Wait, we actually only successfully added to Free and Trial because they were unique? 
        // No, multi_edit_file FAILED for chunk 2 and 3!
        // Let's just fix it completely.
        
        // However, we did add it to Free (chunk 2 and 3 failed). Let's check `planPermissions.ts` lines 50-80: we see `Free: ... maxBranches: 1`, `Trial: ... hasNotifications: true`.
        // So `Free` has it. Let's skip adding if the next line already has `maxBranches` or if it's already there.
        if (lines[i+1] && lines[i+1].includes('maxBranches')) {
            // Do nothing, it's already there
        } else {
            newLines.push(`        maxBranches: ${branches}`);
        }
    } else {
        newLines.push(line);
    }
}

fs.writeFileSync('utils/planPermissions.ts', newLines.join('\n'), 'utf8');
