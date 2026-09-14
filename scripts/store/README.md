# 스토어 그래픽 이미지

`feature-graphic.html` 을 헤드리스 크롬으로 찍어 구글 플레이 그래픽 이미지(1024 x 500)를 만든다.
디자인을 고칠 일이 이미지 편집기가 아니라 CSS 한 줄로 끝나고, 크기가 어긋날 일이 없다.

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --hide-scrollbars \
  --force-device-scale-factor=1 --allow-file-access-from-files \
  --window-size=1024,500 \
  --screenshot="fastlane/metadata/android/ko-KR/images/featureGraphic.png" \
  "file://$PWD/scripts/store/feature-graphic.html"
```

결과물: `fastlane/metadata/android/ko-KR/images/featureGraphic.png`
(`fastlane supply` 가 이 경로를 그대로 읽어 올린다)

## 주의

- `--window-size` 가 곧 출력 크기다. 1024 x 500 에서 벗어나면 플레이 콘솔이 반려한다.
- 플레이 콘솔은 기기에 따라 좌우를 잘라 보여 준다. 글자·버튼은 가장자리에서 64px 안쪽에 둔다.
- 구글 공식 "Google Play에서 다운로드" **배지 이미지**는 그래픽 이미지에 넣을 수 없다.
  그래서 배지 대신 앱 메인 그린 버튼 + 안내 문구로 같은 느낌만 냈다.
- 캐릭터는 `src/assets/mainIcon.webp` 를 그대로 읽는다. 이 파일을 옮기면 그림이 빈다.
  아트워크 배경(연두 #B4CEAC)을 지울 도구가 없어 원형 프레임으로 감싸 배경째 살렸다.
