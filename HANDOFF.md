# HANDOFF.md - Calendar on Demand

## 📌 Project Overview
- **Product**: **Calendar on Demand** (v1.5.6)
- **Concept**: Windows/macOS 데스크톱 트레이에서 바로 열고 쓰는 빠르고 미려한 Google Calendar & Todo 위젯.
- **Current Version**: `v1.5.6` (Hotfix: Quick Add Timezone Offset Scope & Auto-Save Event Persistence)
- **Live Landing Page**: GitHub Pages (`docs/` & `landing/`) with Custom Domain + GA4 (`G-DTN5BM6653`)
- **Key URLs**:
  - Web: https://cal-ondemand.com
  - GitHub: https://github.com/kidiksentrik/Calendar-On-Demand
  - Releases: https://github.com/kidiksentrik/Calendar-On-Demand/releases
  - Feedback (Tally): https://tally.so/r/ODZJJR
  - Sponsor (Ko-fi): https://ko-fi.com/kidiksentrik

---

## 💻 Cross-Machine Development Quick Start (다른 컴퓨터에서 개발 시작하기)

다른 컴퓨터(새 환경)에서 개발을 이어갈 때 다음 순서대로 진행합니다.

### 1. 필수 사전 준비 (Prerequisites)
- **Node.js**: v18.x ~ v20.x 권장
- **Git**: 최신 버전
- **Google Cloud Console OAuth 자격증명 (`credentials.json`)**

### 2. 클론 및 의존성 설치
```bash
git clone https://github.com/kidiksentrik/Calendar-On-Demand.git
cd Calendar-On-Demand
npm install
```

### 3. Google OAuth `credentials.json` 세팅 [중요 ⚠️]
- `credentials.json`과 `token.json`은 보안상 `.gitignore` 처리되어 레포에 포함되지 않습니다.
- **기존 개발 PC나 개인 보안 드라이브, 또는 Google Cloud Console(Calendar-On-Demand 프로젝트)에서 다운로드한 `credentials.json`을 프로젝트 루트 디렉토리에 복사**해야 정상적으로 Google 로그인 및 캘린더 동기화가 동작합니다.
- 토큰 파일(`token.json`)은 앱 실행 후 최초 로그인 시 Electron의 `userData` 디렉토리 또는 루트에 자동 생성됩니다.

### 4. 로컬 실행 및 빌드 명령어
```bash
npm start          # 로컬 Electron 위젯 실행
npm run build      # 로컬 패키징 빌드 테스트 (dist/ 생성)
```

---

## 🛠️ Architecture & Tech Stack

```
[ Electron Main Process (main.js) ]
  ├── Tray Icon & Window Management (Always on top, Stick to desktop, Position lock)
  ├── Multi-Account OAuth Token Storage (auth.js)
  ├── Google Calendar API v3 Integration (calendar.js)
  └── Auto Updater (electron-updater + NSIS Releases)

[ Renderer Process (widget.html / widget.js / styles.css) ]
  ├── Month Grid with Custom Theme & Today Highlight
  ├── Week View 24h Vertical Timeline with Overlap Clustering
  ├── Day Cell / Todo Modal (Quick Add, Edit, Delete, [x] Done Toggle)
  ├── Multi-Day Continuous Ribbon System (multi-day-start / middle / end)
  ├── Web Audio API Synthesized Chime Sounds (Task Complete / Uncomplete)
  ├── Tag System: [IMPORTANT], [HIGHLIGHT], [COLOR:#hex], [x]
  └── Meeting Direct Join (📹 Google Meet / Video Conference)
```

- **Runtime**: Electron 31+
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism, CSS Variables Theme System), JavaScript (ESNext)
- **Google API**: OAuth 2.0 (`google-auth-library`), Google Calendar API v3 (`googleapis`)
- **Release Automation**: GitHub Actions CI (`.github/workflows`) 트리거 (Git Tag `v*.*.*` 푸시 시 Win `.exe` & Mac `.dmg` 자동 빌드 및 릴리즈 드래프트 등록)

---

## 📂 Core File Map (핵심 파일 구조)

- `main.js`: Electron 메인 프로세스. 트레이 아이콘, 윈도우 생성, 투명 창 프레임 크기 제한(minBounds 클램핑), 오프스크린 좌표 자동 복구, IPC 핸들러 등록.
- `auth.js`: Google OAuth2 인증 흐름, 다중 계정 토큰 암호화 저장 및 갱신, 로그아웃 처리.
- `calendar.js`: Google Calendar API v3 연동. 이벤트 목록 조회, 일정 등록/수정/삭제, 24개 공식 컬러(`eventLabelVersion: 1`) 매핑.
- `widget.html`: 렌더러 프로세스 메인 마크업 (헤더 네비게이션, 월간 뷰 그리드, 주간 뷰 타임라인, 투두/일정 추가 모달, 설정 모달).
- `widget.js`: 렌더러 핵심 로직. 0ms 낙관적 네비게이션, 디바운스 이벤트 동기화, 날짜 계산, 멀티데이 연속 일정 렌더링, Web Audio 차임.
- `styles.css`: 위젯 전체 스타일시트. 글래스모피즘 테마, 2줄 투두 레이아웃, 배경 명도 기반 동적 텍스트 대비(Adaptive Contrast), 고대비 트랙.
- `docs/index.html`: GitHub Pages 배포용 웹사이트 (도메인 루트).
- `landing/index.html`: 웹사이트 소스 미러링 (반드시 `docs/`와 동일한 상태를 유지해야 함).
- `release.ps1`: 버전 범프 및 깃 태그 푸시 보조 스크립트.

---

## 💡 Business & Freemium Strategy (비즈니스 및 수익화 기본 원칙)

2026년 9월 전략 회의를 통해 수립된 핵심 원칙입니다:

1. **"기존 기능 영구 무료(Free Forever) 보장" (러그풀 절대 금지)**:
   - v1.5.4까지 구현된 모든 기능(다중 계정 연동, 월간/주간 뷰, 24개 컬러 팔레트, 바탕화면 고정 핀, 투두 등)은 앞으로도 영구히 100% 무료로 제공합니다.
   - 기존 무료 기능을 유료로 잠그는 행위는 유저 신뢰를 파괴하므로 절대 하지 않습니다.
2. **향후 Pro/유료화는 순수 신규 파워 기능에만 적용**:
   - 유료 모델 도입 시 일반 유저는 필요 없으나 헤비 유저가 원하는 '플러스 알파' 영역에만 부여:
     - AI / LLM 자연어 스마트 일정 생성 (OpenAI/Gemini API 비용 연동)
     - 외부 캘린더 연동 (Outlook 회사 계정, Apple iCloud, Notion DB)
     - 미니멀 플로팅 메뉴바/트레이 HUD 모드
     - 시간 분석 통계 리포트 (Time Analytics)
3. **현재 단계 (1.1k 활성 유저 돌파 / 런칭 3개월 차)**:
   - 강제 결제벽을 세우지 않고 오가닉 유입 및 팬덤 확장에 집중.
   - 설정 창의 은은한 `☕ Buy me a coffee` 자발적 후원 링크 유지.

---

## ✅ Completed Features (v1.5.6 최신 현황)

### 1. v1.5.6 핫픽스 (Hotfix: Quick Add Timezone Offset Scope & Auto-Save Persistence)
- [x] **일정 등록 시 타임존 오프셋(offset) 스코프 누락 해결**:
  - 시간을 지정한 일정 생성 시 `saveCurrentEvent()` 내부에서 `offset` 변수가 누락되어 `ReferenceError`가 발생하던 문제를 해결 (`const offset = getLocalTZOffset()`).
- [x] **모달 바깥 클릭 시 자동 저장 및 닫기 방어 로직 강화**:
  - `handleAutoSaveAndClose()`를 `try...catch...finally { closeAllModals(); }` 블록으로 안전하게 감싸, 예외가 발생하더라도 모달이 닫히지 않고 먹통이 되는 현상을 원천 방지.
- [x] **실사용 검증 완료**:
  - 사용자 직접 테스트를 통해 일정 생성(시간 및 컬러 지정) 후 외부 클릭 시 자동 저장 및 모달 정상 종료 동작 확인 완료.

### 2. 정적 코드 분석(ESLint) 도입 및 품질 보증(QA) 파이프라인 구축 [중요 🛡️]
- [x] **ESLint v10 & Flat Config (`eslint.config.js`) 전면 도입**:
  - 이번 `ReferenceError` 사태의 재발을 원천 차단하기 위해 엄격한 정적 분석기 도입 (`no-undef: 'error'`).
  - 브라우저 DOM, Node.js, Electron 런타임 글로벌 완벽 바인딩.
- [x] **코드베이스 전수 스캔 및 잠재 결함 선제 해결**:
  - `main.js`: `createTray()`, `createWindow()`, `saveBounds()`, `toggleWindow()`가 `gotTheLock`의 `else` 블록 내부에 갇혀 있어, 파일 하단의 `updateLoginSettings()`에서 호출될 경우 터질 수 있었던 잠재적 `ReferenceError`를 모듈 스코프로 호이스팅하여 사전 완벽 차단.
  - `widget.js`: 미사용 변수(`dateInputsContainer`), 중복 무효 할당(`start`, `end`, `allDayText`, `newSummary`), 레거시 미사용 함수(`_showEventDetails`) 전수 정비.
  - `auth.js`, `calendar.js`: 미사용 변수 및 예외 파라미터 정비.
  - **전체 코드베이스 ESLint 검사 통과 (0 errors, 0 warnings)**.
- [x] **자동 검증 게이트웨이 (`npm test`, `release.ps1`, GitHub Actions) 구축**:
  - `package.json`에 `"lint": "eslint ."` 및 `"test": "npm run lint"` 탑재.
  - `release.ps1` 배포 스크립트에 `[0/4] Pre-Flight npm test` 검증 스텝 강제 (린트 통과 못하면 릴리즈 태그 푸시 원천 차단).
  - `.github/workflows/release.yml`에 `npm test` 스텝 추가 (CI 빌드 서버에서도 린트 통과 필수).

### 2. v1.5.5 비주얼 & 마이크로 인터랙션 대개편 (Visual & Micro-Interactions Overhaul)
- [x] **헤더 18px 모노크롬 SVG 벡터 아이콘 & 글래스 키캡 버튼**:
  - 기존 컬러 이모지(`📅`/`📆`, `📌`, `🔄`, `⚙️`, `🏠`)를 완전 퇴출하고, 상단 1px 반사 림 라이트와 호버 리프트가 적용된 고급 모노크롬 벡터 아이콘으로 교체.
- [x] **앰비언트 호버 글로우(Hover Glow)**:
  - 월간 뷰 날짜 셀 및 일정 카드 호버 시 상단 반사선과 은은한 악센트 글로우 발광, 타일이 맑게 반짝이는 시각적 피드백 제공.
- [x] **주간 뷰 현재 시간선 2단계 네온 펄스 광채**:
  - 빨간 현재 시각 표시선(Now Line)과 인디케이터 점에 발광 섀도우를 적용해 어두운 바탕 위에서 선명한 시간 인지 제공.
- [x] **설정창 드롭다운 & 폼 컨트롤 완전 일체화**:
  - OS 기본 흰색 셀렉트를 다크 글래스 드롭다운(커스텀 SVG 화살표)으로 통일하고, `+ Add Account` 버튼을 대시드 보더 블루 글래스 스타일로 리뉴얼.
- [x] **온오프 토글스위치 우측 완벽 일렬 정렬**:
  - 일반 라벨과 스위치 라벨의 셀렉터를 분리하고, 텍스트 말줄임표 처리 및 `margin-left: auto`를 적용하여 모든 스위치가 오른쪽 끝 칼각 정렬 유지.

### 2. 캘린더 & 투두 핵심 기능
- [x] **Google Calendar 동기화**: 15분 주기 자동 백그라운드 동기화 + 수동 동기화 + 에러 시 지수 백오프 재시도.
- [x] **다중 계정 (Multi-Account) 지원**:
  - 복수 Google 계정 로그인 및 저장.
  - 계정별/캘린더별 개별 표시 On/Off 체크박스.
  - 투두 목록에서 계정 뱃지(Badge) 표시.
- [x] **연속 다일 종일 일정(Multi-Day All-Day Events) 연속 리본 시각화 및 날짜 범위 선택**:
  - 여러 날에 걸친 연속 일정은 'All-day(종일)'로 연동 처리 (구글 캘린더 네이티브 방식 동일).
  - 월간 뷰(Month Grid) 및 주간 뷰 상단 종일 행(Weekly All-day Row)에서 연속된 일정이 끊기지 않고 이어져 보이도록 고대비 양방향 점선 리본 클래스(`multi-day-start`, `multi-day-middle`, `multi-day-end`) 적용.
  - 일정 추가/수정 모달에 직관적인 날짜 범위 선택기(`Date [시작일] ~ [종료일]`) 탑재. 다일 범위 지정 시 자동으로 All-day 모드 고정.
- [x] **일정 제목 잘림 방지 2줄 투두 레이아웃(Anti-Truncation 2-Line Layout)**:
  - 투두 모달 내 일정 행을 1열(100% 제목 전용 행) + 2열(시간 뱃지, 계정 태그, 화상회의 링크 컴팩트 서브 행)로 분리하여 좁은 창에서도 제목 잘림 방지.
- [x] **새 일정 추가 시 상세 옵션(컬러 24종, 별표, 위치, 메모) 누락 버그 해결**:
  - 모달 리셋 시 `extraFields`가 강제로 숨겨지던 코드를 제거하여 신규 등록 및 수정 시 항상 24색 팔레트와 상세 필드 접근 가능.
- [x] **밝은 배경화면(화이트/라이트 월페이퍼) 대비 가독성 대폭 강화**:
  - 요일 헤더(MON, TUE, WED...)의 투명도를 40%에서 85%(`--text-muted`, 700 bold weight)로 대폭 상향, 일요일(`ff5252`), 토요일(`448aff`) 컬러 포인트 적용.
  - 주간 뷰 세로 시간축(00:00~23:00) 뒤편에 고대비 트랙 배경(`rgba(0, 0, 0, 0.22)`) 배치 및 드롭 섀도우(`--label-shadow`) 적용.
- [x] **0ms 즉각 반응 네비게이션(Optimistic Navigation) & 디바운스 동기화**:
  - 이전/다음/홈 버튼 클릭 시 즉시 0ms로 캘린더 뷰를 렌더링하고, 구글 캘린더 백그라운드 API 호출은 250ms 디바운스로 지연 처리.
  - 연타 시 이전 요청이 최신 화면을 덮어쓰지 않도록 `fetchRequestId` 시퀀스 검증 탑재.
- [x] **구글 캘린더 공식 24종 컬러웨이 완전 연동 & 양방향 동기화 (`eventLabelVersion: 1`)**:
  - 최신 Google Calendar 웹의 `labelProperties.eventLabels` 아키텍처 연동 (코코아 `#795548` 등 24종 전체 지원).
  - 제목에 `[COLOR:#hex]` 태그를 노출하지 않고 네이티브 라벨 ID로 깔끔하게 저장.
- [x] **배경 명도 기반 동적 텍스트 대비(Adaptive Contrast) 타이포그래피**:
  - 배경 색상의 밝기(YIQ/Luminance)를 계산하여 밝거나 중간 톤 배경에는 또렷한 다크 텍스트(`#18181b`), 어두운 배경에는 화이트 텍스트(`#ffffff`, 그림자) 자동 적용.
- [x] **타임 피커 UI 잘림 해소 & 모달 바깥 클릭 시 시간 자동 저장(`handleAutoSaveAndClose`)**.

### 2. 랜딩 페이지 & 커뮤니티
- [x] GitHub Pages 배포 (`docs/` 및 `landing/` 100% 동기화).
- [x] Google Analytics GA4 태그 (`G-DTN5BM6653`) 및 앱 다운로드 이벤트 로깅.
- [x] **신뢰도 뱃지 1,000+ Users 업데이트** (GA4 활성 사용자 기반 1.1k 돌파).
- [x] **커뮤니티 추천사 인피니티 마퀴(Infinite Marquee Ticker) 애니메이션 탑재**:
  - 실제 Tally 피드백 폼 접수 데이터 및 Product Hunt 리뷰 7종 세트 반영.
  - 마우스 호버 시 일시 정지(Pause on hover) 및 양끝 그라디언트 페이드 마스크 적용.
- [x] SEO & AI 검색 엔진(ChatGPT/Perplexity) 최적화: Schema.org JSON-LD 구조화 데이터, FAQ 섹션, canonical URL, sitemap.xml, robots.txt 구축.

---

## 🎯 Next Tasks (Immediate Priorities)

1. **Windows 'winget' & macOS 'Homebrew' 패키지 매니저 등록**:
   - `winget install kidiksentrik.calendar-on-demand`
   - `brew install --cask calendar-on-demand`
2. **Global Hotkey (전역 단축키)**:
   - `Ctrl+Shift+C` 또는 `Alt+C` 등으로 다른 작업을 하다가도 백그라운드 위젯 즉시 최상단 포커스/토글.
3. **반복 일정(Recurrence) 생성 & 표시**:
   - 주간/월간 반복 룰 지원.
4. **커스텀 디자인 옵션 추가**:
   - '오늘' 및 '주말' 하이라이트 색상 커스텀, 단색 심플 아이콘 옵션.

---

## ⚠️ Important Rules & Cautions (개발 및 배포 시 반드시 준수)

1. **버전 및 릴리즈 규칙**:
   - **사용자가 명시적으로 릴리즈를 요청할 때만** 버전을 올리고 배포를 트리거함.
   - 사소한 버그 수정이나 점진적 개발 시에는 임의로 버전을 올리지 않음.
2. **웹사이트 동기화 규칙**:
   - GitHub Pages의 퍼블리시 루트는 `docs/`이지만, 소스 트리에는 `landing/`도 함께 존재함.
   - 웹사이트를 수정할 때는 **반드시 `docs/index.html`과 `landing/index.html`을 동일하게 함께 업데이트**해야 함.
3. **Google OAuth 보안**:
   - `credentials.json`과 `token.json`은 절대 git에 커밋하거나 외부에 노출하지 않음.
4. **배포 전 검증 및 린팅 규칙 (Pre-Release QA Checklist)** [필수 🛡️]:
   - 릴리즈 태그 생성 전 반드시 `npm test` (`npm run lint`)를 통과(0 errors, 0 warnings)해야 함.
   - 릴리즈 직전 아래 4가지 핵심 유저 시나리오를 직접 수동 검증:
     1. 시간 지정 일정 추가 ➔ 외부 클릭 오토세이브 정상 작동 확인
     2. 종일(All-day) 일정 추가 ➔ 외부 클릭 오토세이브 정상 작동 확인
     3. 기존 일정 수정 및 삭제 정상 작동 확인
     4. 설정창 토글 및 닫힘 동작 확인
