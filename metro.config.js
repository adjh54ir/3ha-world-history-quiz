const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// 효과음(.ogg) 에셋 번들 지원 (Metro 기본 assetExts에 ogg가 없음)
if (!config.resolver.assetExts.includes('ogg')) {
	config.resolver.assetExts.push('ogg');
}

module.exports = config;
