import { useRef, useState } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  onTranscribe: (blob: Blob) => Promise<string>;
  disabled?: boolean;
}

export function VoiceInput({ onTranscript, onTranscribe, disabled }: VoiceInputProps) {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        setProcessing(true);
        try {
          const text = await onTranscribe(blob);
          if (text && !text.startsWith('[Demo mode]')) onTranscript(text);
          else if (text) onTranscript('');
        } finally {
          setProcessing(false);
        }
      };
      mediaRecorder.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert('Microphone access is required for voice input.');
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setRecording(false);
  };

  return (
    <button
      type="button"
      disabled={disabled || processing}
      onClick={recording ? stopRecording : startRecording}
      className={`p-3 rounded-xl transition ${
        recording
          ? 'bg-red-500 text-white animate-pulse'
          : 'bg-slate-100 text-slate-600 hover:bg-care-100 hover:text-care-700'
      } disabled:opacity-50`}
      title={recording ? 'Stop recording' : 'Hold to speak symptoms'}
    >
      {processing ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : recording ? (
        <MicOff className="w-5 h-5" />
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </button>
  );
}
