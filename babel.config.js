module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // Lets Drizzle migrations be imported as strings: `import m from './0000_x.sql'`
      ['inline-import', { extensions: ['.sql'] }],
    ],
    // NOTE: react-native-worklets/plugin is added automatically by
    // babel-preset-expo when the package is installed. Adding it here would
    // apply it twice.
  };
};
