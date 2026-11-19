import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Generates voice audition samples for 8 Gemini TTS candidate voices
 * (4 female: Aoede, Kore, Leda, Zephyr; 4 male: Charon, Puck, Fenrir, Orus)
 * across 3 Turkish and 3 English emotional phrases into `reviews/voices/`.
 */
const MODEL = 'gemini-2.5-flash-preview-tts';

const CANDIDATE_VOICES = [
  { name: 'Aoede', gender: 'female', character: 'Elif (candidate 1)' },
  { name: 'Kore', gender: 'female', character: 'Zeynep (candidate 1)' },
  { name: 'Leda', gender: 'female', character: 'Female candidate 3' },
  { name: 'Zephyr', gender: 'female', character: 'Female candidate 4' },
  { name: 'Charon', gender: 'male', character: 'Kemal (candidate 1)' },
  { name: 'Puck', gender: 'male', character: 'Emre (candidate 1)' },
  { name: 'Fenrir', gender: 'male', character: 'Male candidate 3' },
  { name: 'Orus', gender: 'male', character: 'Male candidate 4' },
] as const;

const SAMPLE_PHRASES = [
  {
    id: 'tr-01-cheerful',
    lang: 'tr',
    style: 'Say cheerfully and warmly in Turkish:',
    text: 'Merhaba, hoş geldiniz! Günaydın! Ben sıcak çay ve taze ekmek istiyorum.',
  },
  {
    id: 'tr-02-curious',
    lang: 'tr',
    style: 'Say with curiosity and surprise in Turkish:',
    text: 'Acaba bu kimin gözlüğü? Bu çanta çok güzel ama biraz pahalı!',
  },
  {
    id: 'tr-03-calm',
    lang: 'tr',
    style: 'Say calmly and encouragingly in Turkish:',
    text: 'Merak etme, her şey yolunda. Hadi yarın birlikte parkta yürüyelim.',
  },
  {
    id: 'en-01-cheerful',
    lang: 'en',
    style: 'Say cheerfully and warmly in English:',
    text: 'Good morning! Welcome to our cafe! Would you like some coffee or tea?',
  },
  {
    id: 'en-02-curious',
    lang: 'en',
    style: 'Say with curiosity and surprise in English:',
    text: 'Excuse me, is this your new backpack? What an amazing and unusual story!',
  },
  {
    id: 'en-03-calm',
    lang: 'en',
    style: 'Say calmly and encouragingly in English:',
    text: 'Do not be afraid of mistakes. Practice every day and you will make great progress.',
  },
] as const;

function loadEnvLocalKey(): string | null {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) return null;
  const content = fs.readFileSync(envPath, 'utf8');
  const match = /^\s*GEMINI_API_KEY\s*=\s*([^\s#]+)/m.exec(content);
  return match?.[1]?.replace(/^["']|["']$/g, '') ?? null;
}

function pcmToMp3OrWav(pcmBuffer: Buffer, outMp3Path: string, tmpDir: string): string {
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.mkdirSync(path.dirname(outMp3Path), { recursive: true });
  const rawPcmPath = path.join(tmpDir, `${path.basename(outMp3Path, '.mp3')}.pcm`);
  fs.writeFileSync(rawPcmPath, pcmBuffer);

  try {
    execFileSync(
      'ffmpeg',
      [
        '-y',
        '-f',
        's16le',
        '-ar',
        '24000',
        '-ac',
        '1',
        '-i',
        rawPcmPath,
        '-af',
        'loudnorm=I=-16:TP=-1.5:LRA=11',
        '-codec:a',
        'libmp3lame',
        '-b:a',
        '40k',
        outMp3Path,
      ],
      { stdio: 'ignore' },
    );
    fs.unlinkSync(rawPcmPath);
    return outMp3Path;
  } catch {
    // Fallback: write WAV header if ffmpeg is not installed yet
    const wavPath = outMp3Path.replace(/\.mp3$/, '.wav');
    const header = Buffer.alloc(44);
    const dataSize = pcmBuffer.length;
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(24000, 24);
    header.writeUInt32LE(48000, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    fs.writeFileSync(wavPath, Buffer.concat([header, pcmBuffer]));
    fs.unlinkSync(rawPcmPath);
    return wavPath;
  }
}

async function generateVoiceSample(
  apiKey: string,
  voiceName: string,
  style: string,
  text: string,
): Promise<Buffer> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${style} ${text}` }] }],
      generationConfig: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName,
            },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errText}`);
  }

  const json = (await response.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ inlineData?: { data?: string } }> };
    }>;
  };
  const b64 = json.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!b64) {
    throw new Error('No audio inlineData returned by Gemini TTS');
  }
  return Buffer.from(b64, 'base64');
}

async function main() {
  const apiKey = loadEnvLocalKey();
  if (!apiKey) {
    console.log(
      '[tts:sample-voices] GEMINI_API_KEY is not set in .env.local yet.\n' +
        'See reviews/voices/CANDIDATES.md and docs/USER_ACTIONS.md (Step 5.1) to add your key and generate the 48 audition clips.',
    );
    return;
  }

  const outRoot = path.join(process.cwd(), 'reviews', 'voices');
  const tmpDir = path.join(process.cwd(), 'tmp', 'voices');

  for (const voice of CANDIDATE_VOICES) {
    for (const phrase of SAMPLE_PHRASES) {
      const outMp3 = path.join(outRoot, voice.name, `${phrase.id}.mp3`);
      if (fs.existsSync(outMp3)) {
        console.log(`[tts:sample-voices] Skipping existing ${voice.name}/${phrase.id}.mp3`);
        continue;
      }

      try {
        console.log(`[tts:sample-voices] Generating ${voice.name} -> ${phrase.id}...`);
        const pcm = await generateVoiceSample(apiKey, voice.name, phrase.style, phrase.text);
        const saved = pcmToMp3OrWav(pcm, outMp3, tmpDir);
        console.log(`[tts:sample-voices] Saved ${path.relative(process.cwd(), saved)}`);
        // Respect free tier rate limits (~10 RPM -> 6.5s pause)
        await new Promise((r) => setTimeout(r, 6500));
      } catch (err) {
        console.error(
          `[tts:sample-voices] Failed ${voice.name}/${phrase.id}: ${(err as Error).message}`,
        );
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
