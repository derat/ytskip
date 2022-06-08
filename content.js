// Copyright 2020 Daniel Erat. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Minimum duration between evaluating the page state due to DOM mutations.
const MUTATION_DEBOUNCE_MS = 100;

// Clicks things.
class Clicker {
  lastCheckTime = 0; // last time check() as called
  checkTimeoutId = null; // for check()

  app = document.querySelector('ytd-app');
  appObserver = new MutationObserver(() => this.onAppMutation());

  progress = null; // initialized by onAppMutation()
  progressObserver = new MutationObserver(() => {
    // The Navigation API (https://www.youtube.com/watch?v=cgKUMRPAliw) doesn't
    // seem to help here, since the 'navigate' event fires before the page
    // structure has been changed. Watching for the progress bar being hidden is
    // the best way I've found to detect the completion of internal navigations.
    if (this.progress.hasAttribute('hidden')) this.handleNavigation();
  });

  players = new Set(); // ytd-player elements currently being observed
  playerObserver = new MutationObserver(() => this.onPlayerMutation());

  constructor() {
    // Observe the main ytd-app element for the progress element showing up.
    if (!this.app) throw new Error('Failed to find ytd-app');
    this.appObserver.observe(this.app, { childList: true });
    console.log('Observing app');

    // Handle the progress element already being there.
    window.setTimeout(() => {
      this.onAppMutation();
      this.handleNavigation();
    });
  }

  // Handles changes to the ytd-app element's child list.
  onAppMutation() {
    if (this.progress) return;

    this.progress = document.querySelector('yt-page-navigation-progress');
    if (this.progress) {
      console.log('Observing yt-page-navigation-progress');
      this.progressObserver.observe(this.progress, {
        attributes: true,
        attributeFilter: ['hidden'],
      });
      this.appObserver.disconnect();
    }
  }

  // Handles internal navigations.
  handleNavigation() {
    // Hide various promotions.
    for (const sel of [
      // Premium banner at top of home page.
      'ytd-banner-promo-renderer',
      // Promoted videos on home page.
      'ytd-display-ad-renderer',
      // Promoted search results.
      'ytd-promoted-sparkles-text-search-renderer',
      // Promoted suggested videos at bottom of watch page.
      'ytd-promoted-sparkles-web-renderer',
    ]) {
      document.querySelectorAll(sel).forEach((e) => {
        if (e.style.display === 'none') return;
        console.log(`Hiding ${sel}`);
        e.style.display = 'none';
      });
    }

    // Check for ytd-player elements being added or removed.
    const players = new Set([...document.querySelectorAll('ytd-player')]);
    if (!players.size || !setsEqual(players, this.players)) {
      this.playerObserver.disconnect();
      this.players = players;
      this.players.forEach((p) =>
        this.playerObserver.observe(p, {
          childList: true,
          subtree: true,
        })
      );
      if (this.checkTimeoutId) {
        window.clearTimeout(this.checkTimeoutId);
        this.checkTimeoutId = null;
      }
      if (this.players.size) {
        console.log(`Observing ${this.players.size} player(s)`);
        this.onPlayerMutation();
      }
    }
  }

  // Handles mutations to ytd-player elements' subtrees.
  onPlayerMutation() {
    if (this.checkTimeoutId) return; // already queued

    const elapsed = new Date().getTime() - this.lastCheckTime;
    if (elapsed >= MUTATION_DEBOUNCE_MS) {
      this.check();
    } else {
      this.checkTimeoutId = window.setTimeout(() => {
        this.checkTimeoutId = null;
        this.check();
      }, MUTATION_DEBOUNCE_MS - elapsed);
    }
  }

  // Clicks skip/close buttons.
  check() {
    for (const sel of [
      // Banner ad.
      '.ytp-ad-overlay-close-button',
      // Skip button during video ads.
      '.ytp-ad-skip-button',
      // Subscription promo across bottom of screen.
      '.ytd-mealbar-promo-renderer #dismiss-button a',
    ]) {
      document.querySelectorAll(sel).forEach((el) => {
        console.log(`Clicking ${sel}`);
        el.click();
      });
    }

    if (
      document.querySelector('.ytp-ad-preview-container') &&
      !document.querySelector('.ytp-ad-skip-button')
    ) {
      const video = document.querySelector('video.video-stream');
      if (video) {
        console.log('Jumping to end of video');
        video.currentTime = video.duration;
      }
    }

    this.lastCheckTime = new Date().getTime();
  }
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

document.addEventListener('DOMContentLoaded', () => new Clicker());
