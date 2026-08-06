import { createClient } from '@supabase/supabase-js';
import Busboy from 'busboy';

const SUPABASE_URL = 'https://zthvomcgafenzwqokeec.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp0aHZvbWNnYWZlbnp3cW9rZWVjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4Mjk0MjUsImV4cCI6MjEwMTQwNTQyNX0.mBlZvpytNEOkSY8VEjR7ahc9yiKu_x8TjrT7qOR41mI';
const BUCKET_NAME = 'venst-media';
const CUSTOM_DOMAIN = 'https://venst.zone.id';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const config = {
  api: {
    bodyParser: false, // Wajib false agar Busboy bisa membaca stream file
  },
};

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ status: false, message: 'Method Not Allowed' });
  }

  // Bungkus dalam Promise agar Serverless Function tidak berhenti secara prematur
  return new Promise((resolve) => {
    try {
      const busboy = Busboy({ headers: req.headers });
      let fileBuffer = [];
      let fileName = '';
      let mimeType = '';

      busboy.on('file', (fieldname, file, info) => {
        fileName = info.filename;
        mimeType = info.mimeType;

        file.on('data', (data) => {
          fileBuffer.push(data);
        });
      });

      busboy.on('finish', async () => {
        try {
          if (fileBuffer.length === 0) {
            res.status(400).json({ status: false, message: 'File tidak ditemukan! Gunakan key "file".' });
            return resolve();
          }

          const buffer = Buffer.concat(fileBuffer);
          const cleanName = fileName.replace(/[^a-zA-Z0-9.]/g, '_');
          const storageFileName = `${Date.now()}_${cleanName}`;

          // Upload ke Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storageFileName, buffer, {
              contentType: mimeType,
              upsert: true
            });

          if (uploadError) throw uploadError;

          const publicUrl = `${CUSTOM_DOMAIN}/file/${storageFileName}`;

          // Simpan record ke Database Supabase
          await supabase.from('uploads').insert([
            {
              file_name: fileName,
              file_path: storageFileName,
              file_size: buffer.length,
              mime_type: mimeType,
              public_url: publicUrl
            }
          ]);

          res.status(200).json({
            status: true,
            message: 'Upload berhasil',
            result: {
              file_name: fileName,
              file_size: buffer.length,
              mime_type: mimeType,
              url: publicUrl
            }
          });
          return resolve();
        } catch (err) {
          res.status(500).json({ status: false, message: err.message });
          return resolve();
        }
      });

      busboy.on('error', (err) => {
        res.status(500).json({ status: false, message: err.message });
        return resolve();
      });

      req.pipe(busboy);

    } catch (err) {
      res.status(500).json({ status: false, message: err.message });
      return resolve();
    }
  });
}
