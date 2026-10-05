const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Drizzle emits .sql migration files that babel-plugin-inline-import turns
// into strings — Metro has to treat them as source, not assets.
config.resolver.sourceExts.push('sql');


module.exports = withNativeWind(config, { input: './src/global.css' });
