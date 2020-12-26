// Copyright 2020 Daniel Erat. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Minimum duration between evaluating the page state due to DOM mutations.
const mutationDebounceMs = 100;

// Clicks things.
class Clicker {
  constructor() {
    this.lastCheckTime = 0;
    this.checkTimeoutId = undefined;

    this.player = undefined;
    this.playerObserver = new MutationObserver(m => this.onPlayerMutation());

    // Observe the main ytd-app element for page changes.
    this.app = document.querySelector('ytd-app');
    if (!this.app) throw new Error('Failed to find ytd-app element');
    this.appObserver = new MutationObserver(m => this.onAppMutation());
    this.appObserver.observe(this.app, {
      attributes: true,
      atributeFilter: ['is-watch-page'],
    });

    // Handle a watch page being loaded directly.
    this.onAppMutation();
  }

  // Handles mutations to the ytd-app element (used to detect navigation to or
  // from a /watch page).
  onAppMutation() {
    const player = document.querySelector('ytd-player');
    if (player && this.player === player) return; // already watching player

    this.player = player;
    this.playerObserver.disconnect();
    if (this.checkTimeoutId !== undefined) {
      window.clearTimeout(this.checkTimeoutId);
      this.checkTimeoutId = undefined;
    }

    if (this.player) {
      console.log('Observing player for changes');
      this.playerObserver.observe(this.player, {
        childList: true,
        subtree: true,
      });
    }
  }

  // Handles mutations to the ytd-player element (used to detect buttons being
  // added).
  onPlayerMutation() {
    if (this.checkTimeoutId !== undefined) return; // already queued

    const elapsed = new Date().getTime() - this.lastCheckTime;
    if (elapsed >= mutationDebounceMs) {
      this.check();
    } else {
      this.checkTimeoutId = window.setTimeout(() => {
        this.checkTimeoutId = undefined;
        this.check();
      }, mutationDebounceMs - elapsed);
    }
  }

  // Checks for skip/close buttons.
  check() {
    for (const sel of ['.ytp-ad-overlay-close-button', '.ytp-ad-skip-button']) {
      const el = this.player.querySelector(sel);
      if (el) {
        console.log(`Clicking ${sel}`);
        el.click();
      }
    }

    if (document.querySelector('.ytp-ad-preview-container')) {
      const video = document.querySelector('video.video-stream');
      if (video) {
        console.log('Jumping to end of video');
        video.currentTime = video.duration;
      }
    }

    this.lastCheckTime = new Date().getTime();
  }
}

document.addEventListener('DOMContentLoaded', () => new Clicker());
