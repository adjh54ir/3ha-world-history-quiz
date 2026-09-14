module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            // four-idioms 호환: react-native-dotenv 의 @env 를 Expo env 호환 모듈로 매핑
            "@env": "./src/const/EnvCompat",
          },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      // react-native-reanimated 플러그인은 반드시 마지막에 위치
      "react-native-reanimated/plugin",
    ],
  };
};
