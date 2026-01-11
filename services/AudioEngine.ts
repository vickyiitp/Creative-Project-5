export class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private masterGain: GainNode | null = null;
  private lowPassFilter: BiquadFilterNode | null = null;
  private nextNoteTime: number = 0;
  private noteLength: number = 0.25; // 16th notes
  private bpm: number = 115;
  private lookahead: number = 25.0; // ms
  private scheduleAheadTime: number = 0.1; // s
  private timerID: number | null = null;
  
  // Track musical state
  private current16thNote: number = 0;
  private beatCallback: ((beatTime: number, beatIndex: number) => void) | null = null;

  // Visualizer data
  private dataArray: Uint8Array | null = null;

  // Cached Buffers to reduce GC
  private noiseBuffer: AudioBuffer | null = null;

  constructor() {
    // Lazy init in init() to handle browser autoplay policy
  }

  public init() {
    if (this.ctx) return;
    
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    this.ctx = new AudioContextClass();
    
    if (!this.ctx) return;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    
    // Compressor for that "pump" effect
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.knee.value = 30;
    compressor.ratio.value = 12;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.25;
    
    this.lowPassFilter = this.ctx.createBiquadFilter();
    this.lowPassFilter.type = 'lowpass';
    this.lowPassFilter.frequency.value = this.ctx.sampleRate / 2; // Start wide open

    this.masterGain.connect(this.lowPassFilter);
    this.lowPassFilter.connect(compressor);
    
    // Analyser for visuals
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    // Pre-generate noise buffer for drums
    this.createNoiseBuffer();
  }
  
  public setIntensity(intensity: number) { // 0 to 1
    if (!this.lowPassFilter || !this.ctx) return;
    // Map intensity to a logarithmic frequency range (e.g., 400Hz to 22050Hz)
    const minFreq = 400;
    const maxFreq = this.ctx.sampleRate / 2;
    const freq = minFreq * Math.pow(maxFreq / minFreq, intensity);
    this.lowPassFilter.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  public async start() {
    if (!this.ctx) this.init();
    if (this.ctx?.state === 'suspended') {
      await this.ctx.resume();
    }
    this.current16thNote = 0;
    this.nextNoteTime = this.ctx!.currentTime + 0.1;
    this.scheduler();
  }

  public stop() {
    if (this.timerID !== null) {
      window.clearTimeout(this.timerID);
      this.timerID = null;
    }
    if (this.ctx) {
      this.ctx.suspend();
    }
  }

  public setBeatCallback(cb: (beatTime: number, beatIndex: number) => void) {
    this.beatCallback = cb;
  }

  public getVisualData(): Uint8Array {
    if (this.analyser && this.dataArray) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    return new Uint8Array(0);
  }

  public getCurrentTime(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  public getBPM(): number {
    return this.bpm;
  }

  public isRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  private scheduler() {
    if (!this.ctx) return;
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.current16thNote, this.nextNoteTime);
      this.nextNote();
    }
    this.timerID = window.setTimeout(() => this.scheduler(), this.lookahead);
  }

  private nextNote() {
    const secondsPerBeat = 60.0 / this.bpm;
    // 16th notes = 0.25 of a beat
    this.nextNoteTime += 0.25 * secondsPerBeat;
    this.current16thNote++;
    if (this.current16thNote === 16) {
      this.current16thNote = 0;
    }
  }

  private scheduleNote(beatNumber: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // Trigger game logic callback on every quarter note (beat)
    if (beatNumber % 4 === 0) {
       // Beat calculation: beatNumber / 4 is the step in the measure
       if (this.beatCallback) this.beatCallback(time, beatNumber);
    }

    // --- DRUMS ---
    
    // Kick: 4-on-the-floor (0, 4, 8, 12)
    if (beatNumber % 4 === 0) {
      this.playKick(time);
    }

    // Snare: 2 and 4 (4, 12)
    if (beatNumber % 16 === 4 || beatNumber % 16 === 12) {
      this.playSnare(time);
    }

    // Hi-hat: Every off-beat 16th (2, 6, 10, 14, etc)
    if (beatNumber % 2 === 0) {
        this.playHiHat(time, beatNumber % 4 === 2); // Accent on off-beats
    }

    // --- BASS ---
    // Off-beat pulsating bass (Eighth notes on the off beat: 2, 6, 10, 14)
    if (beatNumber % 2 === 0) {
       this.playBass(time, beatNumber);
    }

    // --- SYNTH CHORDS/ARPS ---
    // Simple arpeggio pattern
    if (beatNumber % 2 === 0) {
        this.playArp(time, beatNumber);
    }
  }

  // --- SYNTHESIS METHODS ---

  private playKick(time: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01, time + 0.5);
    
    gain.gain.setValueAtTime(1, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start(time);
    osc.stop(time + 0.5);
  }

  private playSnare(time: number) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    
    // Use cached noise buffer
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1000;
    
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.6, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1); // Short snap
    
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(time);
    noise.stop(time + 0.15); // Stop to save processing

    // Body (Oscillator)
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(250, time);
    const oscGain = this.ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    osc.connect(oscGain);
    oscGain.connect(this.masterGain);
    osc.start(time);
    osc.stop(time + 0.15);
  }

  private playHiHat(time: number, isOpen: boolean) {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.ctx.createGain();
    // Varies volume for groove
    const volume = isOpen ? 0.3 : 0.15;
    const decay = isOpen ? 0.1 : 0.05;

    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + decay);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(time);
    noise.stop(time + decay + 0.05);
  }

  private playBass(time: number, step: number) {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'sawtooth';
      
      // F, G, A#, C progression
      const root = 43.65; // F1
      const freqs = [root, root * 1.122, root * 1.334, root * 1.498]; 
      // Change note every 4 measures (64 16th notes) roughly, simplified here
      const sequenceIndex = Math.floor(step / 32) % 4;
      osc.frequency.setValueAtTime(freqs[sequenceIndex], time);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(100, time);
      filter.frequency.linearRampToValueAtTime(800, time + 0.1); // Pluck
      filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.6, time);
      gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.4);
  }

  private playArp(time: number, step: number) {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      osc.type = 'square';
      
      // Synthwave minor scale arp
      const base = 174.61; // F3
      const notes = [1, 1.2, 1.5, 2.0, 1.5, 1.2]; // Minor triad + octave
      const note = base * notes[(step / 2) % notes.length];
      
      osc.frequency.setValueAtTime(note, time);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.1, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);
      
      // Delay effect for space
      const delay = this.ctx.createDelay();
      delay.delayTime.value = 0.375; // Dotted 8th delay
      const delayGain = this.ctx.createGain();
      delayGain.gain.value = 0.4;

      osc.connect(gain);
      gain.connect(this.masterGain);
      gain.connect(delay);
      delay.connect(delayGain);
      delayGain.connect(delay); // Feedback
      delayGain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + 0.3);
  }
}