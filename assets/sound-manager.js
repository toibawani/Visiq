// Sound manager for the simulations.
// Wraps window.VisiqAudio so sketches can call the higher-level helpers they
// expect (startAmbientLoop / playCosmicHum / playSuccess) instead of the raw
// Web Audio API. Honors VisiqAudio.muted and ensures the AudioContext is ready
// before playing, which also satisfies the browser's user-gesture autoplay gate.

(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  var A = window.VisiqAudio;
  // Defensive alias if visiq-audio.js hasn't loaded the full API yet.
  if (!A) {
    console.warn('[sound-manager] VisiqAudio not available; audio features disabled.');
  }

  var _activeNodes = [];
  var _loop = null;
  var _loopNode = null;

  function track(node) {
    if (node) _activeNodes.push(node);
    return node;
  }

  function stopAmbientLoop() {
    if (_loop) {
      clearInterval(_loop);
      _loop = null;
    }
    if (_loopNode) {
      try { _loopNode.osc.stop(); } catch { /* already stopped */ }
      _loopNode = null;
    }
  }

  function startAmbientLoop(label, freq) {
    stopAmbientLoop();
    if (!A || (_muted(A))) return;

    A.ensureContext().catch(function () {
      /* context blocked until user gesture — harmless */
      return null;
    });

    // Sustain a low hum for the ambient layer.
    var node = A.createPitchNode(parseFloat(freq) || 110, 'sine', 0.06);
    if (!node) {
      // Muted or context unavailable; schedule a no-op loop so the sim still
      // behaves deterministically (no throw on subsequent calls).
      _loop = setInterval(function () {}, 1000);
      return;
    }
    _loopNode = track(node);

    // Gentle slow drift in frequency so the pad feels alive, not static.
    _loop = setInterval(function () {
      if (!_loopNode) return;
      var drift = 110 + (Math.random() - 0.5) * 14;
      try { _loopNode.osc.frequency.setValueAtTime(drift, _loopNode.ctx.currentTime); } catch { /* non-fatal drift */ }
    }, 1500);
  }

  function playCosmicHum(freq, vol) {
    if (!A) return;
    A.playTone(parseFloat(freq) || 220, 1.2, (parseFloat(vol) || 0.15) * 0.1, 'sine').catch(function () {});
  }

  function playSuccess() {
    if (!A) return;
    var ctx = A.getContext();
    if (!ctx) {
      A.ensureContext().catch(function () { return null; });
    }
    // Two-tone rising "success" jig.
    A.playTone(440, 0.25, 0.1, 'sine').catch(function () {});
    setTimeout(function () {
      A.playTone(660, 0.35, 0.12, 'sine').catch(function () {});
    }, 260);
  }

  function dispose() {
    stopAmbientLoop();
    _activeNodes.forEach(function (n) {
      if (!n) return;
      try { n.osc.stop(); } catch { /* noop */ }
      if (n.gain) { try { n.gain.disconnect(); } catch { /* noop */ } }
    });
    _activeNodes = [];
  }

  function _muted(api) {
    try { return Boolean(api.muted); } catch { return false; }
  }

  window.soundManager = {
    startAmbientLoop: startAmbientLoop,
    stopAmbientLoop: stopAmbientLoop,
    playCosmicHum: playCosmicHum,
    playSuccess: playSuccess,
    dispose: dispose
  };
})();
