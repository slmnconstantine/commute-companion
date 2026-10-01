const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (
      moduleName === '@maplibre/maplibre-react-native' ||
      moduleName.startsWith('@maplibre/maplibre-react-native/')
    ) {
      return {
        filePath: path.resolve(__dirname, 'src/mocks/maplibre-web.tsx'),
        type: 'sourceFile',
      };
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
