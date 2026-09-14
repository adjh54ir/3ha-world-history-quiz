source "https://rubygems.org"

# Fastlane — iOS/Android 빌드·배포 자동화
gem "fastlane"
# Expo prebuild 후 iOS Pods 설치용
gem "cocoapods"

# fastlane 플러그인 묶음 (fastlane/Pluginfile)
plugins_path = File.join(File.dirname(__FILE__), "fastlane", "Pluginfile")
eval_gemfile(plugins_path) if File.exist?(plugins_path)
