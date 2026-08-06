import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zthvomcgafenzwqokeec.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aHZvbWNnYWZlbnp3cW9rZWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4Mjk0MjUsImV4cCI6MjEwMTQwNTQyNX0.mBlZvpytNEOkSY8VEjR7ahc9yiKu_x8TjrT7qOR41mI';
const BUCKET_NAME = 'venst-media';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const fileParam = req.query.file || req.query.url;

  if (!fileParam) {
    return res.status(400).json({
      status: false,
      message: 'Parameter "file" atau "url" wajib diisi! Contoh: /api/download?file=17000_nama.jpg'
    });
  }

  const fileName = fileParam.includes('/') ? fileParam.split('/').pop() : fileParam;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(fileName);

    if (error || !data) {
      return res.status(404).json({ status: false, message: 'File tidak ditemukan di server.' });
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader('Content-Type', data.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);

  } catch (err) {
    return res.status(500).json({ status: false, message: err.message });
  }
}
