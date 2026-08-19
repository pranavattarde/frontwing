const fs = require('fs');
const path = require('path');
const esbuild = require(path.join(__dirname, '../frontend/node_modules/esbuild'));

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      try {
        // esbuild loader tsx strips all TypeScript types while keeping JSX intact
        const result = esbuild.transformSync(content, {
          loader: 'tsx',
          jsx: 'preserve',
          target: 'es2022',
        });
        fs.writeFileSync(fullPath, result.code, 'utf8');
        console.log(`Cleaned ${fullPath}`);
      } catch (err) {
        console.error(`Error processing ${fullPath}:`, err.message);
      }
    }
  }
}

const targetDir = path.join(__dirname, '../frontend/src');
console.log('Stripping remaining TS annotations via esbuild tsx loader...');
processDirectory(targetDir);
console.log('Done cleaning JS/JSX files.');
