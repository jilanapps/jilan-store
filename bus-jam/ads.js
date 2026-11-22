/* Jilan Bus Jam - ad hook points.
   v1.0 has NO ads and NO ad SDK. These hooks are deliberate no-ops so a later version can
   plug in an approved AdMob integration (via the Android shell) without touching game code.
   - showInterstitial(): called after every 3rd completed level. v1: does nothing.
   - showRewarded(kind, onReward): kind = 'undo' | 'spot'. v1: grants the reward at once (no ad).
   - Banner: put a banner view inside #adBanner; the area collapses while it is empty. */
(function () {
  'use strict';
  window.JBJ_ads = window.JBJ_ads || {
    enabled: false,
    showInterstitial: function () { /* no-op in v1 */ },
    showRewarded: function (kind, onReward) { if (typeof onReward === 'function') onReward(true); },
    banner: document.getElementById('adBanner')
  };
})();
