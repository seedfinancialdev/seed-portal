const { spawn } = require('child_process');
const path = require('path');

// Simple Wiki.js setup script for Replit
console.log('Setting up Wiki.js for Replit...');

// Create a simple wiki server on port 3001
const wikiProcess = spawn('npx', ['wiki', 'start'], {
  cwd: process.cwd(),
  stdio: 'inherit',
  env: {
    ...process.env,
    WIKI_PORT: '3001',
    WIKI_DB_TYPE: 'sqlite',
    WIKI_DB_SQLITE_FILE: './wiki.db'
  }
});

wikiProcess.on('error', (err) => {
  console.error('Wiki.js startup error:', err);
});

wikiProcess.on('exit', (code) => {
  console.log(`Wiki.js process exited with code ${code}`);
});

console.log('Wiki.js starting on port 3001...');
console.log('Access it at http://localhost:3001 or through the Knowledge Base portal');