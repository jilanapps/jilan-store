// Jilan Reels v1.0 — configuration (ONE file; every module reads from here).
//
// Firebase + Cloudinary values are REAL (filled 2026-11-24).
// Only JR_GOOGLE_CLIENT_ID is still a PLACEHOLDER (see SETUP.md). Until it
// is filled, Google sign-in inside the Android app is disabled; username +
// password sign-in and Google in a normal browser (popup) still work.
//
// None of these are secrets: Firebase web config, the Cloudinary cloud
// name, the unsigned preset name and the OAuth client id are all public
// identifiers that ship inside every web app.

window.JR_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAlFQNdVhCOVbuEsb6uZ7HGzBThJ9-IJ9E",
  authDomain: "jilan-reels.firebaseapp.com",
  projectId: "jilan-reels",
  storageBucket: "jilan-reels.firebasestorage.app",
  messagingSenderId: "922938905904",
  appId: "1:922938905904:web:2bc40ddd30c4f2fdbde4f5"
};

window.JR_CLOUDINARY = {
  cloudName: "rw1wri3w",               // REAL (account jilanappsofficial, free plan)
  uploadPreset: "jilan_reels_unsigned" // REAL unsigned preset: folder jilan-reels,
                                       // formats mp4/mov/webm/jpg/png, NO size limit
                                       // in the preset -> app enforces size/duration
};

// Google sign-in inside the Android app (manual OAuth in the system browser).
// Web OAuth client id (Google Cloud console of project jilan-reels ->
// APIs & Services -> Credentials -> "Web client (auto created by Google Service)").
window.JR_GOOGLE_CLIENT_ID = "922938905904-e5rerggr78u6jlhibfpnvtlan4sld6h4.apps.googleusercontent.com";

// Public URL where this web app is hosted (share links + OAuth return page).
window.JR_HOME_URL = "https://jilanapps.github.io/jilan-store/jilan-reels/";
