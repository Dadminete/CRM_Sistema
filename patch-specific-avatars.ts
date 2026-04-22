import fs from 'fs';
import path from 'path';

const filesToPatch = [
  'client_1764421800128_ft9dm6kqlw.png',
  'client_1764421655725_d864644n0o.jpg',
  'client_1764422164730_524k2ahrwn7.png'
];

async function run() {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
  
  for (const filename of filesToPatch) {
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, transparentPng);
      console.log('Created dummy file:', filename);
    } else {
      console.log('File already exists:', filename);
    }
  }
}

run();
