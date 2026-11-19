/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { ZensorEngine } from './game/ZensorEngine';
import { BASE_GRAINS_PER_COLOR, MAX_LEVEL } from './game/constants';
import type { CompletionStats, GameHudState } from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<ZensorEngine | null>(null);
  const vignetteTimeoutRef = useRef<number | null>(null);

  const [hud, setHud] = useState<GameHudState>({
    activeLevel: 1,
    maxLevel: MAX_LEVEL,
    sortedWhite: 0,
    sortedBlack: 0,
    targetPerColor: BASE_GRAINS_PER_COLOR,
    remaining: BASE_GRAINS_PER_COLOR * 2,
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vignetteActive, setVignetteActive] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [completionStats, setCompletionStats] = useState<CompletionStats | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const zensor = new ZensorEngine(canvas, {
      onHudUpdate: (nextHud) => {
        setHud(nextHud);
      },
      onMistake: () => {
        setVignetteActive(true);
        if (vignetteTimeoutRef.current !== null) {
          window.clearTimeout(vignetteTimeoutRef.current);
        }
        vignetteTimeoutRef.current = window.setTimeout(() => {
          setVignetteActive(false);
          vignetteTimeoutRef.current = null;
        }, 220);
      },
      onComplete: (stats) => {
        setCompletionStats(stats);
      },
    });

    engineRef.current = zensor;

    return () => {
      if (vignetteTimeoutRef.current !== null) {
        window.clearTimeout(vignetteTimeoutRef.current);
        vignetteTimeoutRef.current = null;
      }
      zensor.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showResetModal) {
        setShowResetModal(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [showResetModal]);

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    engineRef.current?.setSoundEnabled(next);
  };

  const handleConfirmReset = () => {
    setShowResetModal(false);
    setCompletionStats(null);
    engineRef.current?.resetAllProgress();
  };

  const handlePlayAgain = () => {
    setCompletionStats(null);
    engineRef.current?.startNextOrReplayLevel();
  };

  return (
    <main
      id="stage"
      onContextMenu={(e) => e.preventDefault()}
      onSelectCapture={(e) => e.preventDefault()}
    >
      <canvas ref={canvasRef} id="world" aria-label="Zen rice sorting tabletop" />
      <div
        id="error-vignette"
        className={vignetteActive ? 'active' : undefined}
        aria-hidden="true"
      />

      {/* Quiet Top HUD */}
      <header className="hud-header">
        <div className="brand">
          <h1 className="brand-title">Zensor</h1>
          <span id="mound-indicator" className="mound-indicator">
            Mound {hud.activeLevel} / {hud.maxLevel}
          </span>
        </div>

        <div className="hud-counters" aria-live="polite">
          <span className="counter-item">
            <span className="grain-swatch white" aria-hidden="true" />
            <span>
              White <strong id="count-white">{hud.sortedWhite}</strong>/
              <span id="target-white">{hud.targetPerColor}</span>
            </span>
          </span>
          <span className="separator" aria-hidden="true">
            ·
          </span>
          <span className="counter-item">
            <span className="grain-swatch black" aria-hidden="true" />
            <span>
              Black <strong id="count-black">{hud.sortedBlack}</strong>/
              <span id="target-black">{hud.targetPerColor}</span>
            </span>
          </span>
          <span className="separator" aria-hidden="true">
            ·
          </span>
          <span>
            Remaining <strong id="count-remaining">{hud.remaining}</strong>
          </span>
        </div>

        <div className="hud-actions">
          <button id="btn-sound" className="btn" type="button" onClick={handleToggleSound}>
            {soundEnabled ? 'Sound On' : 'Sound Off'}
          </button>
          <button
            id="btn-reset"
            className="btn"
            type="button"
            title="Reset all levels and start from Mound 1"
            onClick={() => setShowResetModal(true)}
          >
            Reset
          </button>
        </div>
      </header>

      {/* Reset Confirmation Modal */}
      <section
        id="reset-overlay"
        className={`completion-overlay${showResetModal ? ' visible' : ''}`}
        aria-modal="true"
        role="dialog"
        aria-labelledby="reset-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowResetModal(false);
          }
        }}
      >
        <div className="completion-card">
          <h2 id="reset-title" className="completion-title">
            Reset All Levels?
          </h2>
          <p className="completion-body">
            This will clear your saved level progress and start fresh from Mound 1.
          </p>
          <div className="modal-actions">
            <button
              id="btn-reset-cancel"
              className="btn"
              type="button"
              onClick={() => setShowResetModal(false)}
            >
              Cancel
            </button>
            <button
              id="btn-reset-confirm"
              className="btn btn-primary"
              type="button"
              onClick={handleConfirmReset}
            >
              Accept &amp; Reset
            </button>
          </div>
        </div>
      </section>

      {/* Completion Modal */}
      <section
        id="completion-overlay"
        className={`completion-overlay${completionStats ? ' visible' : ''}`}
        aria-modal="true"
        role="dialog"
        aria-labelledby="completion-title"
      >
        <div className="completion-card">
          <h2 id="completion-title" className="completion-title">
            Stillness Achieved
          </h2>
          <p id="completion-body" className="completion-body">
            {completionStats
              ? `All ${completionStats.totalGrains} grains from Mound ${completionStats.finishedLevel} have found their place. Each bowl rests balanced on the counter.`
              : ''}
          </p>
          <div className="completion-stats">
            <span id="stat-time">Time {completionStats?.timeFormatted ?? '0:00'}</span>
            <span aria-hidden="true">·</span>
            <span id="stat-accuracy">Accuracy {completionStats?.accuracy ?? 100}%</span>
          </div>
          <button
            id="btn-play-again"
            className="btn btn-primary"
            type="button"
            onClick={handlePlayAgain}
          >
            {completionStats?.wasMaxLevel ? 'Play Max Mound Again' : 'Next Mound (+10%)'}
          </button>
        </div>
      </section>
    </main>
  );
}
