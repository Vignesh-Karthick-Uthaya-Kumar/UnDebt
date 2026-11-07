// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Force standard transformer for web to bypass Hermes MIME type errors
config.transformer.unstable_transformProfile = 'default';

module.exports = config;