// Copyright 2020 Daniel Erat. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Minimum duration between evaluating the page state due to DOM mutations.
const MUTATION_DEBOUNCE_MS = 100;

// Clicks things.
class Clicker {
  lastCheckTime = 0; // last time check() was called
  checkTimeoutId = null; // for check()

  app = document.querySelector('ytd-app');
  appObserver = new MutationObserver(() => this.onAppMutation());

  constructor() {
    // Observe the main ytd-app element for changes to the document structure.
    if (!this.app) throw new Error('Failed to find ytd-app');
    this.appObserver.observe(this.app, { childList: true, subtree: true });
    console.log('Observing app');

    // Handle initial state.
    window.setTimeout(() => this.onAppMutation());
  }

  // Handles changes to the ytd-app element's child list.
  onAppMutation() {
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

  // Clicks skip/close buttons and hides elements.
  check() {
    // Hide promotions.
    for (const sel of [
      // Ads to right of video info on watch page.
      'ytd-action-companion-ad-renderer',
      // Banner ad displayed over bottom of video.
      '.ytp-ad-module',
      // Premium banner at top of home page.
      'ytd-banner-promo-renderer',
      // Promoted videos on home page.
      'ytd-display-ad-renderer',
      // Ads above video title and info on watch page.
      'ytd-engagement-panel-section-list-renderer',
      // Subscription promo across bottom of screen.
      'ytd-mealbar-promo-renderer',
      // Promoted search results.
      'ytd-promoted-sparkles-text-search-renderer',
      // Promoted suggested videos at bottom of watch page.
      'ytd-promoted-sparkles-web-renderer',
      // Promoted videos in search page.
      'ytd-promoted-video-renderer',
    ]) {
      document.querySelectorAll(sel).forEach((e) => {
        if (e.style.display === 'none') return;
        console.log(`Hiding ${sel}`);
        e.style.display = 'none';
      });
    }

    // Click buttons.
    for (const sel of [
      // Skip button during video ads.
      '.ytp-ad-skip-button',
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

document.addEventListener('DOMContentLoaded', () => new Clicker());
