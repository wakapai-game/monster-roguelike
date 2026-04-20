/**
 * bgm.js — 8bit BGM システム（Web Audio API）
 * スタイル: Talking Heads / Post-punk
 *   - 反復するベースオスティナート
 *   - シンコペーションした角ばったメロディ
 *   - Dorian / Aeolian モード
 *   - 機械的で正確なドラムパターン
 */

// ---- 音符周波数 ----
const N = {
  B2:123.47, Bb2:116.54, A2:110.00, G2:98.00,  F2:87.31,  E2:82.41,  D2:73.42,  C2:65.41,
  B3:246.94, Bb3:233.08, A3:220.00, Ab3:207.65, G3:196.00, F3:174.61, Eb3:155.56,E3:164.81, D3:146.83, C3:130.81,
  B4:493.88, Bb4:466.16, A4:440.00, Ab4:415.30, G4:392.00, Gb4:369.99,F4:349.23, Eb4:311.13, E4:329.63, D4:293.66, C4:261.63,
  A5:880.00, G5:783.99,  F5:698.46, E5:659.25,  Eb5:622.25,D5:587.33, C5:523.25,
};
const R = 0; // rest

// ---- トラック定義 ----
// melody / bass: [[freq_or_R, beats], ...] (4分音符=1, 合計=16拍)
// drums: [['k'|'h'|'s'|R, beats], ...] (合計=16拍)
export const TRACKS = {

  // ---- タイトル: "Psycho Killer" グルーヴ (A minor, BPM=90) ----
  // 反復するAペダルベース + 角ばった短いメロディフレーズ
  title: {
    name: 'タイトル — MONSTER ROGUE',
    screens: ['screen-start'],
    bpm: 90,
    melody: [
      [R,1],[N.A4,0.5],[R,0.5],[N.C5,0.5],[N.A4,0.5],[R,1],
      [R,0.5],[N.A4,0.5],[N.C5,0.5],[R,0.5],[N.E5,0.5],[N.D5,0.5],[N.C5,1],
      [N.D5,0.5],[R,0.5],[N.C5,0.5],[R,0.5],[N.A4,0.5],[N.G4,0.5],[N.A4,1],
      [R,0.5],[N.E5,0.5],[N.D5,0.5],[N.C5,0.5],[N.A4,2],
    ],
    bass: [
      [N.A2,0.5],[N.A2,0.5],[N.A2,0.5],[N.A2,0.5],[N.E3,0.5],[N.E3,0.5],[N.D3,0.5],[N.E3,0.5],
      [N.A2,0.5],[N.A2,0.5],[N.C3,0.5],[N.A2,0.5],[N.E3,0.5],[N.D3,0.5],[N.C3,0.5],[N.D3,0.5],
      [N.A2,0.5],[N.A2,0.5],[N.A2,0.5],[N.A2,0.5],[N.E3,0.5],[N.E3,0.5],[N.D3,0.5],[N.E3,0.5],
      [N.F3,0.5],[N.F3,0.5],[N.G3,0.5],[N.G3,0.5],[N.E3,0.5],[N.E3,0.5],[N.E3,0.5],[N.E3,0.5],
    ],
    drums: [
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
    ],
  },

  // ---- ストーリー: Joy Division "Atmosphere" (E minor, BPM=76) ----
  // スパース、暗い、ロング・ノート
  story: {
    name: 'ストーリー — 始まりの記憶',
    screens: ['screen-story'],
    bpm: 76,
    melody: [
      [N.E4,1],[R,1],[N.B4,1],[N.A4,1],
      [N.G4,0.5],[N.A4,0.5],[N.B4,1],[R,2],
      [R,0.5],[N.D5,0.5],[N.C5,0.5],[N.B4,0.5],[N.A4,1],[N.G4,1],
      [N.E4,2],[R,1],[N.B3,1],
    ],
    bass: [
      [N.E3,2],[N.B3,2],
      [N.A3,2],[N.B3,2],
      [N.E3,2],[N.G3,2],
      [N.D3,2],[N.B2,2],
    ],
    drums: [
      [R,1],['s',1],[R,1],['s',1],
      [R,1],['s',1],[R,1],['s',1],
      [R,1],['s',1],[R,1],['s',1],
      [R,1],['s',1],[R,1],['s',1],
    ],
  },

  // ---- ハブ: "This Must Be the Place" (G Dorian, BPM=104) ----
  // 温かく催眠的、反復するGペダル、Dorian独特の♭7
  hub: {
    name: '拠点 — ギルドの朝',
    screens: ['screen-hub','screen-starter-event','screen-egg','screen-tutorial-select'],
    bpm: 104,
    melody: [
      [R,0.5],[N.G4,0.5],[N.A4,0.5],[N.Bb4,0.5],[N.A4,0.5],[N.G4,0.5],[R,1],
      [N.D5,0.5],[R,0.5],[N.C5,0.5],[N.Bb4,0.5],[N.A4,0.5],[N.G4,0.5],[R,1],
      [R,0.5],[N.G4,0.5],[N.Bb4,0.5],[N.A4,0.5],[N.G4,1],[R,1],
      [N.A4,0.5],[N.Bb4,0.5],[N.C5,0.5],[N.Bb4,0.5],[N.G4,2],
    ],
    bass: [
      [N.G2,0.5],[N.G2,0.5],[N.G2,0.5],[N.G2,0.5],[N.D3,0.5],[N.D3,0.5],[N.C3,0.5],[N.D3,0.5],
      [N.G2,0.5],[N.G2,0.5],[N.Bb2,0.5],[N.G2,0.5],[N.A2,0.5],[N.A2,0.5],[N.G2,0.5],[N.A2,0.5],
      [N.G2,0.5],[N.G2,0.5],[N.G2,0.5],[N.D3,0.5],[N.Eb3,0.5],[N.D3,0.5],[N.C3,0.5],[N.D3,0.5],
      [N.G2,0.5],[N.A2,0.5],[N.Bb2,0.5],[N.A2,0.5],[N.G2,0.5],[N.D3,0.5],[N.G3,0.5],[N.D3,0.5],
    ],
    drums: [
      ['k',1],['s',1],['k',1],['s',1],
      ['k',1],['s',1],['k',1],['s',1],
      ['k',1],['s',1],['k',1],['s',1],
      ['k',1],['s',1],['k',1],['s',1],
    ],
  },

  // ---- マップ: "Life During Wartime" (D minor, BPM=148) ----
  // 走り続ける緊張感、止まらないベース、シンコペーションしたメロディ
  map: {
    name: 'マップ — 地上の風',
    screens: ['screen-map','screen-selection'],
    bpm: 148,
    melody: [
      [N.D4,0.5],[R,0.5],[N.F4,0.5],[N.A4,0.5],[N.C5,0.5],[N.Bb4,0.5],[N.A4,1],
      [R,0.5],[N.A4,0.5],[N.G4,0.5],[N.F4,0.5],[N.Eb4,0.5],[N.D4,0.5],[R,1],
      [N.F4,0.5],[N.A4,0.5],[N.C5,0.5],[R,0.5],[N.Bb4,0.5],[N.A4,0.5],[N.G4,1],
      [N.A4,0.5],[R,0.5],[N.F4,0.5],[N.G4,0.5],[N.A4,1],[N.D4,1],
    ],
    bass: [
      [N.D3,0.5],[N.D3,0.5],[N.D3,0.5],[N.D3,0.5],[N.A3,0.5],[N.A3,0.5],[N.G3,0.5],[N.A3,0.5],
      [N.D3,0.5],[N.D3,0.5],[N.F3,0.5],[N.G3,0.5],[N.A3,0.5],[N.G3,0.5],[N.F3,0.5],[N.D3,0.5],
      [N.D3,0.5],[N.D3,0.5],[N.D3,0.5],[N.D3,0.5],[N.C3,0.5],[N.C3,0.5],[N.Bb2,0.5],[N.C3,0.5],
      [N.D3,0.5],[N.D3,0.5],[N.A3,0.5],[N.G3,0.5],[N.F3,0.5],[N.G3,0.5],[N.A3,0.5],[N.D3,0.5],
    ],
    drums: [
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
    ],
  },

  // ---- バトル: Gang of Four エナジー (A minor, BPM=168) ----
  battle: {
    name: 'バトル — 鉄と獣',
    screens: ['screen-battle'],
    bpm: 168,
    melody: [
      [R,0.5],[N.A4,0.5],[N.E5,0.5],[R,0.5],[N.D5,0.5],[N.C5,0.5],[N.A4,1],
      [N.E5,0.5],[R,0.5],[N.D5,0.5],[N.C5,0.5],[N.B4,0.5],[R,0.5],[N.A4,1],
      [N.C5,0.5],[N.D5,0.5],[N.E5,0.5],[N.G5,0.5],[N.E5,0.5],[N.D5,0.5],[N.C5,1],
      [N.A4,0.5],[N.B4,0.5],[N.C5,0.5],[N.E5,0.5],[N.A5,2],
    ],
    bass: [
      [N.A2,0.5],[N.A2,0.5],[N.A2,0.5],[N.A2,0.5],[N.E3,0.5],[N.E3,0.5],[N.E3,0.5],[N.E3,0.5],
      [N.A2,0.5],[N.A2,0.5],[N.C3,0.5],[N.C3,0.5],[N.E3,0.5],[N.E3,0.5],[N.E3,0.5],[N.E3,0.5],
      [N.A2,0.5],[N.A2,0.5],[N.A2,0.5],[N.A2,0.5],[N.E3,0.5],[N.E3,0.5],[N.E3,0.5],[N.E3,0.5],
      [N.G3,0.5],[N.G3,0.5],[N.G3,0.5],[N.G3,0.5],[N.E3,0.5],[N.E3,0.5],[N.E3,0.5],[N.E3,0.5],
    ],
    drums: [
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
      ['k',0.5],['h',0.5],['s',0.5],['h',0.5],['k',0.5],['h',0.5],['s',0.5],['h',0.5],
    ],
  },

  // ---- 報酬: "Burning Down the House" ファンク (C major, BPM=136) ----
  reward: {
    name: '報酬 — 戦利品',
    screens: ['screen-reward'],
    bpm: 136,
    melody: [
      [R,0.5],[N.G5,0.5],[N.E5,0.5],[N.G5,0.5],[N.C5,1],[R,1],
      [N.G5,0.5],[R,0.5],[N.F5,0.5],[N.G5,0.5],[N.A5,0.5],[N.G5,0.5],[N.E5,1],
      [R,0.5],[N.E5,0.5],[N.D5,0.5],[N.E5,0.5],[N.G5,0.5],[N.E5,0.5],[R,1],
      [N.C5,0.5],[N.E5,0.5],[N.G5,0.5],[N.E5,0.5],[N.C5,2],
    ],
    bass: [
      [N.C3,0.5],[N.C3,0.5],[N.C3,0.5],[N.G3,0.5],[N.C3,0.5],[N.G3,0.5],[N.G3,0.5],[N.G3,0.5],
      [N.F3,0.5],[N.F3,0.5],[N.F3,0.5],[N.F3,0.5],[N.G3,0.5],[N.G3,0.5],[N.G3,0.5],[N.G3,0.5],
      [N.C3,0.5],[N.C3,0.5],[N.E3,0.5],[N.C3,0.5],[N.G3,0.5],[N.G3,0.5],[N.G3,0.5],[N.G3,0.5],
      [N.F3,0.5],[N.F3,0.5],[N.G3,0.5],[N.G3,0.5],[N.C3,0.5],[N.C3,0.5],[N.C3,0.5],[N.C3,0.5],
    ],
    drums: [
      ['k',0.5],['h',0.5],['h',0.5],['s',0.5],['k',0.5],['h',0.5],['h',0.5],['s',0.5],
      ['k',0.5],['h',0.5],['h',0.5],['s',0.5],['k',0.5],['h',0.5],['h',0.5],['s',0.5],
      ['k',0.5],['h',0.5],['h',0.5],['s',0.5],['k',0.5],['h',0.5],['h',0.5],['s',0.5],
      ['k',0.5],['h',0.5],['h',0.5],['s',0.5],['k',0.5],['h',0.5],['h',0.5],['s',0.5],
    ],
  },
};

// ---- 画面ID → トラックID ----
export function screenToBgm(screenId) {
  for (const [id, t] of Object.entries(TRACKS)) {
    if (t.screens.includes(screenId)) return id;
  }
  return null;
}

// ---- Internal State ----
let _ctx       = null;
let _master    = null;  // 音量制御用マスターGain → destination
let _curGain   = null;  // セッションごとのGain（切替時に旧セッション音を無音化）
let _vol       = 0.4;
let _current   = null;
let _sessionId = 0;     // ループコールバックの無効化に使う
let _loopTimer = null;
let _loopEndAt = 0;

function getCtx() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
    _master = _ctx.createGain();
    _master.gain.value = _vol;
    _master.connect(_ctx.destination);
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

// ---- 音符再生 ----
function playTone(freq, startAt, dur, wave = 'square', vol = 0.15) {
  const c    = getCtx();
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(freq, startAt);
  gain.gain.setValueAtTime(0.001, startAt);
  gain.gain.linearRampToValueAtTime(vol, startAt + 0.01);
  gain.gain.setValueAtTime(vol, startAt + dur * 0.65);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + dur * 0.95);
  osc.connect(gain);
  gain.connect(_curGain);
  osc.start(startAt);
  osc.stop(startAt + dur);
}

function playKick(startAt) {
  const c    = getCtx();
  const osc  = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(160, startAt);
  osc.frequency.exponentialRampToValueAtTime(40, startAt + 0.12);
  gain.gain.setValueAtTime(0.4, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.14);
  osc.connect(gain);
  gain.connect(_curGain);
  osc.start(startAt);
  osc.stop(startAt + 0.15);
}

function playHat(startAt) {
  const c    = getCtx();
  const size = Math.ceil(c.sampleRate * 0.04);
  const buf  = c.createBuffer(1, size, c.sampleRate);
  const d    = buf.getChannelData(0);
  for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
  const src  = c.createBufferSource();
  const flt  = c.createBiquadFilter();
  flt.type = 'highpass';
  flt.frequency.value = 7000;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.06, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.04);
  src.buffer = buf;
  src.connect(flt);
  flt.connect(gain);
  gain.connect(_curGain);
  src.start(startAt);
  src.stop(startAt + 0.05);
}

function playSnare(startAt) {
  const c    = getCtx();
  const size = Math.ceil(c.sampleRate * 0.07);
  const buf  = c.createBuffer(1, size, c.sampleRate);
  const d    = buf.getChannelData(0);
  for (let i = 0; i < size; i++) d[i] = Math.random() * 2 - 1;
  const src  = c.createBufferSource();
  const flt  = c.createBiquadFilter();
  flt.type = 'bandpass';
  flt.frequency.value = 1500;
  flt.Q.value = 0.5;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.18, startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, startAt + 0.07);
  src.buffer = buf;
  src.connect(flt);
  flt.connect(gain);
  gain.connect(_curGain);
  src.start(startAt);
  src.stop(startAt + 0.08);
}

// ---- ループスケジューラー ----
function scheduleLoop(trackId, sid) {
  const track = TRACKS[trackId];
  // セッションIDが変わっていたら即終了（旧セッションのコールバックを無視）
  if (!track || _current !== trackId || sid !== _sessionId) return;

  const c       = getCtx();
  const beat    = 60 / track.bpm;
  const startAt = Math.max(c.currentTime + 0.02, _loopEndAt);

  // メロディー (square wave) → _curGain（この時点の参照が使われる）
  let t = startAt;
  for (const [freq, beats] of track.melody) {
    const dur = beats * beat;
    if (freq > 0) playTone(freq, t, dur, 'square', 0.14);
    t += dur;
  }
  const melodyEnd = t;

  // ベース (triangle wave)
  t = startAt;
  for (const [freq, beats] of track.bass) {
    const dur = beats * beat;
    if (freq > 0) playTone(freq, t, dur * 0.82, 'triangle', 0.10);
    t += dur;
  }

  // ドラム
  if (track.drums) {
    t = startAt;
    for (const [type, beats] of track.drums) {
      const dur = beats * beat;
      if (type === 'k') playKick(t);
      else if (type === 'h') playHat(t);
      else if (type === 's') playSnare(t);
      t += dur;
    }
  }

  _loopEndAt = melodyEnd;
  const delay = (melodyEnd - c.currentTime - 0.08) * 1000;
  _loopTimer = setTimeout(() => scheduleLoop(trackId, sid), Math.max(0, delay));
}

// ---- Public API ----

/** 指定トラックを再生（同じトラックなら何もしない）*/
export function play(trackId) {
  if (!TRACKS[trackId]) return;
  if (_current === trackId) return;

  _current = trackId;
  _sessionId++;
  const sid = _sessionId;
  clearTimeout(_loopTimer);
  _loopEndAt = 0;

  const c = getCtx();

  // 旧セッションのGainNodeをフェードアウト → 切断
  // ※ 旧GainNodeにつながった既スケジュール済みオシレーターはここで無音になる
  if (_curGain) {
    const oldGain = _curGain;
    oldGain.gain.cancelScheduledValues(c.currentTime);
    oldGain.gain.setValueAtTime(oldGain.gain.value, c.currentTime);
    oldGain.gain.linearRampToValueAtTime(0, c.currentTime + 0.25);
    setTimeout(() => { try { oldGain.disconnect(); } catch (_) {} }, 400);
  }

  // 新セッション用GainNodeを作成（新しい音はここへ接続される）
  _curGain = c.createGain();
  _curGain.gain.setValueAtTime(0, c.currentTime);
  _curGain.gain.linearRampToValueAtTime(_vol, c.currentTime + 0.45);
  _curGain.connect(_master);

  scheduleLoop(trackId, sid);
}

/** BGMを停止 */
export function stop() {
  _current = null;
  _sessionId++;
  clearTimeout(_loopTimer);
  if (!_curGain) return;
  const c = getCtx();
  const old = _curGain;
  old.gain.cancelScheduledValues(c.currentTime);
  old.gain.setValueAtTime(old.gain.value, c.currentTime);
  old.gain.linearRampToValueAtTime(0, c.currentTime + 0.35);
  setTimeout(() => { try { old.disconnect(); } catch (_) {} }, 500);
  _curGain = null;
}

/** 音量設定 (0.0〜1.0) */
export function setVolume(v) {
  _vol = Math.max(0, Math.min(1, v));
  if (!_master) return;
  _master.gain.setValueAtTime(_vol, getCtx().currentTime);
}

export function getVolume()    { return _vol; }
export function currentTrack() { return _current; }

/**
 * MutationObserver で .screen.active の変化を監視し
 * 画面切替時に対応BGMへ自動フェード切替
 */
export function initBgmObserver() {
  let lastScreenId = null;
  const obs = new MutationObserver(() => {
    const active = document.querySelector('.screen.active');
    if (!active || active.id === lastScreenId) return;
    lastScreenId = active.id;
    const trackId = screenToBgm(active.id);
    if (trackId) play(trackId);
  });
  document.querySelectorAll('.screen').forEach(el => {
    obs.observe(el, { attributes: true, attributeFilter: ['class'] });
  });
}
