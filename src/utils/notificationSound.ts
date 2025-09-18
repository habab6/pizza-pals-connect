class NotificationAudio {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;

  constructor() {
    // Create audio notification sound using Web Audio API
    this.createNotificationSound();
  }

  private createNotificationSound() {
    // Create a simple notification sound using Web Audio API
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a buffer for our sound
    const sampleRate = audioContext.sampleRate;
    const duration = 0.3; // 300ms
    const buffer = audioContext.createBuffer(1, sampleRate * duration, sampleRate);
    const data = buffer.getChannelData(0);

    // Generate a pleasant notification sound (two tones)
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Two sine waves for a pleasant notification sound
      const freq1 = 800; // First tone
      const freq2 = 1000; // Second tone higher
      const envelope = Math.exp(-t * 3); // Decay envelope
      
      if (t < 0.15) {
        data[i] = Math.sin(2 * Math.PI * freq1 * t) * envelope * 0.3;
      } else {
        data[i] = Math.sin(2 * Math.PI * freq2 * (t - 0.15)) * envelope * 0.3;
      }
    }

    // Convert to data URL
    const offlineContext = new OfflineAudioContext(1, buffer.length, sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start();
    
    offlineContext.startRendering().then((renderedBuffer) => {
      // Convert buffer to WAV blob and create audio element
      const wav = this.bufferToWave(renderedBuffer);
      const blob = new Blob([wav], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      this.audio = new Audio(url);
      this.audio.loop = true;
    });
  }

  private bufferToWave(buffer: AudioBuffer): ArrayBuffer {
    const length = buffer.length;
    const arrayBuffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(arrayBuffer);
    const data = buffer.getChannelData(0);

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);

    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, data[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }

    return arrayBuffer;
  }

  play() {
    if (this.audio && !this.isPlaying) {
      this.isPlaying = true;
      this.audio.currentTime = 0;
      this.audio.play().catch(console.error);
    }
  }

  stop() {
    if (this.audio && this.isPlaying) {
      this.isPlaying = false;
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }
}

// Singleton instance
let notificationAudio: NotificationAudio | null = null;

export const getNotificationAudio = (): NotificationAudio => {
  if (!notificationAudio) {
    notificationAudio = new NotificationAudio();
  }
  return notificationAudio;
};

export const playNotificationSound = () => {
  // Notification sonore désactivée - notifications visuelles seulement
};

export const stopNotificationSound = () => {
  // Notification sonore désactivée - notifications visuelles seulement
};