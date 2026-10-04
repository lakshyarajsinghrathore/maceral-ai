import https from 'node:https';

function cleanText(text) {
  if (!text || typeof text !== 'string') return '';

  let t = text;

  // 1. Remove URLs entirely so they are never read aloud
  t = t.replace(/https?:\/\/\S+/g, '');

  // 2. Remove document citation brackets like [1], [Doc: Gevra Report], [1, 2]
  t = t.replace(/\[.*?\]/g, '');

  // 3. Remove Markdown code blocks and backticks
  t = t.replace(/`{1,3}[\s\S]*?`{1,3}/g, '');

  // 4. Remove Markdown headers (### Header -> Header)
  t = t.replace(/#{1,6}\s*/g, '');

  // 5. Remove bold / italic / strikethrough formatting markers
  t = t.replace(/\*\*(.*?)\*\*/g, '$1');
  t = t.replace(/\*(.*?)\*/g, '$1');
  t = t.replace(/~~(.*?)~~/g, '$1');
  t = t.replace(/__(.*?)__/g, '$1');
  t = t.replace(/_(.*?)_/g, '$1');

  // 6. Remove Markdown table syntax: table dividers and column pipes
  t = t.replace(/\|[-:\s|]+\|/g, '');
  t = t.replace(/\|/g, ', ');

  // 7. Remove list bullets at start of lines (*, -, +, •)
  t = t.replace(/^[\s*•\-+]+/gm, '');

  // 8. Remove blockquote markers (> Quote -> Quote)
  t = t.replace(/^>\s*/gm, '');

  // 9. Remove all emojis and pictorial Unicode characters (faces, flags, symbols, dingbats)
  try {
    t = t.replace(/\p{Extended_Pictographic}/gu, '');
  } catch (e) {}
  t = t.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '');
  t = t.replace(/[\u200B-\u200D\uFE00-\uFE0F\u2600-\u27BF\u2B50-\u2B55\u2300-\u23FF\u25A0-\u25FF\uE000-\uF8FF]/g, '');

  // 10. Remove non-major decorative symbols while preserving cadence and legitimate numbers/units
  t = t.replace(/[@#^&*~_<>{}\[\]()\\/=+`"\'~_•◦▪–—]/g, ' ');

  // 11. Normalize multiple punctuation
  t = t.replace(/\.{2,}/g, '.');
  t = t.replace(/,{2,}/g, ',');
  t = t.replace(/!{2,}/g, '!');
  t = t.replace(/\?{2,}/g, '?');

  // Add space after punctuation if immediately followed by a letter (avoid decimals like 15.4 or ১৫.৪)
  t = t.replace(/([.,!?:;।])([A-Za-z\u0904-\u0939\u0985-\u09B9])/g, '$1 $2');

  // Clean trailing/redundant spaces before punctuation
  t = t.replace(/\s+([.,!?:;।])/g, '$1');

  // Clean double commas like ', ,'
  t = t.replace(/(,\s*)+,/g, ',');

  // 12. Collapse excessive whitespace and line breaks into natural pauses
  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n\s*\n+/g, '. ');
  t = t.replace(/\n/g, ', ');

  return t.trim();
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
