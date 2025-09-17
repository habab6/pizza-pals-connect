class NotificationAudio {
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private audioContext: AudioContext | null = null;
  private isInitialized = false;

  constructor() {
    console.log('🔊 Initializing NotificationAudio...');
    // Don't create audio immediately - wait for user interaction
  }

  private async initializeAudio() {
    if (this.isInitialized) return;
    
    try {
      console.log('🔊 Initializing audio with user interaction...');
      
      // Resume AudioContext (required by some browsers)
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        console.log('🔊 AudioContext resumed');
      }
      
      await this.createNotificationSound();
      this.isInitialized = true;
      console.log('🔊 Audio initialized successfully');
    } catch (error) {
      console.error('🔊 Error initializing audio:', error);
    }
  }

  private async createNotificationSound() {
    try {
      console.log('🔊 Creating notification sound...');
      
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      console.log('🔊 AudioContext created:', this.audioContext.state);
      
      // Create a buffer for our sound
      const sampleRate = this.audioContext.sampleRate;
      const duration = 0.3; // 300ms
      const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);

    // Generate a soft, pleasant notification sound (gentle chime)
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      // Softer frequencies for a gentler sound
      const freq1 = 523; // C5 note (softer)
      const freq2 = 659; // E5 note (harmonious)
      const envelope = Math.exp(-t * 2) * (1 - Math.pow(t / duration, 2)); // Smoother decay
      
      // Blend the two tones for a harmonious chime
      const wave1 = Math.sin(2 * Math.PI * freq1 * t) * envelope * 0.15;
      const wave2 = Math.sin(2 * Math.PI * freq2 * t) * envelope * 0.1;
      
      // Add a subtle third harmonic for richness
      const harmonic = Math.sin(2 * Math.PI * freq1 * 1.5 * t) * envelope * 0.05;
      
      data[i] = wave1 + wave2 + harmonic;
    }

    // Convert to data URL
    const offlineContext = new OfflineAudioContext(1, buffer.length, sampleRate);
    const source = offlineContext.createBufferSource();
    source.buffer = buffer;
    source.connect(offlineContext.destination);
    source.start();
    
    const renderedBuffer = await offlineContext.startRendering();
    console.log('🔊 Audio buffer rendered successfully');
    
    // Convert buffer to WAV blob and create audio element
    const wav = this.bufferToWave(renderedBuffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    this.audio = new Audio(url);
    this.audio.loop = true;
    this.audio.volume = 0.3; // Set a reasonable volume
    console.log('🔊 Audio element created and ready');
    } catch (error) {
      console.error('🔊 Error creating notification sound:', error);
      // Fallback: create a simple beep using oscillator
      console.log('🔊 Using fallback beep sound');
    }
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

  async play() {
    console.log('🔊 Play called, audio ready:', !!this.audio, 'isPlaying:', this.isPlaying);
    
    // Initialize audio on first play (requires user interaction)
    if (!this.isInitialized) {
      await this.initializeAudio();
    }
    
    if (this.audio && !this.isPlaying) {
      this.isPlaying = true;
      this.audio.currentTime = 0;
      console.log('🔊 Attempting to play sound...');
      try {
        await this.audio.play();
        console.log('🔊 Sound played successfully');
      } catch (error) {
        console.error('🔊 Error playing sound:', error);
        this.isPlaying = false;
        // Try fallback beep
        this.playFallbackBeep();
      }
    }
  }

  private playFallbackBeep() {
    try {
      console.log('🔊 Playing fallback beep');
      if (this.audioContext) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + 0.3);
      }
    } catch (error) {
      console.error('🔊 Fallback beep failed:', error);
    }
  }

  stop() {
    console.log('🔊 Stop called, isPlaying:', this.isPlaying);
    if (this.audio && this.isPlaying) {
      this.isPlaying = false;
      this.audio.pause();
      this.audio.currentTime = 0;
      console.log('🔊 Sound stopped');
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

export const playNotificationSound = async () => {
  console.log('🔊 playNotificationSound called');
  const audio = getNotificationAudio();
  await audio.play();
};

export const stopNotificationSound = () => {
  const audio = getNotificationAudio();
  audio.stop();
};