// Web Audio API notification sound synthesizer
// Provides pleasant, instant audio cues without external assets

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type NotificationSoundType =
  | 'urgent'
  | 'normal'
  | 'success'
  | 'member_add'
  | 'member_remove'
  | 'deadline'
  | 'info';

export function playNotificationSound(type: NotificationSoundType = 'normal') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'urgent' || type === 'member_remove') {
      // High attention double chime: 880Hz -> 1046Hz
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1046.5, now + 0.12);
      osc2.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(523.25, now + 0.12);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);
    } else if (type === 'success' || type === 'member_add') {
      // Gentle chord: C5 -> E5 -> G5
      osc1.frequency.setValueAtTime(523.25, now);
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1);
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.2);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc1.start(now);
      osc1.stop(now + 0.41);
    } else {
      // Standard gentle 2-tone chime: 587Hz (D5) -> 880Hz (A5)
      osc1.frequency.setValueAtTime(587.33, now);
      osc1.frequency.setValueAtTime(880, now + 0.08);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc1.start(now);
      osc1.stop(now + 0.31);
    }
  } catch (e) {
    console.debug('Audio notification skipped or not allowed yet', e);
  }
}
