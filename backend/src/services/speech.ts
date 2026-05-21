import speech from '@google-cloud/speech';
import textToSpeech from '@google-cloud/text-to-speech';
import { config } from '../config.js';

const speechClient = config.demoMode ? null : new speech.SpeechClient();
const ttsClient = config.demoMode ? null : new textToSpeech.TextToSpeechClient();

export async function speechToText(audioBuffer: Buffer, mimeType: string): Promise<string> {
  if (!speechClient) {
    return '[Demo mode] Voice transcription requires GCP Speech-to-Text. Please type your symptoms or configure credentials.';
  }

  const encoding = mimeType.includes('webm')
    ? 'WEBM_OPUS'
    : mimeType.includes('ogg')
      ? 'OGG_OPUS'
      : 'LINEAR16';

  const [response] = await speechClient.recognize({
    audio: { content: audioBuffer.toString('base64') },
    config: {
      encoding: encoding as 'WEBM_OPUS',
      sampleRateHertz: 48000,
      languageCode: 'en-US',
      enableAutomaticPunctuation: true,
      model: 'medical_conversation',
    },
  });

  const transcript = response.results
    ?.map((r) => r.alternatives?.[0]?.transcript)
    .filter(Boolean)
    .join(' ');

  return transcript || '';
}

export async function textToSpeechAudio(text: string): Promise<{ audioContent: string; contentType: string }> {
  if (!ttsClient) {
    return { audioContent: '', contentType: 'audio/mpeg' };
  }

  const [response] = await ttsClient.synthesizeSpeech({
    input: { text: text.slice(0, 5000) },
    voice: { languageCode: 'en-US', name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' },
    audioConfig: { audioEncoding: 'MP3', speakingRate: 0.95, pitch: 0 },
  });

  const audio = response.audioContent;
  const base64 =
    typeof audio === 'string' ? audio : Buffer.from(audio as Uint8Array).toString('base64');

  return { audioContent: base64, contentType: 'audio/mpeg' };
}
