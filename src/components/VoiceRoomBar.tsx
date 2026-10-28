import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Users, Radio, Settings2, PhoneCall, PhoneOff } from 'lucide-react';
import { Member } from '../types';
import { ThemeConfig } from '../utils/theme';

interface VoiceRoomBarProps {
  members: Member[];
  theme: ThemeConfig;
  projectName: string;
}

export const VoiceRoomBar: React.FC<VoiceRoomBarProps> = ({ members, theme, projectName }) => {
  const [isInRoom, setIsInRoom] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [isDeafened, setIsDeafened] = useState<boolean>(false);
  const [micVolume, setMicVolume] = useState<number>(0);
  const [activeSpeakers, setActiveSpeakers] = useState<Record<string, boolean>>({});
  const [hasMicPermission, setHasMicPermission] = useState<boolean | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [noiseSuppression, setNoiseSuppression] = useState<boolean>(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Play subtle feedback sounds using Web Audio API
  const playTone = (freq: number, type: OscillatorType = 'sine', duration = 0.12) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context might be restricted before user gesture
    }
  };

  // Toggle microphone audio stream
  const toggleMic = async () => {
    if (!isInRoom) return;

    if (isMuted) {
      // Unmute: attempt to capture real audio
      try {
        if (!mediaStreamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              noiseSuppression,
              echoCancellation: true,
              autoGainControl: true,
            },
          });
          mediaStreamRef.current = stream;
          setHasMicPermission(true);

          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;
        }

        setIsMuted(false);
        playTone(600, 'sine', 0.1);

        // Start volume monitoring
        const checkVolume = () => {
          if (analyserRef.current && !isMuted) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(100, Math.round((avg / 128) * 100));
            setMicVolume(normalized);

            setActiveSpeakers((prev) => ({
              ...prev,
              usr_me: normalized > 18,
            }));
          } else {
            setMicVolume(0);
          }
          animFrameRef.current = requestAnimationFrame(checkVolume);
        };
        checkVolume();
      } catch (err) {
        console.warn('Microphone permission not granted, using simulated meter:', err);
        setHasMicPermission(false);
        setIsMuted(false);
        playTone(600, 'sine', 0.1);
      }
    } else {
      // Mute
      setIsMuted(true);
      playTone(400, 'sine', 0.1);
      setMicVolume(0);
      setActiveSpeakers((prev) => ({ ...prev, usr_me: false }));
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    }
  };

  // Toggle voice room connection
  const toggleRoom = () => {
    if (isInRoom) {
      // Leave room
      setIsInRoom(false);
      setIsMuted(true);
      setActiveSpeakers({});
      playTone(300, 'sine', 0.15);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    } else {
      // Join room
      setIsInRoom(true);
      setIsMuted(true);
      playTone(550, 'sine', 0.15);
    }
  };

  // Simulate occasional speaking by teammates when in room to make the app feel alive and interactive
  useEffect(() => {
    if (!isInRoom || isDeafened) return;

    const interval = setInterval(() => {
      const otherMembers = members.filter((m) => m.id !== 'usr_me' && m.isOnline);
      if (otherMembers.length === 0) return;

      const randomMember = otherMembers[Math.floor(Math.random() * otherMembers.length)];
      // 35% chance to toggle speaking
      if (Math.random() > 0.6) {
        setActiveSpeakers((prev) => ({
          ...prev,
          [randomMember.id]: true,
        }));

        setTimeout(() => {
          setActiveSpeakers((prev) => ({
            ...prev,
            [randomMember.id]: false,
          }));
        }, 3200);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isInRoom, isDeafened, members]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <aside aria-label="Phòng thoại nhóm" className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2.5 shadow-xs transition-colors">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Left: Status & Active Speakers in Room */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={`relative flex h-3 w-3 ${isInRoom ? 'text-emerald-500' : 'text-slate-400'}`}>
              {isInRoom && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isInRoom ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-500" />
                  Kênh thoại nhóm
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium truncate max-w-[180px]">
                  {projectName}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {isInRoom
                  ? `${members.filter((m) => m.isOnline).length} thành viên đang kết nối âm thanh`
                  : 'Chưa tham gia phòng thoại'}
              </p>
            </div>
          </div>

          {/* Members Avatars with Audio Ripples */}
          {isInRoom && (
            <div className="hidden sm:flex items-center -space-x-1.5 ml-2 pl-3 border-l border-slate-200 dark:border-slate-800">
              {members.map((m) => {
                const isSpeaking = activeSpeakers[m.id];
                const isUser = m.id === 'usr_me';
                const muted = isUser ? isMuted : m.micMuted;

                return (
                  <div
                    key={m.id}
                    title={`${m.name} ${muted ? '(Đã tắt mic)' : isSpeaking ? '(Đang nói...)' : '(Đang nghe)'}`}
                    className="relative group"
                  >
                    <div
                      className={`relative w-8 h-8 rounded-full border-2 transition-all duration-200 ${
                        isSpeaking
                          ? 'border-emerald-500 ring-4 ring-emerald-500/30 scale-105 z-10'
                          : muted
                          ? 'border-slate-300 dark:border-slate-700 opacity-70'
                          : 'border-white dark:border-slate-900'
                      }`}
                    >
                      <img
                        src={m.avatar}
                        alt={m.name}
                        className="w-full h-full object-cover rounded-full"
                        referrerPolicy="no-referrer"
                      />
                      {muted ? (
                        <span className="absolute -bottom-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-xs">
                          <MicOff className="w-2.5 h-2.5" />
                        </span>
                      ) : isSpeaking ? (
                        <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow-xs animate-pulse">
                          <Volume2 className="w-2.5 h-2.5" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Controls (Mic Toggle, Sound Toggle, Join/Leave) */}
        <div className="flex items-center gap-2">
          {isInRoom && (
            <>
              {/* Mic Volume Visualizer bar (when unmuted) */}
              {!isMuted && (
                <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-xs">
                  <span className="text-[11px] text-slate-500 font-medium">Mic:</span>
                  <div className="w-16 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75"
                      style={{ width: `${Math.max(8, micVolume)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Toggle Microphone Button */}
              <button
                id="btn-toggle-mic"
                type="button"
                onClick={toggleMic}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs shrink-0 cursor-pointer ${
                  isMuted
                    ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 hover:bg-red-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-500/30'
                }`}
                title={isMuted ? 'Bật micro để nói' : 'Tắt micro'}
              >
                {isMuted ? (
                  <>
                    <MicOff className="w-4 h-4" />
                    <span className="hidden sm:inline">Bật Micro</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 animate-bounce" />
                    <span className="hidden sm:inline">Micro Đang Bật</span>
                  </>
                )}
              </button>

              {/* Deafen/Mute sound */}
              <button
                id="btn-toggle-deafen"
                type="button"
                onClick={() => {
                  setIsDeafened(!isDeafened);
                  playTone(isDeafened ? 500 : 350, 'sine', 0.1);
                }}
                title={isDeafened ? 'Bật âm thanh nhóm' : 'Tắt âm thanh (Điếc)'}
                className={`p-1.5 rounded-lg border text-xs transition-colors shrink-0 cursor-pointer ${
                  isDeafened
                    ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border-amber-300 dark:border-amber-800'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {isDeafened ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Voice settings */}
              <button
                id="btn-voice-settings"
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                title="Cài đặt âm thanh"
              >
                <Settings2 className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Join / Leave Voice Room Button */}
          <button
            id="btn-toggle-voice-room"
            type="button"
            onClick={toggleRoom}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              isInRoom
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                : `${theme.primary} shadow-sm`
            }`}
          >
            {isInRoom ? (
              <>
                <PhoneOff className="w-4 h-4 text-red-500" />
                <span className="hidden sm:inline">Rời Kênh Thoại</span>
              </>
            ) : (
              <>
                <PhoneCall className="w-4 h-4" />
                <span>Vào Kênh Thoại</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Popover Settings */}
      {showSettings && isInRoom && (
        <div className="max-w-7xl mx-auto mt-2.5 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={noiseSuppression}
                onChange={(e) => setNoiseSuppression(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Khử tiếng ồn môi trường (Noise Suppression)</span>
            </label>
            <span className="text-slate-400">•</span>
            <span>Chế độ: Thoại tự do (Voice Activity)</span>
          </div>
          <p className="text-[11px] text-slate-500">
            {hasMicPermission === false
              ? '⚠️ Trình duyệt chưa cấp quyền mic, đang hiển thị mô phỏng'
              : '✅ Trạng thái âm thanh ổn định'}
          </p>
        </div>
      )}
    </aside>
  );
};
