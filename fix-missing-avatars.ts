import fs from 'fs';
import path from 'path';

async function run() {
  try {
     const res = await fetch('http://172.16.0.25:3000/api/clientes?limit=1000');
     const json = await res.json();
     let fixed = 0;
     const clients = json.data?.data || [];
     
     for (const c of clients) {
       if (c.fotoUrl && c.fotoUrl.startsWith('/uploads/')) {
          const filePath = path.join(process.cwd(), 'public', c.fotoUrl);
          if (!fs.existsSync(filePath)) {
             console.log('Generating dummy for missing file:', filePath);
             // Create empty 1x1 transparent PNG
             const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
             const dir = path.dirname(filePath);
             if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
             fs.writeFileSync(filePath, transparentPng);
             fixed++;
          }
       }
     }
     console.log(`Successfully created ${fixed} missing dummy avatars. Your browser 404 errors will now stop.`);
  } catch(e) {
     console.error("Make sure your Next.js dev server is running so I can fetch the clients.", e);
  }
}
run();
