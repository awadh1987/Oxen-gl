const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');

function createProjectZip() {
  const zip = new AdmZip();
  const rootDir = process.cwd();

  const ignoredDirs = new Set(['node_modules', '.git', 'dist', '.aistudio']);
  const ignoredFiles = new Set(['myon-contracting-logistics.zip']);

  function addEntries(currentDir, relativePath = '') {
    const items = fs.readdirSync(currentDir);
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const relPath = relativePath ? `${relativePath}/${item}` : item;
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (ignoredDirs.has(item)) continue;
        addEntries(fullPath, relPath);
      } else {
        if (ignoredFiles.has(item) || item.endsWith('.zip')) continue;
        const fileData = fs.readFileSync(fullPath);
        zip.addFile(relPath, fileData);
      }
    }
  }

  console.log('Archiving project files...');
  addEntries(rootDir);

  const rootZipPath = path.join(rootDir, 'myon-contracting-logistics.zip');
  const publicZipPath = path.join(rootDir, 'public', 'myon-contracting-logistics.zip');

  zip.writeZip(rootZipPath);
  console.log(`Successfully created root archive: ${rootZipPath}`);

  zip.writeZip(publicZipPath);
  console.log(`Successfully created public archive: ${publicZipPath}`);
}

createProjectZip();
