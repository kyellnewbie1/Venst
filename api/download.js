import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zthvomcgafenzwqokeec.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aHZvbWNnYWZlbnp3cW9rZWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4Mjk0MjUsImV4cCI6MjEwMTQwNTQyNX0.mBlZvpytNEOkSY8VEjR7ahc9yiKu_x8TjrT7qOR41mI';
const BUCKET_NAME = 'venst-media';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  // 1. Set CORS Headers lengkap
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Tangani preflight request dari browser
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const fileParam = req.query.file || req.query.url;

  if (!fileParam) {
    return res.status(400).json({
      status: false,
      message: 'Parameter "file" atau "url" wajib diisi! Contoh: /api/download?file=17000_nama.jpg'
    });
  }

  // Bersihkan parameter dari path URL/query string jika yang di-pass berupa URL penuh
  const cleanParam = fileParam.split('?')[0];
  const fileName = cleanParam.includes('/') ? cleanParam.split('/').pop() : cleanParam;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(fileName);

    if (error || !data) {
      return res.status(404).json({ status: false, message: 'File tidak ditemukan di server.' });
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Gunakan Content-Type asli dari Supabase
    const contentType = data.type || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Gunakan 'inline' agar file (seperti gambar) bisa langsung tampil di browser/tag <img>.
    // Jika query ?download=true ada, baru paksa download (attachment).
    const isDownload = req.query.download === 'true';
    res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);

  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
}
