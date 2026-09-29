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
      // Reanimated 4: worklets 플러그인 사용 (반드시 마지막에 위치)
      "react-native-worklets/plugin",
    ],
    env: {
      // 운영 빌드: 모든 console.* 호출 제거 (log/warn/error 전부)
      production: {
        plugins: [["transform-remove-console", { exclude: [] }]],
      },
    },
  };
};
