// npm i express multer node-fetch form-data
import express from 'express';
import multer from 'multer';
import fetch from 'node-fetch';
import FormData from 'form-data';

const app = express();
app.use(express.json({ limit:'2mb' }));

// CORS simple (si lo usas en dev)
app.use((req,res,next)=>{ res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); next(); });

// ---------- /api/translate  (DeepL / Azure / el que prefieras) ----------
const DEEPL_KEY = process.env.DEEPL_KEY; // pon tu API key
app.post('/api/translate', async (req,res)=>{
  try{
    const { target, items } = req.body;
    if(!DEEPL_KEY) return res.status(500).json({error:'DEEPL_KEY faltante'});
    const textArray = items.map(i=>i.text);

    // DeepL (free: api-free.deepl.com / pro: api.deepl.com)
    const resp = await fetch('https://api-free.deepl.com/v2/translate', {
      method:'POST',
      headers:{ 'Authorization': `DeepL-Auth-Key ${DEEPL_KEY}`, 'Content-Type':'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        target_lang: (target.startsWith('en')?'EN': target.startsWith('pt')?'PT-BR': target.startsWith('fr')?'FR':'EN'),
        // DeepL espera múltiples 'text' -> los agregamos:
        ...textArray.reduce((acc, t, idx)=>{ acc[`text${idx}`]=t; return acc; }, {})
      })
    });
    const json = await resp.json();
    // Recolectar manteniendo orden
    const translated = json.translations.map((t,i)=> ({ key: items[i].key, text: t.text }));
    res.json({ translations: translated });
  }catch(e){
    res.status(500).json({error: e.message});
  }
});

// ---------- /api/asr  (Whisper/OpenAI u otro proveedor) ----------
const upload = multer({ limits:{ fileSize: 50 * 1024 * 1024 } });
const OPENAI_KEY = process.env.OPENAI_API_KEY; // tu clave

app.post('/api/asr', upload.single('media'), async (req,res)=>{
  try{
    if(!OPENAI_KEY) return res.status(500).json({error:'OPENAI_API_KEY faltante'});
    if(!req.file) return res.status(400).json({error:'archivo faltante'});

    // Enviar a Whisper (transcripción con segmentos)
    const fd = new FormData();
    fd.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });
    fd.append('model', 'whisper-1');
    fd.append('response_format', 'verbose_json'); // para obtener segments con tiempos
    fd.append('language', 'es');

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method:'POST',
      headers: { 'Authorization': `Bearer ${OPENAI_KEY}` },
      body: fd
    });
    const json = await resp.json();
    if(json.error) return res.status(500).json(json);

    // Armar VTT desde segments
    const vtt = toVTT(json.segments || []);
    const plain = json.text || (json.segments||[]).map(s=>s.text).join(' ').trim();
    res.json({ vtt, text: plain });
  }catch(e){
    res.status(500).json({error: e.message});
  }
});

function toVTT(segments){
  const lines = ['WEBVTT',''];
  segments.forEach((s,i)=>{
    lines.push(`${i+1}`);
    lines.push(`${secToTime(s.start)} --> ${secToTime(s.end)}`);
    lines.push((s.text||'').trim());
    lines.push('');
  });
  return lines.join('\n');
}
function secToTime(sec){
  const h = Math.floor(sec/3600);
  const m = Math.floor((sec%3600)/60);
  const s = Math.floor(sec%60);
  const ms = Math.floor((sec - Math.floor(sec))*1000);
  const pad = (n,z=2)=>String(n).padStart(z,'0');
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms,3)}`;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('API on http://localhost:'+PORT));
