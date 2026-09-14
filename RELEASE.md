# 출시 가이드 — 한국어 상식 퀴즈 (Google Play · App Store 통합)

이 문서 하나로 양대 스토어 출시에 필요한 모든 값·절차·점검 항목을 다룹니다.
기존 `STORE_ANDROID.md` / `STORE_IOS.md` / `IAP_SETUP.md` / `RELEASE_CHECKLIST.md` / `fastlane.md` 를 통합한 문서입니다.

- 앱 이름: **한국어 상식 퀴즈**
- 패키지 / 번들 ID: `com.tha.koreaquiz` (Android·iOS 동일)
- 버전: `1.0.0` — 단일 출처는 `app.json`의 `expo.version`
- 수록 문항(내부 기준): 메인 10,896 · 서브 퀴즈 428 = **11,324** — 근거는 1-2
  (스토어 문구에서는 총량을 헤드라인으로 쓰지 않습니다. 1-2 하단 참고)
- 문의 · 지원 이메일: `adjh54ir@gmail.com`
- 저작권 표기: `2026 EcodeLab`
- 문서 최종 검증일: **2026-08-15** (코드·설정 실측 기준)

---

## 0. 프로젝트 식별 정보 (콘솔 등록 시 그대로 사용)

| 항목 | 값 | 출처 |
| --- | --- | --- |
| Expo slug | `3ha-korean-quiz` | `app.json` |
| Expo owner | `ecodelab` | `app.json` |
| EAS projectId | `4125cad1-b423-4398-9683-d676ee94bbf0` | `app.json > extra.eas` |
| EAS Update URL | `https://u.expo.dev/4125cad1-b423-4398-9683-d676ee94bbf0` | `app.json > updates` |
| runtimeVersion | `1.0.0` | `app.json` |
| Apple ID (제출 계정) | `adjh54@naver.com` | `eas.json > submit.production.ios` |
| App Store Connect App ID | `6785401301` | `eas.json` |
| Apple Team ID | `XH6C349554` | `eas.json`, Xcode `DEVELOPMENT_TEAM` |
| iOS 최소 지원 버전 | iOS 15.1 | `IPHONEOS_DEPLOYMENT_TARGET` |
| iOS MARKETING_VERSION / BUILD | `1.0.0` / `1` | Xcode 프로젝트 |
| Android applicationId | `com.tha.koreaquiz` | `android/app/build.gradle` |
| Android versionName / versionCode | `1.0.0` / `1` | `android/app/build.gradle` |
| 버전 코드·빌드 번호 관리 | EAS `appVersionSource: remote` + production `autoIncrement: true` | `eas.json` |
| Play 서비스 계정 키 | `./credentials/google-service-account.json` | `eas.json > submit` |
| Play 제출 트랙 | production (`releaseStatus: draft`), preview는 internal | `eas.json > submit` |
| 지원 언어 | 한국어 `ko` · 영어 `en` · 프랑스어 `fr` | `locales/` |
| 신규 아키텍처 / Hermes | `newArchEnabled=true`, `hermesEnabled=true` | `android/gradle.properties` |
| Expo / RN / React | `expo ~55.0.26`, `react-native 0.83.6`, `react 19.2.0` | `package.json` |
| 환경변수 파일 | `.env`(광고·Supabase·IAP 키 전부) / `.env.production`(`APP_MODE`, `API_URL`만) | 저장소 루트 |
| 환경변수 접근 | `@env` → `src/const/EnvCompat.ts` 별칭 (`babel.config.js`) | `babel.config.js:13` |
| 실제 노출 광고 | AdMob 상단 배너 1종 (전면·보상형·앱오프닝·네이티브 컴포넌트는 미사용) | `AppLayout.tsx:100` |
| 백엔드 | Supabase (랭킹 · 구매 소유권 · 학습 백업) | `supabase/*.sql` |

> ⚠️ **버전 관리 이중화 주의** — `android/app/build.gradle`의 `versionCode 1`은 고정값이고,
> EAS production 프로필은 `autoIncrement`로 원격 버전을 올립니다. 로컬 Gradle 빌드(`yarn build:aab`)로
> AAB를 만들면 versionCode가 항상 1이라 Play 업로드가 거부됩니다. 스토어 제출용은 EAS(`yarn deploy:android`)
> 또는 `yarn fl:and:bumpcode` 후 빌드하세요.

### 서명 (Android)

| 항목 | 값 |
| --- | --- |
| 키스토어 파일 | `android/gradle.properties > RELEASE_STORE_FILE = release.keystore` |
| 키 별칭 | `three-hundred-app` |
| 비밀번호 | `android/gradle.properties`의 `RELEASE_STORE_PASSWORD` / `RELEASE_KEY_PASSWORD` |
| 앱 서명 방식 | Play 앱 서명 사용 |

> ⚠️ 현재 `android/app/` 에는 `debug.keystore`만 있고 `release.keystore`가 없습니다.
> 로컬 릴리즈 빌드를 하려면 키스토어를 배치하거나, EAS 원격 자격증명(`eas credentials`)으로 서명하세요.
> 또한 위 비밀번호가 `gradle.properties`에 평문으로 커밋되어 있습니다. 실제 릴리즈 키를 쓰기 전에
> `.gitignore` 처리 또는 환경변수 주입으로 옮기는 것을 권장합니다.

---

## 1. 공통 준비물

### 1-1. 개인정보처리방침 · 지원 URL (양대 스토어 필수)

| 항목 | 값 |
| --- | --- |
| 개인정보처리방침 URL | `TODO` — 아래 절차로 게시 후 그 주소 입력 |
| 지원 URL (iOS 필수) | 같은 페이지 사용 (문의처 포함) |

앱 안에는 전문이 이미 있습니다(`src/screens/common/setting/TermScreen.tsx`, 설정 탭 > 약관).
콘솔은 **공개 URL**을 요구하므로 같은 내용을 웹에 게시합니다.

1. GitHub Pages(또는 Notion 공개 페이지)에 `privacy.html` 한 장 게시
2. `TermScreen.tsx`의 마크다운 본문을 그대로 옮김
3. 하단에 문의처 `adjh54ir@gmail.com` 포함 → Play "웹사이트", App Store "지원 URL"에도 동일 주소 사용

방침 본문은 2026-08-13에 전면 교체되어 앱 이름이 "한국어 상식 퀴즈"로 맞춰졌고, 사실과 달랐던 위치 정보
수집 문단도 삭제되었습니다. 시행일은 본문 기준 **2026-08-11**입니다. 게시할 웹 페이지도 반드시 최신 본문으로 올리세요.

> ⚠️ 남은 불일치 1건 (2026-08-15 기준 **미조치**) — 방침·약관에 **"인공지능(AI) 기술을 사용한다"** 는 조항이
> 그대로 남아 있습니다: `TermScreen.tsx:36` "## 인공지능", `TermScreen.tsx:223` "## 인공지능(AI) 이용".
> 코드에는 AI SDK·API 호출이 없습니다(OpenAI/Anthropic/Gemini 등 미검출). 사용하지 않는 기능을 수집·처리
> 근거로 적어 두면 양대 스토어의 데이터 선언과 어긋나므로 **두 문단 삭제 후 게시**하세요.

> 참고 — 약관의 "이용자 생성 콘텐츠" 조항은 `본 애플리케이션이 ... 기능을 제공하는 경우`라는 조건부 문장이라
> "사용자 생성 콘텐츠 없음" 선언과 충돌하지 않습니다.

> Firebase Analytics/Crashlytics, AdMob, Supabase를 사용하므로 방침은 필수이며,
> 수집 항목·목적·보관 기간·제3자 제공(Google, Supabase)·문의처가 포함되어야 합니다.

### 1-2. 수록 문항 수 (코드 기준 · 스토어 문구의 근거)

`LearnHubService.getDomainList()` / `getSubQuizDomainList()`가 반환하는 `meta.total` 값입니다.
데이터가 늘면 스토어 문구도 함께 갱신하세요.

**메인 주제 (홈 · 학습 · 검색 · 통계에 반영) — 9개**

| 주제 | 문항 수 | 데이터 파일 |
| --- | --- | --- |
| 관용구 | 4,251 | `src/const/data/idiom/ConstIdiomData001~009.ts` |
| 속담 | 3,001 | `src/const/data/ConstProverbData.ts` |
| 사자성어 | 1,458 | `src/const/data/ConstFourIdiomData.ts` |
| 맞춤법 | 1,043 | `src/const/data/ConstSpellingData.ts` |
| 순우리말 | 746 | `src/const/data/ConstPureKoreanData.ts` |
| 달력 속 기념일 | 103 | `src/const/data/sub-quiz/ConstKoreanHolidayData.ts` |
| 한국을 빛낸 100명의 위인들 | 100 | `src/const/data/sub-quiz/ConstGreatFigureQuizData.ts` |
| 촌수 (남) | 97 | `src/const/data/ConstChonMaleData.tsx` |
| 촌수 (여) | 97 | `src/const/data/ConstChonFemaleData.tsx` |
| **메인 합계** | **10,896** | |

**서브 퀴즈 (메인 점수·통계와 분리된 보너스 콘텐츠) — 8개**

| 주제 | 문항 수 | 데이터 파일 |
| --- | --- | --- |
| 넌센스 | 156 | `src/const/data/ConstNonSenseData.ts` |
| 연도로 보는 한국사 | 81 | `src/const/data/sub-quiz/ConstKoreanHistoryTimelineData.ts` |
| 삼국시대 왕 | 39 | `src/const/data/sub-quiz/ConstThreeKingdomsKingQuizData.ts` |
| 세시풍속 | 39 | `src/const/data/sub-quiz/ConstFolkCustomQuizData.ts` |
| 나이 별칭 | 32 | `src/const/data/sub-quiz/ConstAgeNameQuizData.ts` |
| 역대 대통령 | 30 | `src/const/data/sub-quiz/ConstPresidentQuizData.ts` |
| 조선시대 왕 | 27 | `src/const/data/sub-quiz/ConstJoseonKingQuizData.ts` |
| 24절기 | 24 | `src/const/data/sub-quiz/ConstSolarTermQuizData.ts` |
| **서브 합계** | **428** | |

**총 11,324문항** (2026-08-15 실측)

> 주제 구분 기준은 `src/services/LearnHubService.ts`의 `SUB_QUIZ_KEYS` 입니다.
> 현재 값: `president`, `joseon-king`, `three-kingdoms-king`, `nonsense`, `history-timeline`,
> `age-name`, `solar-term`, `folk-custom`. **`holiday`(달력 속 기념일)는 메인 주제로 이동했습니다.**
> 주제 이름과 한 줄 소개도 같은 파일의 `domains` 정의를 그대로 썼습니다.

**재측정 방법** — 데이터가 늘면 아래로 다시 뽑고 스토어 문구를 갱신하세요.

```bash
# 임시 테스트 파일로 실제 total 값을 출력 (측정 후 파일 삭제)
cat > src/__counts.spec.ts <<'EOF'
import LearnHubService from '@/src/services/LearnHubService';
it('counts', () => {
  const f = (d: any) => `${d.title}\t${d.total}`;
  console.log('MAIN\n' + LearnHubService.getDomainList().map(f).join('\n'));
  console.log('SUB\n' + LearnHubService.getSubQuizDomainList().map(f).join('\n'));
});
EOF
npx jest src/__counts.spec.ts; rm src/__counts.spec.ts
```

> 📌 **문구 원칙** — 스토어 카피에서 총 문항 수를 헤드라인으로 쓰지 않습니다. "1만 문항" 같은 수량 강조는
> 경쟁 앱과 구분되지 않고 데이터가 바뀔 때마다 문구·스크린샷을 함께 고쳐야 합니다. 수량은 주제별 목록
> 안에서만 근거로 노출하고, 첫 줄은 "무엇을 얻는가"로 씁니다.

### 1-3. 스크린샷 촬영 가이드 (공통)

권장 구성 6장: 홈 → 카드 학습 → 퀴즈 진행 → 결과/점수 → 내 활동(학습 리포트) → 검색.

> ⚠️ 상단 배너가 **숨겨지는 경로는 아래 7개뿐**입니다(`src/screens/common/layout/AppLayout.tsx`의
> `AD_BLOCKED_ROUTES`, 2026-08-15 실측):
> `/special/shorts`, `/learn/study`, `/special/ranking`, `/special/exam`, `/special/weak-focus`,
> `/special/level-test`, `/special/type-test`.
>
> 즉 **퀴즈 풀이·결과 화면(`/quiz/*`), 주간 리그(`/special/league`), 홈·검색·통계·내 활동에는 배너가 노출됩니다.**
> 배너 없는 컷을 원하면 위 7개 경로 화면을 쓰고, 퀴즈 화면을 촬영할 때는 배너가 함께 찍히는 것을 전제로
> 구도를 잡으세요(광고를 지운 합성 이미지는 리젝 사유).

- 상태 표시줄이 포함되면 실제 기기 시간·배터리가 지저분하게 보이지 않도록 정리합니다.
- 실제 앱에 없는 화면을 합성하면 리젝 사유입니다.

---

## 2. Google Play 출시

Console 경로 표기: `Play Console > 앱 선택 > ...`

### 2-1. 스토어 등록정보

경로: `성장 > 스토어 개요 > 기본 스토어 등록정보`

| 항목 | 제한 | 값 |
| --- | --- | --- |
| 앱 이름 | 30자 | 한국어 상식 퀴즈 |
| 간단한 설명 | 80자 | 아래 블록 |
| 자세한 설명 | 4,000자 | 아래 블록 |

#### 간단한 설명 (80자)

검색 결과와 앱 카드 상단에 노출되는 한 줄 요약입니다. "무료", "최고" 같은 과장 표현이나 이모지 남용은
정책 위반 소지가 있으니 피합니다. 숫자 나열은 눈에 걸리지 않고 데이터가 바뀔 때마다 고쳐야 하므로 쓰지 않습니다.

```
속담·관용구·사자성어부터 맞춤법까지, 매일 한 판씩 푸는 우리말 상식 퀴즈
```

(공백 포함 41자 / 80자)

대안 (A/B 테스트용):

```
오늘 한 판이면 충분해요. 속담·관용구·사자성어·맞춤법을 뜻과 예문까지 익히는 우리말 퀴즈
```

(공백 포함 50자 / 80자)

- 앞 12자가 검색 결과에서 가장 먼저 읽히므로 주제 키워드(속담·관용구·사자성어)를 앞에 둡니다.
- "1만 문항" 류의 수량 강조는 빼되, 자세한 설명 안의 주제별 목록에는 실제 수치를 남겨 근거를 제공합니다.

#### 자세한 설명 (4,000자)

첫 3줄이 "더보기" 이전에 노출되므로 가장 중요한 내용을 위에 배치합니다.
키워드를 부자연스럽게 반복하면 정책 위반이므로 문장 안에 자연스럽게 녹입니다.

```
아는 줄 알았던 속담, 헷갈리는 맞춤법, 뜻은 모르고 쓰던 사자성어.
하루 한 판이면 뜻과 예문, 유래까지 자연스럽게 남습니다.
로그인 없이 바로 시작할 수 있고, 학습 기록은 기기 안에 저장됩니다.

■ 메인 주제
· 관용구 4,251문항 — 일상에 녹아든 우리말 표현을 익혀요
· 속담 3,001문항 — 삶의 지혜가 담긴 우리말 속담
· 사자성어 1,458문항 — 네 글자 한자 속 지혜를 익혀요
· 맞춤법 1,043문항 — 헷갈리는 표기, 정확하게 익혀요
· 순우리말 746문항 — 아름다운 우리말 단어의 뜻을 익혀요
· 달력 속 기념일 — 쉬는 날·기리는 날에 담긴 뜻을 익혀요
· 한국을 빛낸 100명의 위인들 — 시대별 대표 인물 100명을 만나요
· 촌수 (남/여) — 가족 호칭과 촌수를 익혀요

■ 서브 퀴즈 (보너스 콘텐츠)
· 넌센스 — 재치로 푸는 말장난 퀴즈
· 연도로 보는 한국사 — 주요 사건을 시간 순서로 익혀요
· 삼국시대 왕 — 고구려·백제·신라·가야의 왕을 만나요
· 조선시대 왕 — 27왕의 업적과 사건을 맞혀요
· 역대 대통령 — 대한민국 대통령과 시대를 연결해요
· 나이 별칭 — 약관·이립·불혹, 나이를 부르는 옛말
· 24절기 — 입춘부터 대한까지 계절의 마디를 익혀요
· 세시풍속 — 명절마다 무엇을 했는지 알아봐요

■ 학습
· 카드 학습 — 앞면에서 단어를 보고, 넘기면 뜻과 예문을 확인해요
· 숏폼 학습 — 짧게 넘겨 보며 익히는 세로형 카드
· 오늘의 읽을거리 — 우리말 이야기를 읽으며 자연스럽게 익혀요
· 학습 진도 — 주제마다 학습한 카드 수와 남은 카드를 확인해요

■ 퀴즈 모드
· 오늘의 퀴즈 — 매일 새로 준비되는 오늘치 문제
· OX 퀴즈 · 초성 퀴즈 · 빈칸 채우기 · 짝 맞추기
· 데일리 믹스 — 여러 주제를 섞어 한 번에
· 묶음 퀴즈 — 원하는 범위만 골라 집중적으로
· 타임 챌린지 — 제한 시간 안에 콤보를 이어 최고 점수에 도전
· 시험 대비 팩 — KBS한국어능력시험, 공무원 국어, 수능 국어 어휘, 한국사능력검정

■ 복습
· 오답 복습 — 틀린 문제만 모아 다시 풀기
· 즐겨찾기 퀴즈 — 저장해 둔 문제만 골라 다시 풀기
· 약점 집중 코스 — 정답률이 낮은 주제부터 보완
· 보관함 — 공부한 표현을 모아 다시 보기

■ 검색
· 수록된 표현을 한 번에 찾아보기 (서브 퀴즈 주제까지 함께 검색)
· 주제 · 카테고리 · 난이도로 좁혀 보기
· 즐겨찾기만, 오답만 골라 보기

■ 기록과 경쟁
· 내 활동 — 학습 리포트, 주제별 진도, 오늘의 퀴즈·타임 챌린지 기록
· 학습 리포트 — 최근 7일·30일 또는 직접 고른 기간의 학습량과 정답률
· 주제별 진도 — 학습 진도와 퀴즈 진도를 탭으로 나눠 보고, 약한 주제부터 정렬
· 주제별 점수와 등급 — 문제를 풀수록 주제별 캐릭터 단계가 올라갑니다
· 출석체크와 배지 · 배지 도감
· 주간 리그 · 타임 챌린지 랭킹 — 다른 사용자와 점수 겨루기
· 한국어 레벨 테스트 · 한국어 유형 테스트 — 실력과 학습 성향 진단

■ 그 밖에
· 촌수 계산기 — 가족 관계와 호칭을 바로 확인
· 학습 알림 — 원하는 시각에 리마인더
· 학습 기록 백업 — 기기를 바꿔도 진도를 그대로

■ 이런 분께 추천합니다
· 국어 어휘력과 문해력을 다시 다지고 싶은 분
· 사자성어·속담을 뜻과 유래까지 정확히 알고 싶은 분
· 자주 틀리는 맞춤법을 정리하고 싶은 분
· 출퇴근길 자투리 시간에 교양을 쌓고 싶은 분
· 자녀와 함께 우리말 문제를 풀어 보고 싶은 분

■ 안내
· 로그인 없이 모든 기능을 사용할 수 있습니다.
· 학습 기록은 기기 안에 저장됩니다.
· 광고가 포함되어 있으며, 인앱 결제로 광고를 제거할 수 있습니다.
· 문의: adjh54ir@gmail.com
```

### 2-2. 그래픽 애셋

경로: `성장 > 스토어 개요 > 기본 스토어 등록정보 > 그래픽`

| 항목 | 사양 | 필수 | 파일 경로 |
| --- | --- | --- | --- |
| 앱 아이콘 | 512 × 512 PNG (32비트, 알파 포함) | 필수 | `src/assets/play_store_512.png` |
| 그래픽 이미지(피처 그래픽) | 1024 × 500 PNG/JPG | 필수 | `TODO` — 미제작. `assets/main-icon.png` + 앱 이름 + 배경 `#FDEFD6`(adaptiveIcon 배경색)로 제작 |
| 휴대전화 스크린샷 | 2~8장, 16:9 또는 9:16, 각 변 320~3840px | 필수(최소 2장) | `fastlane/metadata/android/ko-KR/images/phoneScreenshots/` — **현재 미생성**(fastlane 폴더에 설정 파일만 있고 이미지 0장) |
| 7·10인치 태블릿 스크린샷 | 최대 8장 | 선택 | 생략 (Android는 태블릿 필수 아님) |
| 프로모션 동영상 | YouTube URL | 선택 | 미사용 (1.0.0 생략) |

### 2-3. 스토어 설정

경로: `성장 > 스토어 개요 > 스토어 설정`

| 항목 | 값 |
| --- | --- |
| 앱 또는 게임 | 앱 |
| 카테고리 | 교육 |
| 태그 | 어휘 학습 / 언어 학습 / 두뇌 트레이닝 / 퀴즈 / 학습 도구 (콘솔 태그 목록에서 가장 가까운 5개) |
| 이메일 주소 (필수) | adjh54ir@gmail.com |
| 전화번호 (선택) | 미입력 (공개 노출되므로 생략) |
| 웹사이트 (선택) | 개인정보처리방침 게시 URL (1-1 참고) |
| 외부 마케팅 수신 동의 | 아니요 |

### 2-4. 앱 콘텐츠 (정책 선언)

경로: `정책 및 프로그램 > 앱 콘텐츠`. 모든 항목을 완료해야 출시 가능.

**앱 액세스 권한**

| 항목 | 값 |
| --- | --- |
| 전체 또는 일부 기능이 제한되는가 | 아니요 — 모든 기능을 로그인 없이 사용 가능 |
| 테스트 계정 필요 여부 | 불필요 |

**광고**

| 항목 | 값 |
| --- | --- |
| 앱에 광고가 포함되어 있나요 | 예 |
| 광고 SDK | Google AdMob (`react-native-google-mobile-ads`) |
| 광고 형식 | **배너만** (2026-08-15 실측) |

> ⚠️ **실측 결과 현재 노출되는 광고는 상단 배너 하나뿐입니다.** `AdmobBannerAd`만 `AppLayout.tsx:100`에서
> 렌더되고, `AdmobFrontAd`(전면)·`AdmobRewardAd`/`AdmobRewardFrontAd`(보상형)·`AdmobAppOpenAd`(앱 오프닝)·
> `AdmobNativeAd`(네이티브)는 `src/screens/common/ads/` 안에만 있고 어떤 화면에서도 임포트되지 않습니다.
> 출시 전에 **① 배너만 유지 → 선언·문구를 배너 기준으로 통일**, 또는 **② 전면/보상형을 실제로 붙인 뒤 선언**
> 중 하나를 정하세요. 지금 상태로 "전면·보상형 포함"이라 선언하면 실제 앱과 어긋납니다.

> `src/screens/common/ads/levelplay/`(`LevelPlayBannerAd.tsx`, `LevelPlayFrontAd.tsx`)와
> `ironsource-mediation` 의존성이 남아 있으나 어떤 화면에서도 임포트되지 않습니다. 실제 노출 SDK는 AdMob
> 하나이므로 AdMob만 선언합니다.

**콘텐츠 등급 (IARC 설문)**

| 항목 | 값 |
| --- | --- |
| 설문 카테고리 | 참고자료, 뉴스 또는 교육용 |
| 폭력 / 성적 콘텐츠 / 비속어 / 약물 | 모두 없음 |
| 사용자 간 상호작용 | 아니요 — 랭킹 닉네임은 앱이 무작위 생성, 자유 입력·채팅 없음 |
| 위치 정보 공유 | 아니요 |
| 디지털 구매 | 예 (광고 제거 인앱 상품) |
| 예상 등급 | 전체 이용가 |

> 랭킹 닉네임은 `src/utils/NicknameUtils.ts` 생성기가 "수식어 + 명사 + #4자리"로 무작위 발급하며 사용자가
> 자유 입력할 수 없습니다(`isGeneratedNickname` 형식 검증). 닉네임 직접 입력을 허용하면 이 문항과 등급을 재산정해야 합니다.

**타겟층 및 콘텐츠**

| 항목 | 값 |
| --- | --- |
| 타겟 연령대 | 16~17세, 18세 이상 |
| 아동에게 어필하는 디자인인가 | 아니요 |
| Google Play 패밀리 정책 적용 | 아니요 |

> 방침·약관이 **만 16세 미만을 대상으로 하지 않는다**고 명시하므로 13~15세를 선택하면 방침과 어긋납니다.
> 만 13세 미만을 포함하면 패밀리 정책이 적용되어 AdMob `tagForChildDirectedTreatment`와 데이터 수집 방식을 함께 바꿔야 합니다.

**데이터 보안 (Data safety)** — 현재 코드 기준 초안

| 데이터 유형 | 수집 | 공유 | 목적 | 필수 여부 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 앱 상호작용(이벤트/화면 조회) | 예 | 예 | 분석 | 선택 | Firebase Analytics |
| 진단(크래시 로그, 성능) | 예 | 예 | 분석, 앱 기능 | 선택 | Firebase Crashlytics |
| 기기 또는 기타 ID (광고 ID) | 예 | 예 | 광고 | 선택 | AdMob + ATT |
| 구매 내역 | 예 | 예 | 앱 기능 | 필수 | 광고 제거 구매 동기화(Supabase) |
| 사용자 ID | 예 | 예 | 앱 기능 | 필수 | 구매 소유권 확인(Supabase) |
| 사용자 생성 콘텐츠(닉네임) | 아니요 | - | - | - | 앱이 무작위 생성하므로 UGC 아님 |

| 항목 | 값 |
| --- | --- |
| 전송 중 암호화 | 예 (HTTPS) |
| 데이터 삭제 요청 방법 제공 | 예 — 이메일 요청(adjh54ir@gmail.com), 방침에 명시됨 |

> 퀴즈 진행 상황·오답노트·즐겨찾기·학습 리포트는 기기 내부(AsyncStorage)에만 저장되며 전송되지 않으므로
> "수집"으로 선언하지 않습니다. 랭킹 점수만 Supabase로 전송되며, 랭킹 참여(닉네임 발급) 시에 한합니다.

**기타 선언** — 정부 앱 / 금융 / 건강 / 뉴스 / COVID-19 접촉 확인 / 독립 보안 검토: 모두 **아니요**.

### 2-5. 권한 선언

| 권한 | 용도 | 별도 선언 |
| --- | --- | --- |
| `POST_NOTIFICATIONS` | 학습 알림(일일 리마인더) | 불필요 |

차단된 권한(`app.json > android.blockedPermissions`): `SCHEDULE_EXACT_ALARM`, `USE_EXACT_ALARM`,
`READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`, `RECORD_AUDIO`.

> 정확한 알람 권한을 **차단했으므로 권한 선언서 제출이 불필요**합니다. 학습 리마인더는
> `src/utils/NotifactionHelper.ts`에서 `AlarmType.SET_AND_ALLOW_WHILE_IDLE`로 예약하며, 설정 시각에서 수 분 오차가 생길 수 있습니다.
> `expo prebuild` 후 `android/app/src/main/AndroidManifest.xml`에 차단 권한이 되살아나지 않았는지 확인하세요.

### 2-6. 출시 트랙 / 릴리스

경로: `출시 > 프로덕션 > 새 버전 만들기`

| 항목 | 값 |
| --- | --- |
| 앱 번들 (.aab) | `build/app.aab` (`yarn deploy:android`) 또는 `yarn fl:and:aab` |
| 버전 이름 | 1.0.0 |
| 버전 코드 | EAS 자동 증가 (`autoIncrement`) |
| 앱 서명 키 | Play 앱 서명 사용 |
| 국가/지역 | 전체 국가·지역 (한국어·영어·프랑스어 등록정보 제공) |
| 단계적 출시 비율 | 20% 시작 → 크래시 없음 확인 후 50% → 100% |

#### 출시 노트 (500자, 언어별)

한국어:

```
첫 출시입니다.

· 메인 주제 — 관용구, 속담, 사자성어, 맞춤법, 순우리말, 달력 속 기념일, 위인, 촌수(남/여)
· 서브 퀴즈 — 넌센스, 한국사 연표, 삼국시대 왕, 조선시대 왕, 역대 대통령, 나이 별칭, 24절기, 세시풍속
· 오늘의 퀴즈, OX·초성·빈칸·짝 맞추기, 데일리 믹스, 묶음 퀴즈, 타임 챌린지
· 시험 대비 팩 — KBS한국어능력시험, 공무원 국어, 수능 국어 어휘, 한국사능력검정
· 오답 복습, 즐겨찾기 퀴즈, 약점 집중 코스, 보관함
· 학습 리포트와 주제별 진도, 출석체크와 배지, 주간 리그와 랭킹
· 한국어 레벨 테스트, 유형 테스트, 촌수 계산기, 학습 알림

이용하시면서 불편한 점은 adjh54ir@gmail.com으로 알려 주세요.
```

영어:

```
First release.

· Main topics: idioms, proverbs, four-character idioms, spelling, native Korean words, calendar holidays, historical figures, family-relation degrees
· Bonus quizzes: riddles, Korean history timeline, Three Kingdoms rulers, Joseon kings, presidents, age names, the 24 solar terms, seasonal customs
· Daily quiz, O/X, initial sound, fill-in-the-blank, matching, daily mix, bundle quiz and time challenge
· Exam packs for the KBS Korean Language Test, civil-service Korean, CSAT vocabulary and the Korean History Proficiency Test
· Wrong-answer review, bookmarked quiz, weak-point course and library
· Learning reports, per-topic progress, attendance check, badges, weekly league and rankings
· Korean level test, learning-type test, kinship calculator and study reminders

Feedback is welcome at adjh54ir@gmail.com.
```

> 프랑스어(`fr`) 등록정보를 추가한다면 위 영어 노트를 번역해 함께 등록합니다.

---

## 3. App Store 출시

Console 경로 표기: `App Store Connect > 나의 App > ...`
태블릿 지원이 `supportsTablet: true`이므로 **iPad 스크린샷이 필수**입니다.

### 3-1. App 정보 (버전 무관)

경로: `앱 선택 > 일반 > App 정보`

| 항목 | 제한 | 값 |
| --- | --- | --- |
| 이름 | 30자 | 한국어 상식 퀴즈 |
| 부제 | 30자 | 속담·관용구·맞춤법, 매일 한 판 (18자) |
| 개인정보 처리방침 URL | | `TODO` (1-1 참고) |
| 카테고리 (기본 / 보조) | | 교육 / 참고 |
| 콘텐츠 권한 | | 제3자 콘텐츠를 포함하지 않음 |
| 연령 등급 | | 4+ (3-4 설문) |

부제는 앱 이름의 "한국어·상식·퀴즈"를 반복하지 않고, 검색에 걸리는 주제 키워드 3개 + 사용 습관을 씁니다.
부제는 이름·키워드와 함께 검색 대상이므로 수량 대신 키워드를 넣는 편이 유리합니다.

```
속담·관용구·맞춤법, 매일 한 판
```

### 3-2. 버전별 정보 (1.0.0)

경로: `앱 선택 > iOS 앱 > 1.0.0 준비 중`

| 항목 | 제한 | 값 |
| --- | --- | --- |
| 프로모션 텍스트 | 170자 | 아래 블록 |
| 설명 | 4,000자 | 아래 블록 |
| 키워드 | 100자 (쉼표 구분, 공백 없이) | 아래 블록 |
| 지원 URL | 필수 | `TODO` — 방침 페이지에 문의처 포함해 게시 |
| 마케팅 URL | 선택 | 미사용 |
| 저작권 | | 2026 EcodeLab |

#### 프로모션 텍스트 (170자) — 심사 없이 언제든 교체 가능

```
오늘의 퀴즈로 하루를 시작해 보세요. 속담·관용구·사자성어·맞춤법을 뜻과 예문, 유래까지 함께 읽고 OX·초성·빈칸·짝 맞추기로 확인합니다. 틀린 문제는 오답 복습과 약점 집중 코스로 메우고, 실력은 타임 챌린지 랭킹과 주간 리그에서 겨뤄 보세요.
```

(공백 포함 138자 / 170자)

#### 설명 (4,000자)

App Store는 설명 텍스트가 검색에 반영되지 않습니다(검색은 이름·부제·키워드만).
키워드를 욱여넣지 말고 읽기 좋게 씁니다. 첫 2~3줄만 접히지 않고 보입니다.

```
아는 줄 알았던 속담, 헷갈리는 맞춤법, 뜻은 모르고 쓰던 사자성어.
하루 한 판이면 뜻과 예문, 유래까지 자연스럽게 남습니다.
로그인 없이 바로 시작할 수 있고, 학습 기록은 기기 안에 저장됩니다.

■ 메인 주제
· 관용구 4,251문항 — 일상에 녹아든 우리말 표현을 익혀요
· 속담 3,001문항 — 삶의 지혜가 담긴 우리말 속담
· 사자성어 1,458문항 — 네 글자 한자 속 지혜를 익혀요
· 맞춤법 1,043문항 — 헷갈리는 표기, 정확하게 익혀요
· 순우리말 746문항 — 아름다운 우리말 단어의 뜻을 익혀요
· 달력 속 기념일 — 쉬는 날·기리는 날에 담긴 뜻을 익혀요
· 한국을 빛낸 100명의 위인들 — 시대별 대표 인물 100명을 만나요
· 촌수 (남/여) — 가족 호칭과 촌수를 익혀요

■ 서브 퀴즈 (보너스 콘텐츠)
· 넌센스 — 재치로 푸는 말장난 퀴즈
· 연도로 보는 한국사 — 주요 사건을 시간 순서로 익혀요
· 삼국시대 왕 — 고구려·백제·신라·가야의 왕을 만나요
· 조선시대 왕 — 27왕의 업적과 사건을 맞혀요
· 역대 대통령 — 대한민국 대통령과 시대를 연결해요
· 나이 별칭 — 약관·이립·불혹, 나이를 부르는 옛말
· 24절기 — 입춘부터 대한까지 계절의 마디를 익혀요
· 세시풍속 — 명절마다 무엇을 했는지 알아봐요

■ 학습
· 카드 학습 — 앞면에서 단어를 보고, 넘기면 뜻과 예문을 확인해요
· 숏폼 학습 — 짧게 넘겨 보며 익히는 세로형 카드
· 오늘의 읽을거리 — 우리말 이야기를 읽으며 자연스럽게 익혀요
· 학습 진도 — 주제마다 학습한 카드 수와 남은 카드를 확인해요

■ 퀴즈 모드
· 오늘의 퀴즈 — 매일 새로 준비되는 오늘치 문제
· OX 퀴즈 · 초성 퀴즈 · 빈칸 채우기 · 짝 맞추기
· 데일리 믹스 — 여러 주제를 섞어 한 번에
· 묶음 퀴즈 — 원하는 범위만 골라 집중적으로
· 타임 챌린지 — 제한 시간 안에 콤보를 이어 최고 점수에 도전
· 시험 대비 팩 — KBS한국어능력시험, 공무원 국어, 수능 국어 어휘, 한국사능력검정

■ 복습
· 오답 복습 — 틀린 문제만 모아 다시 풀기
· 즐겨찾기 퀴즈 — 저장해 둔 문제만 골라 다시 풀기
· 약점 집중 코스 — 정답률이 낮은 주제부터 보완
· 보관함 — 공부한 표현을 모아 다시 보기

■ 검색
· 수록된 표현을 한 번에 찾아보기 (서브 퀴즈 주제까지 함께 검색)
· 주제 · 카테고리 · 난이도로 좁혀 보기
· 즐겨찾기만, 오답만 골라 보기

■ 기록과 경쟁
· 내 활동 — 학습 리포트, 주제별 진도, 오늘의 퀴즈·타임 챌린지 기록
· 학습 리포트 — 최근 7일·30일 또는 직접 고른 기간의 학습량과 정답률
· 주제별 진도 — 학습 진도와 퀴즈 진도를 탭으로 나눠 보고, 약한 주제부터 정렬
· 주제별 점수와 등급 — 문제를 풀수록 주제별 캐릭터 단계가 올라갑니다
· 출석체크와 배지 · 배지 도감
· 주간 리그 · 타임 챌린지 랭킹 — 다른 사용자와 점수 겨루기
· 한국어 레벨 테스트 · 한국어 유형 테스트 — 실력과 학습 성향 진단

■ 그 밖에
· 촌수 계산기 — 가족 관계와 호칭을 바로 확인
· 학습 알림 — 원하는 시각에 리마인더
· 학습 기록 백업 — 기기를 바꿔도 진도를 그대로

■ 이런 분께 추천합니다
· 국어 어휘력과 문해력을 다시 다지고 싶은 분
· 사자성어·속담을 뜻과 유래까지 정확히 알고 싶은 분
· 자주 틀리는 맞춤법을 정리하고 싶은 분
· 자투리 시간에 교양을 쌓고 싶은 분
· 자녀와 함께 우리말 문제를 풀어 보고 싶은 분

■ 안내
· 로그인 없이 모든 기능을 사용할 수 있습니다.
· 학습 기록은 기기 안에 저장됩니다.
· 광고가 포함되어 있으며, App 내 구입으로 광고를 제거할 수 있습니다. 구매 복원을 지원합니다.
· 문의: adjh54ir@gmail.com
```

#### 키워드 (100자, 공백 없이)

```
사자성어,순우리말,넌센스,어휘력,국어,한자,낱말,교양,위인,문해력,초성,조선,삼국,대통령,촌수,한국사,국어공부,두뇌,절기,기념일,공무원,수능
```

(공백 없이 80자 / 100자)

- 이름·부제에 있는 `한국어`, `상식`, `퀴즈`, `속담`, `관용구`, `맞춤법`은 자동 조합되므로 제외.
- 부제를 바꾸면서 `맞춤법`이 부제로 올라갔고, 그 자리에 `사자성어`를 넣었습니다.
- `초성`·`조선`·`삼국`·`촌수`·`절기`·`기념일`은 실제 기능(초성 퀴즈, 조선시대 왕, 삼국시대 왕, 촌수 계산기,
  24절기, 달력 속 기념일).
- `공무원`·`수능`은 시험 대비 팩의 실제 코스명(`src/const/ConstExamPacks.ts`: KBS한국어능력시험 / 공무원 국어 /
  수능 국어 어휘 / 한국사능력검정). 없는 기능 키워드는 넣지 않습니다.

#### 이번 버전의 새로운 기능

```
첫 출시입니다. 관용구·속담·사자성어·맞춤법·순우리말·기념일·위인·촌수를 메인 주제로, 넌센스·한국사 연표·삼국시대 왕·조선시대 왕·역대 대통령·나이 별칭·24절기·세시풍속을 보너스 퀴즈로 담았습니다. 시험 대비 팩, 오답 복습, 약점 집중 코스, 학습 리포트, 타임 챌린지 랭킹까지 함께 이용해 보세요.
이용하시면서 불편한 점은 adjh54ir@gmail.com으로 알려 주세요.
```

### 3-3. 스크린샷 및 미리보기

| 디스플레이 | 해상도(세로) | 필수 | 파일 경로 |
| --- | --- | --- | --- |
| iPhone 6.9" | 1290 × 2796 또는 1320 × 2868 | **필수** | `fastlane/screenshots/ko/` (`yarn fl:ios:screens`) — **현재 미생성** |
| iPhone 6.5" | 1242 × 2688 또는 1284 × 2778 | 선택 (6.9" 자동 축소) | 생략 |
| iPad 13" | 2064 × 2752 | **필수** (`supportsTablet: true`) | iPad Pro 13" 시뮬레이터로 촬영 |
| App 미리보기 동영상 | 15~30초, 최대 3개 | 선택 | 미사용 |

> `supportsTablet`을 끄면 iPad 스크린샷 의무가 사라지지만, 현재 true로 준비 중이므로 iPad 레이아웃이
> 깨지지 않는지 확인한 뒤 촬영합니다.

### 3-4. 연령 등급 설문

| 문항 | 값 |
| --- | --- |
| 폭력(만화/사실적) | 없음 |
| 성적 콘텐츠 또는 노출 | 없음 |
| 비속어 또는 저속한 유머 | 없음 |
| 술·담배·약물 | 없음 |
| 공포/무서운 테마 | 없음 |
| 모의 도박 / 도박 | 없음 |
| 의료/치료 정보 | 없음 |
| 사용자 생성 콘텐츠 | 없음 — 랭킹 닉네임은 앱이 무작위 생성 |
| 제한 없는 웹 접근 | 아니요 |
| 메시지/커뮤니케이션 기능 | 아니요 |
| **결과 등급** | 4+ |

> App Store 연령 등급은 **콘텐츠 기준**이라 4+가 맞습니다. 약관의 "만 16세 이상" 조건은 계약상 요건이며 등급과 별개입니다.

### 3-5. App 개인정보 보호 (App Privacy)

| 데이터 유형 | 수집 | 앱에 연결됨 | 추적에 사용 | 목적 | 근거 |
| --- | --- | --- | --- | --- | --- |
| 식별자 > 기기 ID (IDFA) | 예 | 예 | **예** | 서드파티 광고 | AdMob |
| 식별자 > 사용자 ID | 예 | 예 | 아니요 | 앱 기능 | Supabase 구매 소유권 |
| 사용 데이터 > 제품 상호작용 | 예 | 아니요 | 아니요 | 분석 | Firebase Analytics |
| 진단 > 충돌 데이터 | 예 | 아니요 | 아니요 | 앱 기능, 분석 | Firebase Crashlytics |
| 진단 > 성능 데이터 | 예 | 아니요 | 아니요 | 분석 | Firebase |
| 구매 > 구매 내역 | 예 | 예 | 아니요 | 앱 기능 | 광고 제거 구매 동기화 |
| 사용자 콘텐츠 > 기타 | 아니요 | - | - | - | 닉네임은 앱이 무작위 생성 |

**App Tracking Transparency (ATT)**

| 항목 | 값 |
| --- | --- |
| ATT 사용 | 예 (`react-native-permissions` + `AppTrackingTransparency`) |
| `NSUserTrackingUsageDescription` | 사용자님께 더 관련성 높은 광고를 제공하기 위해 기기의 광고 식별자 사용 권한이 필요합니다. |
| 추적 데이터 | IDFA |

> ATT 프롬프트 이전에 IDFA에 접근하면 리젝됩니다. 심사 메모에 "앱 최초 실행 시 ATT 동의를 요청하며,
> 거부 시 비개인화 광고만 노출"을 명시하세요. 설정 탭 > 권한 관리에서 사용자가 추적 권한 상태를 확인할 수 있습니다.

### 3-6. App 심사 정보

| 항목 | 값 |
| --- | --- |
| 로그인 필요 | 아니요 |
| 데모 계정 | 불필요 |
| 연락처 이름 / 성 | `TODO` — 실명 (ASC 계정 소유자와 동일) |
| 전화번호 | `TODO` — 국가번호 포함 (예: +82 10-0000-0000) |
| 이메일 | adjh54ir@gmail.com |
| 첨부 파일 | 미사용 |

심사 메모:

```
- 본 앱은 로그인 없이 모든 기능을 사용할 수 있습니다.
- 광고: Google AdMob 상단 배너 광고만 사용합니다(전면·보상형 미사용).
  숏폼, 카드 학습, 랭킹, 시험 대비 팩, 약점 집중, 레벨/유형 테스트 화면에서는 상단 배너를 노출하지 않습니다.
- ATT: 앱 실행 후 광고 노출 전에 추적 동의를 요청하며, 거부 시 비개인화 광고만 표시합니다.
- 인앱 구입: '광고 제거'(com.tha.koreaquiz.remove_ad) 비소모성 상품 1개이며,
  설정 탭 상단의 '광고 제거' 영역에서 '구매 복원'을 제공합니다.
- 알림: 사용자가 직접 설정한 시각에만 학습 리마인더를 발송합니다.
- 랭킹: 닉네임은 앱이 무작위로 발급하며 사용자가 직접 입력할 수 없습니다. 채팅·메시지 기능은 없습니다.
- 콘텐츠 오류 제보: 문항 상세에서 메일 앱을 여는 방식이며, 메일 앱이 없으면 안내 문구만 표시됩니다.
```

### 3-7. 가격 및 사용 가능 여부

| 항목 | 값 |
| --- | --- |
| 가격 | 무료 (App 내 구입 있음) |
| 국가 또는 지역 | 전체 국가·지역 |
| 사전 주문 | 아니요 |
| 배포 방식 | 공개 (App Store) |

### 3-8. 빌드 제출 시 추가 확인

| 항목 | 값 |
| --- | --- |
| 수출 규정 준수 (암호화) | HTTPS 표준 암호화만 사용 → 면제 대상 |
| `ITSAppUsesNonExemptEncryption` | `false` 설정 시 매 빌드 질문 생략 |
| 콘텐츠 권한 | 제3자 콘텐츠 포함하지 않음 |
| IDFA 사용 | 예 — "앱 내 광고 노출" 체크 |
| 자동 릴리스 | 심사 통과 후 수동 릴리스 권장 |

> 사자성어·속담 등 콘텐츠 출처가 제3자 저작물이라면 "콘텐츠 권한"을 재검토하고 근거를 심사 메모에 적습니다.
> 서브 퀴즈 데이터는 항목별 `source` 정보를 들고 있어(`SubQuizService`) 해설에 출처가 함께 노출됩니다.

---

## 4. 인앱 결제 (광고 제거)

| 항목 | 값 |
| --- | --- |
| 상품 ID (SKU) | `com.tha.koreaquiz.remove_ad` |
| 상품 유형 | 비소모성(iOS) / 관리형 상품 1회성(Android) |
| 가격 | ₩3,900 (대한민국 기준, 타 국가 자동 환산) |
| 표시 이름 | 광고 제거 |
| 설명 | 앱 내 광고를 영구히 제거합니다. 기기를 바꿔도 구매 복원으로 다시 적용됩니다. |
| 환경변수 | `EXPO_PUBLIC_IAP_REMOVE_AD_KEY` (`.env`) |
| 코드 위치 | `src/const/EnvCompat.ts` → `IAP_REMOVE_AD_KEY` → `src/services/PurchaseService.ts:15` `REMOVE_AD_SKU` |

> ⚠️ 상품 ID는 코드·양쪽 스토어에서 **완전히 동일**해야 합니다. 한 번 등록한 상품 ID는 삭제·재사용 불가입니다.
> 코드는 환경변수가 있으면 그 값을, 없으면 기본값을 사용합니다.

### 4-1. 사전 조건

- **Apple**: App Store Connect > 비즈니스(계약·세금·금융) > *유료 앱 계약* 활성 + 은행/세금 정보 완료
- **Google**: Play Console 결제 프로필 등록 완료 + 앱이 **최소 1회 내부 테스트 트랙에 업로드**되어 있어야 함

계약이 "처리 중"이면 상품을 등록해도 `fetchProducts`가 빈 배열을 반환합니다.

### 4-2. Apple — App Store Connect

1. 내 앱 > 해당 앱 > **앱 내 구입**
2. 새로 만들기 > **비소모성**
3. 참조 이름 `광고 제거` / 제품 ID `com.tha.koreaquiz.remove_ad` / 가격 ₩3,900
4. **현지화 정보** 최소 1개 언어 — 표시 이름 `광고 제거`, 설명 `앱 내 광고를 영구적으로 제거합니다.`
5. **심사 정보** — 스크린샷 1장 필수(설정 탭의 `InAppRemoveAdsSection` 캡처) + 검토 메모
6. 상태를 **심사 준비 완료**로 저장 → 앱 바이너리와 **함께** 첫 심사에 제출

**Sandbox 테스트**: ASC > 사용자 및 액세스 > Sandbox > 테스터 생성 → 실기기 `설정 > 개발자 > Sandbox Apple Account` 로그인
(실제 Apple ID로 로그인하지 말 것).

**시뮬레이터 로컬 테스트**: `ios/KoreaQuiz.storekit` 사용. Xcode에서 `ios/KoreaQuiz.xcworkspace` 열고
Product > Scheme > Edit Scheme > Run > Options > **StoreKit Configuration** = `KoreaQuiz.storekit`.

> 비소모성 상품이므로 **"구매 복원" 버튼이 앱 내에 반드시 있어야 하며**, 없으면 Guideline 3.1.1로 리젝됩니다. (구현 완료)

### 4-3. Google — Play Console

1. 앱 선택 > 수익 창출 > **제품 > 인앱 상품**
2. 상품 ID `com.tha.koreaquiz.remove_ad` / 이름 `광고 제거` / 설명 / 가격 ₩3,900
3. **활성**으로 저장 (초안이면 앱에서 조회되지 않음)

**라이선스 테스터**: Play Console > (전체 계정) 설정 > 라이선스 테스트 > 테스터 Gmail 추가 → 응답 `RESPOND_NORMALLY`.

주의:
- **내부 테스트 트랙에 AAB를 먼저 업로드**해야 인앱 상품이 조회됩니다.
- 업로드 AAB의 `applicationId`·서명 키가 콘솔 등록본과 같아야 합니다.
- `com.android.vending.BILLING` 권한은 이미 AndroidManifest에 선언되어 있습니다.
- 테스트 재구매는 Play 스토어 > 결제 및 정기 결제에서 테스트 주문 취소 후 가능(비소모성은 소유 시 재구매 불가).

### 4-4. Supabase 스키마

`supabase/` 아래 SQL **3개를 모두** Supabase SQL Editor에서 1회씩 실행하세요. 하나라도 빠지면 해당 기능이
런타임에서 조용히 실패합니다.

| 파일 | 용도 | 미실행 시 증상 |
| --- | --- | --- |
| `purchases.sql` | 광고 제거 구매 소유권 동기화 | 기기 변경 후 복원이 스토어 이력에만 의존 |
| `ranking.sql` | 전체·타임챌린지·주간 리그 랭킹 | 랭킹/주간 리그 화면 데이터 없음 |
| `backup.sql` | 학습 진도 클라우드 백업·복원(코드 발급) | 백업/복원 실패 |

세 스키마 모두 `korea_quiz_` 프리픽스와 익명 인증(`auth.uid()`)을 씁니다.
Auth > Providers > **Anonymous sign-ins 활성화** 필요.

### 4-5. 동작 흐름

```
앱 시작
 └ initPurchase()
    ├ loadAdsRemoved()      로컬 플래그 즉시 로드 (광고 노출 판단 지연 방지)
    ├ ensureConnected()     스토어 연결 (실패 시 이후 호출에서 자동 재시도)
    └ verifyEntitlement()   스토어 실제 구매 이력으로 권한 재검증
         소유 O → 플래그 true + Supabase 기록 갱신
         소유 X → Supabase 기록 확인 → 없으면 플래그 false 로 정정
         조회 실패(오프라인) → 기존 캐시 유지

구매 버튼 → purchaseRemoveAds() → purchaseUpdatedListener
 └ purchaseState === 'pending' 이면 권한 미부여 (편의점 결제 등 대기 상태)
 └ 완료 시 플래그 저장 → Supabase 업로드 → finishTransaction

복원 버튼 → restorePurchases() → 스토어 이력 → 없으면 Supabase 기록 확인
```

권한의 진실의 원천은 **스토어 구매 이력**이며, AsyncStorage(`AD_REMOVED`)는 오프라인 캐시입니다.

### 4-6. 결제 문제 대응

| 증상 | 원인 |
| --- | --- |
| 가격이 계속 ₩3,900 폴백 | 상품 초안 상태 / 계약 미완료 / 테스트 트랙 미업로드 |
| `fetchProducts` 빈 배열 | 상품 ID 오타, 번들 ID 불일치, 서명 키 불일치 |
| Android "이 앱은 결제를 지원하지 않음" | 라이선스 테스터 미등록 또는 디버그 서명 AAB |
| iOS 결제창이 안 뜸 | Sandbox 계정 미로그인, StoreKit Configuration 미선택 |
| 재구매 안 됨 | 정상(비소모성). 테스트는 구매 취소 후 재시도 |

---

## 5. 광고 (AdMob) — 출시 전 필수 교체

| 항목 | 현재 값 (2026-08-15 실측) | 조치 |
| --- | --- | --- |
| `app.json > react-native-google-mobile-ads.androidAppId` | `ca-app-pub-3940256099942544~3347511713` (**Google 테스트 ID**) | 운영 App ID로 교체 |
| `app.json > iosAppId` | `ca-app-pub-3940256099942544~1458002511` (**Google 테스트 ID**) | 운영 App ID로 교체 |
| `.env` 광고 단위 ID 6종 | **`ca-app-pub-1` 자리표시자** — 실제 운영 ID는 바로 아래에 **주석 처리**되어 있음 | 주석을 풀고 자리표시자 줄을 지우기 |
| `.env.production` | `EXPO_PUBLIC_APP_MODE`, `EXPO_PUBLIC_API_URL` 두 개뿐 | 광고·Supabase·IAP 키는 `.env`에서 로드됨을 전제로 유지하거나, 운영 키를 이 파일로 분리 |

> ⚠️ **현재 상태로 스토어 빌드를 올리면 운영에서도 Google 테스트 광고가 뜹니다.**
> `resolveAdUnitId`(`src/screens/common/ads/adUnitId.ts`)는 `ca-app-pub-<16자리>/<7~12자리>` 형식이 아니면
> 테스트 유닛으로 폴백하고 `⚠️ 광고 유닛 ID가 설정되지 않아 테스트 광고로 대체합니다.` 경고만 남깁니다.
> `ca-app-pub-1`은 이 형식이 아니므로 전량 폴백 대상입니다.

```bash
# 자리표시자가 남아 있는지 확인 (출력이 있으면 아직 교체 전)
grep -nE "^EXPO_PUBLIC_GOOGLE_ADMOV.*=ca-app-pub-1$" .env
```

- 실 단위 ID 판별 로직: `src/screens/common/ads/adUnitId.ts` (`resolveAdUnitId` / `isRealAdUnitId`,
  테스트는 `src/screens/common/ads/__tests__/adUnitId.spec.ts`).
- `.env`에 있는 단위 키는 `{ANDROID,IOS}_{BANNER,FRONT,REWARD}` 6종뿐입니다. 앱 오프닝
  (`GOOGLE_ADMOV_*_OPEN_APP`)·네이티브(`GOOGLE_ADMOV_*_NATIVE_ADVANCED`) 키는 없고, 해당 컴포넌트도 미사용입니다.
- 배너 미노출 화면 목록: `src/screens/common/layout/AppLayout.tsx`의 `AD_BLOCKED_ROUTES` (1-3에 실제 목록).
- 광고 제거 구매자에게 배너가 차단되는지 실기기 확인(전면·보상형은 현재 미노출).

> ⚠️ AdMob 관련 변경은 임의 진행 금지 항목입니다. 변경 내용을 먼저 정리·승인 후 적용하세요.

---

## 6. 빌드 · 제출 명령

### 6-1. EAS

```bash
# Android: AAB 로컬 빌드 → Play 제출
yarn deploy:android      # eas build -p android --profile production --local → eas submit

# iOS: IPA 로컬 빌드 → App Store 제출
yarn deploy:ios          # eas build --platform ios --profile production --local → eas submit
```

프로필(`eas.json`): `development`(APK·dev client) / `preview`(APK·internal 트랙) / `production`(store·autoIncrement).
환경: `production` = `APP_ENV=production`, `EXPO_PUBLIC_APP_MODE=prd`.

### 6-2. Fastlane

최초 1회:

```bash
gem install bundler
yarn fl:install                    # bundle install && fastlane install_plugins
cp fastlane/.env.example fastlane/.env
```

`fastlane/.env`에 채울 값: Apple ID / 팀 ID / App Store Connect API 키, match git 저장소 URL + 비밀번호,
Google Play 서비스 계정 JSON 경로, (선택) Firebase 앱 ID.

> 🔒 `fastlane/.env`, `AuthKey*.p8`, `play-service-account.json`은 `.gitignore` 대상입니다. 커밋 금지.

| iOS 단축어 | 동작 |
| --- | --- |
| `yarn fl:ios:setup` | yarn 설치 + (필요 시) prebuild + `pod install` |
| `yarn fl:ios:signing` | 코드사이닝 동기화 (`match`) |
| `yarn fl:ios:build` | 릴리즈 `.ipa` → `build/KoreaQuiz.ipa` |
| `yarn fl:ios:beta` | 빌드 → **TestFlight** 업로드 → dSYM 업로드 |
| `yarn fl:ios:release` | 빌드 → **App Store** 메타데이터/빌드 제출 |
| `yarn fl:ios:firebase` | Firebase App Distribution 배포 |
| `yarn fl:ios:screens` | 스크린샷 촬영(`snapshot`) + 프레임 |
| `yarn fl:ios:dsyms` | dSYM 다운로드 → Crashlytics 업로드 |
| `yarn fl:ios:bump` | `app.json` 버전 +0.0.1 |
| `yarn fl:ios:ci` | build → TestFlight → dSYM |

| Android 단축어 | 동작 |
| --- | --- |
| `yarn fl:and:setup` | yarn 설치 + (필요 시) prebuild |
| `yarn fl:and:apk` | 릴리즈 `.apk` 빌드 |
| `yarn fl:and:aab` | 릴리즈 `.aab` 빌드 (스토어용) |
| `yarn fl:and:beta` | versionCode↑ → AAB → **Play 내부테스트** |
| `yarn fl:and:release` | **Play 프로덕션** 출시 |
| `yarn fl:and:promote` | 내부 → 프로덕션 트랙 승격 |
| `yarn fl:and:firebase` | Firebase App Distribution 배포 |
| `yarn fl:and:bump` / `bumpcode` | `app.json` 버전 / `versionCode` 증가 |
| `yarn fl:and:ci` | bump → AAB → Play internal |

인자가 필요하면 lane 직접 실행:

```bash
bundle exec fastlane ios bump type:minor
bundle exec fastlane ios signing type:development readonly:false
```

### 6-3. 산출물 위치

| 종류 | 경로 |
| --- | --- |
| iOS IPA | `build/KoreaQuiz.ipa` (EAS는 `build/app.ipa`) |
| Android AAB | `android/app/build/outputs/bundle/release/app-release.aab` (EAS는 `build/app.aab`) |
| Android APK | `android/app/build/outputs/apk/release/app-release.apk` |
| 스크린샷 | `fastlane/screenshots/` (iOS), `fastlane/metadata/android/` (Android) |

### 6-4. 자격증명 발급

- **App Store Connect API Key** (권장, 2FA 없이 자동화): ASC > 사용자 및 액세스 > 통합 > App Store Connect API >
  `.p8` 발급 → `.env`의 `APP_STORE_CONNECT_API_KEY_KEY_ID / ISSUER_ID / KEY_FILEPATH`.
- **match** (인증서/프로비저닝): private git repo 생성 → `MATCH_GIT_URL`, `MATCH_PASSWORD` →
  최초 1회 `bundle exec fastlane ios signing type:appstore readonly:false`.
- **Google Play 서비스 계정**: GCP 콘솔에서 서비스 계정 생성 → Play Console 권한 부여 → JSON 키 저장
  (`credentials/google-service-account.json`, fastlane은 `PLAY_JSON_KEY_FILE`).
- **Firebase App Distribution** (선택): `FIREBASE_IOS_APP_ID` / `FIREBASE_ANDROID_APP_ID`,
  인증은 `firebase login:ci` 토큰 또는 서비스 계정.

---

## 7. 출시 전 체크리스트

### 7-1. 테스트 전용 코드 차단 (필수)

| 항목 | 위치 | 현재 값 | 판정 |
| --- | --- | --- | --- |
| 광고 테스트 도구 (광고제거 되돌리기·강제 미구매) | `src/services/PurchaseService.ts:42` `ADS_TEST_TOOLS_ENABLED` | `__DEV__` | ✅ 릴리즈 자동 제외 |
| 개발자 치트 섹션 (모든 퀴즈/학습 완료) | `app/(tabs)/my.tsx` → `__DEV__` 블록 | `__DEV__` | ✅ 릴리즈 자동 제외 |

```bash
# 하드코딩된 true 로 되돌아가지 않았는지만 확인 (기대 출력: ADS_TEST_TOOLS_ENABLED = __DEV__)
grep -n "ADS_TEST_TOOLS_ENABLED = " src/services/PurchaseService.ts
```

`__DEV__`가 아니라 `true`로 바뀌어 있으면 릴리즈 빌드에도 테스트 도구가 실린 것이므로 되돌리세요.

### 7-2. 빌드

- `npx tsc --noEmit` 에러 0건, `npx jest` 통과
- `.env.production`으로 빌드되는지 (`EXPO_PUBLIC_APP_MODE=prd`)
- 버전/빌드 번호 증가: `app.json`, `android/app/build.gradle`, Xcode 프로젝트 (또는 EAS `autoIncrement`)
- AAB: `yarn deploy:android` / `yarn fl:and:aab` — IPA: `yarn deploy:ios` / Xcode Archive

### 7-3. 공통 제출 확인

- [ ] AdMob App ID(`app.json`)가 운영 값이다 (현재 테스트 ID)
- [ ] `.env` 광고 단위 ID 6종이 `ca-app-pub-1` 자리표시자가 아니다 (현재 자리표시자, §5 grep으로 확인)
- [ ] 스토어 선언·문구의 광고 형식이 실제 노출(배너)과 일치한다
- [ ] Supabase `purchases.sql` · `ranking.sql` · `backup.sql` 3개를 모두 실행했다
- [ ] 인앱 상품 ID가 코드와 일치하고 콘솔에서 활성/심사 준비 완료 상태다
- [ ] 실기기 + 샌드박스/라이선스 테스터로 구매 → 광고 제거 → 재시작 후 유지 확인
- [ ] 앱 삭제·재설치 후 "구매 복원"으로 복구 확인
- [ ] 개인정보처리방침 URL이 실제로 열리고 데이터 선언과 내용이 일치한다
- [ ] 스토어 문구의 주제별 문항 수가 `LearnHubService`의 현재 `total`과 일치한다 (1-2 재측정 스크립트)
- [ ] 스크린샷이 실제 최신 화면과 일치한다

### 7-4. Android 전용

- [ ] 내부 테스트 트랙에서 결제·광고·알림을 실기기로 확인했다
- [ ] `AndroidManifest.xml`에 차단 권한(`SCHEDULE_EXACT_ALARM` 등)이 되살아나지 않았다
- [ ] versionCode가 이전 업로드보다 크다

### 7-5. iOS 전용

- [ ] ATT 동의 요청이 IDFA 접근보다 먼저 실행된다
- [ ] 설정 탭에 '구매 복원' 버튼이 있고 동작한다
- [ ] 인앱 상품이 바이너리와 함께 제출된다
- [ ] iPad(13")에서 레이아웃이 깨지지 않는다

---

## 8. 트러블슈팅

- **`bundle: command not found`** → `gem install bundler` 후 재시도.
- **iOS 빌드가 Linux에서 실패** → 정상. iOS는 macOS/Xcode 필요.
- **Pods 오류** → `yarn fl:ios:setup`으로 `pod install` 재실행. 네이티브 변경 시 `npx expo prebuild` 후 재빌드.
- **스크린샷 lane 미동작** → `snapshot`은 Xcode UITest, `screengrab`은 Android Espresso 테스트 타깃 필요.
- **버전 관리** → 표시 버전의 단일 출처는 `app.json`. iOS 빌드넘버는 빌드 시 타임스탬프(또는 `BUILD_NUMBER`),
  Android `versionCode`는 `bumpcode` 또는 EAS `autoIncrement`.
- **빌드 실패 시 복구**

```bash
pkill -f xcodebuild; pkill -f metro; (cd android && ./gradlew --stop)
rm -rf ~/Library/Developer/Xcode/DerivedData/KoreaQuiz-*
rm -rf node_modules "$TMPDIR/metro-cache" && yarn install && npx pod-install
```

---

## 9. 남은 TODO 요약

2026-08-15 코드·설정 실측 기준. 위에서 아래로 갈수록 덜 급합니다.

| # | 항목 | 위치 | 상태 |
| --- | --- | --- | --- |
| 1 | `.env` 광고 단위 ID 6종이 `ca-app-pub-1` 자리표시자 — 주석 처리된 운영 ID로 교체 (안 하면 운영에서 테스트 광고 노출) | 5 | 미조치 |
| 2 | AdMob App ID가 Google 테스트 ID (`app.json`) — 운영 값 교체 | 5 | 미조치 |
| 3 | 광고 형식 확정: 배너만 유지할지, 미사용 상태인 전면·보상형을 붙일지 결정 후 선언·문구 통일 | 2-4, 5 | 미결정 |
| 4 | 개인정보처리방침 공개 URL 게시 후 양대 콘솔 입력 | 1-1 | 미조치 |
| 5 | 방침·약관의 "인공지능(AI)" 문단 2개 삭제 (`TermScreen.tsx:36`, `:223`) | 1-1 | 미조치 |
| 6 | Android 릴리즈 키스토어 배치(현재 `debug.keystore`만) + `gradle.properties` 평문 비밀번호 정리 | 0 | 미조치 |
| 7 | Supabase SQL 3종(`purchases`·`ranking`·`backup`) 실행 확인 | 4-4 | 확인 필요 |
| 8 | Play 피처 그래픽 1024×500 제작 | 2-2 | 미제작 |
| 9 | iPhone 6.9" / iPad 13" / Android 폰 스크린샷 촬영 (현재 0장) | 1-3, 2-2, 3-3 | 미조치 |
| 10 | App 심사 정보의 담당자 실명·전화번호 입력 | 3-6 | 미조치 |
| 11 | 미사용 코드 정리(선택): `ads/levelplay/` + `ironsource-mediation` 의존성, `ConstTowerData`·`ConstTowerQuizData` | — | 선택 |
