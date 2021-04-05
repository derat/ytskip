// Copyright 2020 Daniel Erat. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Delay before looking for the player again when it's missing.
const findPlayerRetryMs = 200;

// Minimum duration between evaluating the page state due to DOM mutations.
const mutationDebounceMs = 100;

// Clicks things.
class Clicker {
  constructor() {
    this.lastCheckTime = 0;
    this.checkTimeoutId = undefined;

    this.player = undefined;
    this.playerObserver = new MutationObserver((m) => this.onPlayerMutation());

    // Observe the main ytd-app element for page changes.
    this.app = document.querySelector("ytd-app");
    if (!this.app) throw new Error("Failed to find ytd-app element");
    this.appObserver = new MutationObserver((m) => this.onAppMutation());
    this.appObserver.observe(this.app, {
      attributes: true,
      atributeFilter: ["is-watch-page"],
    });
    console.log("Observing app for changes");

    // Handle a watch page being loaded directly.
    window.setTimeout(() => this.onAppMutation());
  }

  // Handles mutations to the ytd-app element (used to detect navigation to or
  // from a /watch page).
  onAppMutation() {
    const player = document.querySelector("ytd-player");
    if (player && this.player === player) return; // already watching player

    this.player = player;
    this.playerObserver.disconnect();
    if (this.checkTimeoutId !== undefined) {
      window.clearTimeout(this.checkTimeoutId);
      this.checkTimeoutId = undefined;
    }

    if (this.player) {
      console.log("Observing player for changes");
      this.playerObserver.observe(this.player, {
        childList: true,
        subtree: true,
      });
      this.onPlayerMutation();
    } else if (this.app.getAttribute("is-watch-page") !== null) {
      // It seems like there's a race sometimes where ytd-app exists but
      // ytd-player doesn't (especially when loading a tab in the background?).
      // Look again in a bit.
      console.log("Didn't find player yet");
      window.setTimeout(() => this.onAppMutation(), findPlayerRetryMs);
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

  // Checks for skip/close buttons and clicks them.
  check() {
    for (const sel of [
      // Banner ad.
      ".ytp-ad-overlay-close-button",
      // Skip button during video ads.
      ".ytp-ad-skip-button",
      // Subscription promo across bottom of screen.
      "ytd-mealbar-promo-renderer #dismiss-button a",
    ]) {
      const el = this.player.querySelector(sel);
      if (el) {
        console.log(`Clicking ${sel}`);
        el.click();
      }
    }

    if (
      document.querySelector(".ytp-ad-preview-container") &&
      !document.querySelector(".ytp-ad-skip-button")
    ) {
      const video = document.querySelector("video.video-stream");
      if (video) {
        console.log("Jumping to end of video");
        video.currentTime = video.duration;
      }
    }

    this.lastCheckTime = new Date().getTime();
  }
}

document.addEventListener("DOMContentLoaded", () => new Clicker());
