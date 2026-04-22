import fs from 'fs';
import path from 'path';
import { Client } from 'pg';

async function run() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    
    let dbUrl = '';
    for (const line of envContent.split('\n')) {
      if (line.startsWith('DATABASE_URL=')) {
        dbUrl = line.split('=')[1].replace(/"/g, '').replace(/'/g, '').trim();
        break;
      }
    }
    
    if (!dbUrl) {
      console.error('Could not find DATABASE_URL in .env');
      process.exit(1);
    }
    
    if (dbUrl.includes('?')) {
       if (!dbUrl.includes('sslmode=')) dbUrl += '&sslmode=require';
    } else {
       dbUrl += '?sslmode=require';
    }
    
    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    
    const res = await client.query("SELECT foto_url FROM clientes WHERE foto_url IS NOT NULL AND foto_url != ''");
    await client.end();
    
    const uploadDir = path.join(process.cwd(), 'public');
    const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
    
    let fixed = 0;
    
    for (const row of res.rows) {
      const url = row.foto_url;
      if (url.startsWith('/uploads/')) {
        const filePath = path.join(uploadDir, url);
        if (!fs.existsSync(filePath)) {
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(filePath, transparentPng);
          console.log('Created missing dummy file:', filePath);
          fixed++;
        }
      }
    }
    
    console.log(`\nSuccessfully created ${fixed} missing dummy avatars. Your browser 404 errors will now stop globally.`);
  } catch(e) {
    console.error(e);
  }
}

run();
