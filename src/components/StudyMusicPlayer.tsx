import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, RotateCw, Volume2 } from 'lucide-react';

const STUDY_MUSIC_URL = './audio/study-music/study-loop-20260621.m4a';
const STUDY_MUSIC_TITLE = '소방시설관리사 공부음악';

export function StudyMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [looping, setLooping] = useState(true);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: STUDY_MUSIC_TITLE,
      artist: '2027 소방시설관리사 루틴',
      album: '공부 집중 루프',
    });

    navigator.mediaSession.setActionHandler('play', () => {
      audioRef.current?.play().catch(() => undefined);
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioRef.current?.pause();
    });
    navigator.mediaSession.setActionHandler('seekbackward', () => seekBy(-30));
    navigator.mediaSession.setActionHandler('seekforward', () => seekBy(30));

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    };
  }, []);

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    }
  }, [playing]);

  function seekBy(seconds: number) {
    const audio = audioRef.current;
    if (!audio) return;
    const nextTime = Math.min(Math.max(audio.currentTime + seconds, 0), audio.duration || audio.currentTime + seconds);
    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  }

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await audio.play().catch(() => undefined);
      return;
    }

    audio.pause();
  }

  function toggleLoop() {
    const nextLooping = !looping;
    setLooping(nextLooping);
    if (audioRef.current) audioRef.current.loop = nextLooping;
  }

  return (
    <section className="music-panel">
      <div className="section-title-row">
        <h2>공부음악</h2>
        <span>{playing ? '재생 중' : '대기'}</span>
      </div>

      <div className="music-now">
        <span>집중 루프</span>
        <strong>{STUDY_MUSIC_TITLE}</strong>
        <small>
          {formatTime(currentTime)} / {formatTime(duration)}
        </small>
      </div>

      <div className="music-progress" aria-hidden="true">
        <span style={{ width: `${duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0}%` }} />
      </div>

      <div className="music-controls">
        <button onClick={() => seekBy(-30)}>
          <RotateCcw size={18} />
          30초
        </button>
        <button className="primary" onClick={togglePlay}>
          {playing ? <Pause size={19} /> : <Play size={19} />}
          {playing ? '멈춤' : '재생'}
        </button>
        <button className={looping ? 'active' : ''} onClick={toggleLoop}>
          <RotateCw size={18} />
          반복
        </button>
      </div>

      <div className="music-native">
        <Volume2 size={17} />
        <audio
          ref={audioRef}
          controls
          loop={looping}
          preload="metadata"
          src={STUDY_MUSIC_URL}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        >
          오디오 재생을 지원하지 않는 브라우저입니다.
        </audio>
      </div>
    </section>
  );
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}
