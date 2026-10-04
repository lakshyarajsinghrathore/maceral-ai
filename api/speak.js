import https from 'node:https';

function cleanText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/#{1,6}\s*/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*\*(.*?)\*/g, '$1')
    .replace(/\[.*?\]/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[_`~]/g, '')
    .trim();
}

function fetchTTSChunk(textChunk, langCode) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(textChunk)}&tl=${langCode}&client=tw-ob`;
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`TTS chunk failed: ${res.statusCode}`));
      }
      const data = [];
      res.on('data', (c) => data.push(c));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

function splitIntoChunks(text, maxLength = 180) {
  const sentences = text.match(/[^.!?।\n]+[.!?।\n]*/g) || [text];
  const chunks = [];
  let current = '';

  for (const s of sentences) {
    if ((current + s).length <= maxLength) {
      current += s;
    } else {
      if (current.trim()) chunks.push(current.trim());
      if (s.length > maxLength) {
        const words = s.split(' ');
        let temp = '';
        for (const w of words) {
          if ((temp + ' ' + w).length <= maxLength) {
            temp += (temp ? ' ' : '') + w;
          } else {
            if (temp.trim()) chunks.push(temp.trim());
            temp = w;
          }
        }
        if (temp.trim()) chunks.push(temp.trim());
        current = '';
      } else {
        current = s;
      }
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text.slice(0, maxLength)];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }
    const text = (body && body.text) || req.query.text;
    const language = (body && body.language) || req.query.language || 'English';

    const cleaned = cleanText(text);
    if (!cleaned) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const langCode = language === 'Hindi' ? 'hi' : language === 'Bengali' ? 'bn' : 'en-IN';
    const chunks = splitIntoChunks(cleaned, 180);

    const activeChunks = chunks.slice(0, 8);
    const audioBuffers = await Promise.all(
      activeChunks.map((chunk) => fetchTTSChunk(chunk, langCode))
    );

    const fullAudio = Buffer.concat(audioBuffers);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', fullAudio.length);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(fullAudio);
  } catch (error) {
    console.error('TTS handler error:', error);
    return res.status(500).json({ error: 'TTS generation failed', details: error.message });
  }
}
