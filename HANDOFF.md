# HANDOFF.md - Calendar on Demand

## 📌 Project Overview
- **Product**: **Calendar on Demand** (v1.6.0)
- **Concept**: Windows/macOS 데스크톱 트레이에서 바로 열고 쓰는 빠르고 미려한 Google Calendar & Todo 위젯.
- **Current Version**: `v1.6.0` (Tasks Drawer, Time-blocking Drag & Drop, Alt+T Hotkey & Smart Completion Sync)
- **Live Landing Page**: GitHub Pages (`docs/` & `landing/`) with Custom Domain + GA4 (`G-DTN5BM6653`)
- **Key URLs & Dual-Track Repositories**:
  - Web: https://cal-ondemand.com
  - **Private Core Repo (`origin`)**: https://github.com/kidiksentrik/Calendar-On-Demand-Pro (실제 개발 본진, Pro 소스코드 및 `HANDOFF.md` 전략 문서 관리)
  - **Public Release Repo (`public`)**: https://github.com/kidiksentrik/Calendar-On-Demand (랜딩페이지 `docs/`, GitHub Releases 설치 파일 배포 및 `electron-updater` 자동 업데이트 서버 역할)
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

### 2. 클론 및 의존성 설치 (Private 본진 레포 기준)
```bash
git clone https://github.com/kidiksentrik/Calendar-On-Demand-Pro.git
cd Calendar-On-Demand-Pro
git remote add public https://github.com/kidiksentrik/Calendar-On-Demand.git
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

- **Runtime**: Electron **25.9.8** (EOL since 2024-04 — 보안 패치 없음. 업그레이드 필요하나 안정성 우려로 단계적 진행 예정)
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

2026년 9~10월 전략 회의 및 첫 실제 후원/피드백 검증을 통해 확정된 핵심 원칙입니다:

1. **"기존 기능 영구 무료(Free Forever) 보장" (러그풀 절대 금지)**:
   - `v1.6.0`까지 구현된 모든 기능(다중 계정 연동, 월간/주간 뷰, 24개 컬러 팔레트, 바탕화면 고정 핀, **로컬 투두 서랍장 & 타임블로킹 드래그 앤 드롭** 등)은 앞으로도 영구히 100% 무료로 제공합니다.
   - 기존 무료 기능을 유료로 잠그는 행위는 유저 신뢰를 파괴하므로 절대 하지 않습니다.
2. **첫 유료 후원 달성($5, Ko-fi Oskar) & 시장 수요 검증 완료**:
   - 경쟁 유료 위젯("Agenda Widget", $10)을 유료 결제했던 유저로부터 *"yours are miiiiiles ahead!"* 극찬과 함께 첫 자발적 후원($5) 발생.
   - 특히 **"Google Tasks 동기화 옵션이 들어오면 평생 쓰겠으며, 구독제가 아닌 원타임 결제(One-time fee)라면 기꺼이 지불하겠다"**는 구체적 지불 의향(WTP) 확인 (동일 Google Tasks 연동 피드백 3~4건+ 연속 접수).
3. **"서포터 퍼크 + 계단식 가격 인상형 Pro 패스 (Supporter Perk / Tiered Early-Bird Lifetime Pass)" 모델**:
   - **왜 원타임 결제(One-Time Payment)인가**: 데스크톱 위젯 특성상 구독제는 유저 이탈을 부르며, Google Tasks API 등은 유저 로컬 PC에서 직접 통신하므로 **우리 측 월 서버/유지 비용이 $0**임.
   - **따뜻한 인디 서포터 포지셔닝(`☕ SUPPORTER PERK`) + `$5+` 시작**: 딱딱한 상업용 페이월 대신 인디 개발자를 응원하면 평생 모든 서포터 혜택을 열어주는 방식으로 포지셔닝. 글로벌 구매력(PPP) 장벽을 낮추고 초기 서포터 모수를 빠르게 확보하기 위해 **`$5+` (Pay What You Want 최소 금액 $5)**부터 시작하며, 향후 심화 기능이 추가될 때마다 **신규 서포터 최소 금액**을 단계적으로 인상:
     - **Phase 1 (지금 — Google Tasks 실시간 양방향 동기화)**: **`$5+` Supporter Perk** (Lemon Squeezy 라이선스 키 자동 발급)
     - **Phase 2 (뽀모도로 타이머, 추가 Pro 기능 탑재 시)**: **`$9+`**로 인상
     - **Phase 3 (Outlook/M365 연동, BYOK AI 비서 등 완성형 패키지)**: **`$15 ~ $19`** 안착
   - **서버 비용 발생 기능(AI 등) 처리 원칙**: 향후 LLM/AI 기능 추가 시 Pro 패스 보유자에게 무료 포함하되, 유저 본인의 Gemini/OpenAI API 키를 입력하는 **BYOK (Bring Your Own Key)** 방식을 채택하여 서버 변동비 $0 유지.
   - **초기 서포터 예우**: Oskar 등 초기 Ko-fi 후원자에게는 감사 메시지와 함께 1호 무료 평생 Pro 라이선스 키 증정.
4. **오픈 코어 투트랙(Open-Core Dual-Track) GitHub 레포지토리 아키텍처 & 운용 원칙**:
   - **배경 및 철학**:
     - 기존 커뮤니티(Reddit, Product Hunt 등)에서 무료/오픈소스 이미지로 쌓아온 두터운 신뢰를 100% 지키기 위해, **기존 무료 버전인 `v1.6.0`까지의 코어 소스코드는 퍼블릭 레포에 그대로 오픈소스로 영구 보존**함.
     - 동시에 누군가 앞으로 개발할 유료(Pro) 기능을 포크하여 바이브코딩 등으로 무단 개조/복제하거나 내부 비즈니스 전략(`HANDOFF.md`)을 열람하는 것을 원천 차단하기 위해 **`v1.6.0` 이후의 모든 개발 본진을 Private 레포로 분리**함.
   - **두 레포지토리의 명확한 역할 분담**:
     1. **Private 본진 (`origin` ➔ `https://github.com/kidiksentrik/Calendar-On-Demand-Pro.git`)**:
        - 현재 및 향후 모든 신규 기능 개발(`v1.7.0+` Google Tasks 양방향 연동, 라이선스 키 검증, UI 폴리싱 등)과 `HANDOFF.md` 전략 문서를 독점 관리하는 진짜 작업 본진.
        - 일상적인 `git commit` 및 `git push origin main`은 모두 이 프라이빗 레포로만 올라가며, **프라이빗 레포에 커밋/푸시하는 것만으로는 실제 라이브 서비스나 유저 배포판 버전이 절대 바뀌지 않음** (안전한 백업 및 멀티 PC 동기화 공간).
     2. **Public 배포소 (`public` ➔ `https://github.com/kidiksentrik/Calendar-On-Demand.git`)**:
        - 소스코드는 `v1.6.0` 무료 버전 스냅샷 상태에서 멈춰 둠 (`HANDOFF.md` 및 `.agents/` 내부 문서는 퍼블릭 히스토리에서 완전 삭제 처리 완료).
        - **핵심 역할 3가지**: ① 공식 웹사이트(`cal-ondemand.com`, `docs/` 폴더) 호스팅, ② GitHub Releases 설치 파일(`.exe`, `.dmg`) 배포, ③ 기존 1,100명+ 실사용 유저들의 `electron-updater`(`latest.yml`) 무중단 자동 업데이트 피드 제공.
   - **다른 컴퓨터(집 PC / 맥북)에서 작업 이어받기 규칙**:
     - 기존에 퍼블릭 레포를 클론해 두었던 다른 PC에서는 최초 1회 아래 명령어로 기본 `origin`을 프라이빗 본진으로 전환한 뒤 작업:
       ```bash
       git remote rename origin public
       git remote add origin https://github.com/kidiksentrik/Calendar-On-Demand-Pro.git
       git fetch origin
       git branch --set-upstream-to=origin/main main
       git pull origin main
       ```

---

## ✅ Completed Features (최신 구현 현황)

### 0. [Unreleased / Local Ready] Google Tasks 실시간 양방향 동기화 & Pro UI (v1.7.0 준비 단계)
- [x] **점진적 OAuth 권한 요청 (Incremental Authorization, `auth.js`)**:
  - 기본 로그인(`SCOPES`)은 기존과 동일하게 `https://www.googleapis.com/auth/calendar`만 유지하여 기존/신규 무료 유저에게 재로그인이나 미인증 경고창이 절대 뜨지 않도록 완벽 분리.
  - 서랍장에서 `Google` 모드를 선택하고 `Connect Google Tasks`를 클릭했을 때만 `https://www.googleapis.com/auth/tasks` 스코프를 점진적으로 추가 요청(`authenticateTasksScope`)하고 기존 토큰에 병합 저장.
- [x] **Google Tasks API v1 실시간 양방향 싱크 엔진 (`calendar.js`, `main.js`, `widget.js`)**:
  - 유저 구글 계정의 실제 태스크 리스트 목록(`getTaskLists`) 자동 조회 및 드롭다운 선택(계정 언어 설정에 따라 `My Tasks`, `내 할 일 목록` 등 네이티브 표시).
  - 할 일 추가(`createGoogleTask`), 인라인 텍스트 수정(`updateGoogleTask`), 완료/미완료 토글, 개별 삭제(`deleteGoogleTask`), 완료 항목 일괄 정리(`clearCompletedGoogleTasks` — `Clear completed (N)`) 0ms 낙관적 업데이트 및 양방향 실시간 반영.
  - 서랍장 상단 수동 동기화(`🔄`) 스피너 버튼 및 캘린더 백그라운드 동기화 시 Google Tasks 자동 갱신 연동.
- [x] **타임블로킹 & 스마트 완료 연동 Google Tasks 완벽 호환**:
  - Google Tasks 항목을 월간/주간 캘린더로 드래그 앤 드롭하여 타임블로킹 일정 생성.
  - 캘린더에서 해당 일정을 모두 완료(`[x]`) 체크 시 Google Tasks 서버의 원본 할 일까지 자동으로 `completed` 처리(체크 해제 시 `needsAction` 복귀).
- [x] **Google 시그니처 120fps GPU 코닉 라이트 빔(Conic Light Beam) 마이크로 인터랙션 (`styles.css`)**:
  - 서랍장 상단 `Local` | `✓ Google` 소스 스위치 중 `✓ Google` 버튼에 마우스 호버 시, 구글 4색(`#4285f4`, `#34a853`, `#fbbc05`, `#ea4335`) 빛줄기가 테두리를 따라 부드럽게 회전하는 프리미엄 시각 효과 적용.
  - CPU 리페인트를 유발하는 커스텀 프로퍼티 애니메이션 대신 GPU 컴포지터 레이어(`transform: translate(-50%, -50%) rotate()`) + 상시 예열(`animation-play-state: paused -> running`) 방식을 적용하여 첫 호버 시 잔렉(Stutter) 0% 달성.

### 1. v1.6.0 투두 서랍장 & 타임블로킹 & 스마트 완료 연동 (Local Tasks, Time-blocking & Smart Sync)
- [x] **로컬 투두 서랍장 (Tasks Drawer) & Aero Glassmorphism**:
  - 상단 헤더의 체크리스트 아이콘 또는 전역 단축키 `Alt+T` (인앱 `T`, `Esc`)로 서랍장 여닫기.
  - 미완료 태스크 개수 실시간 뱃지 카운트 표시.
  - 할 일 추가, 인라인 텍스트 편집, 완료 체크(Web Audio 차임 효과음), 삭제, 필터 탭(All / Active / Done).
  - 영구 로컬 저장 (`electron-store`) 및 향후 클라우드 연동 호환 스키마 (`{ id, title, notes, status, due, createdAt }`).
- [x] **타임블로킹 드래그 앤 드롭 (Time-blocking Drag & Drop)**:
  - 서랍장의 할 일을 월간 뷰 날짜 칸으로 드래그: 해당 날짜의 종일/시간 일정으로 즉시 퀵애드 생성.
  - 주간 타임라인 슬롯으로 드래그: 해당 시간대(1시간 블록)로 스냅되어 즉시 퀵애드 생성.
- [x] **창 크기 고정 및 유연한 캘린더 압축 (Fixed Window Bounds & Flex Drawer)**:
  - 창 크기를 강제로 늘리지 않고 기존 창 영역을 유지하며, 서랍장이 열릴 때 캘린더 영역이 유연하게 줄어들고 서랍장이 슬라이드 인.
  - 화면 우측에 창을 고정해 두고 쓰는 환경에서도 화면 밖으로 삐져나가지 않음.
- [x] **스마트 태스크 완료 연동 (Smart Task Completion Sync)**:
  - 캘린더에서 일정 완료 체크(`[x]`) 시, 해당 태스크의 남은 캘린더 일정이 없으면 서랍장 태스크도 자동으로 `Done` 처리.
  - 동일 태스크를 여러 날에 나눠 배치한 경우, 마지막 일정까지 모두 체크되어야 비로소 태스크 완료.
  - 캘린더 일정 삭제는 태스크를 삭제하지 않고 안전하게 독립 보존.
- [x] **버그 픽스 & UI 개선**:
  - 설정창의 가로 스크롤바 제거 및 계정 목록의 `Logout` 버튼 잘림 버그 완벽 수정.
  - 자연어 시간 파싱 Regex 버그 수정 (`Test 1500` 입력 시 `Tes`로 글자가 잘리던 정규표현식 결함 해결).

### 2. v1.5.7 전역 토글 핫키 프리셋 & 창 위치 제로드리프트 (Global Hotkey & Precision Positioning)
- [x] **전역 창 표시/숨김 단축키(Global Toggle Hotkey) 프리셋 탑재**:
  - 설정창(Behavior)에서 `Ctrl+Shift+C (기본값)`, `Alt+C`, `Ctrl+Alt+C`, `Alt+Space`, `None` 프리셋 중 즉시 선택 가능.
  - macOS 환경 감지 시 `Ctrl` 레이블을 `Cmd`로 자동 변환 표시.
  - 풀스크린 브라우저나 타 작업 창 위에서도 단축키 하나로 최상단 즉각 팝업 (`screen-saver` 레벨).
  - 팝업 상태에서 단축키 재입력 시, 타 창을 클릭하지 않아도 Windows OS 포커스를 이전 작업 창으로 자연스럽게 인계하며 바탕화면 레이어로 자동 복귀.
- [x] **컴퓨터 재부팅/실행 시 창 위치 미세 이동(Drift) 현상 원천 차단**:
  - Windows 배율(DPI 분수 스케일링) 및 HWND 생성 시 발생하는 인위적 `move`/`resize` 이벤트를 1500ms 유예 기간(Startup Grace Period) 동안 무시.
  - 불필요한 테두리 자동 확장 원인이었던 `useContentSize: true` 제거 및 400ms 디바운스 정수형 좌표 클램핑 저장 적용.
  - 창 잠금(`lockPosition: true`) 활성화 시 저장 좌표 불변 엄격 보장.

### 2. v1.5.6 핫픽스 (Hotfix: Quick Add Timezone Offset Scope & Auto-Save Persistence)
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

## 🎯 Next Tasks & Product Roadmap (우선순위 로드맵)

### 1. [최우선] v1.7.0 Google Tasks Pro 연동 & 원타임 Freemium 런칭 (개발 완료 ✅ — 외부 심사 2건 승인 대기 중)
- [x] **Step 1. 오픈 코어 투트랙 GitHub 레포 분리 (완료 ✅)**:
  - 신규 프라이빗 본진 `kidiksentrik/Calendar-On-Demand-Pro` 생성 및 로컬 `origin` 리모트 전환 완료.
  - 기존 퍼블릭 레포 `kidiksentrik/Calendar-On-Demand`는 `public` 리모트로 유지하고, 퍼블릭에서 `HANDOFF.md` 및 `.agents/` 내부 문서를 완전 소거하여 `v1.6.0` 오픈소스 스냅샷 + 웹사이트(`docs/`) + GitHub Releases 배포 서버로 고정 완료.
- [x] **Step 2. Google Tasks 양방향 동기화 엔진 & 점진적 OAuth + GPU 라이트 빔 UI 로컬 구현 (완료 ✅)**:
  - GCP `Google Tasks API` 활성화 완료.
  - `auth.js` 점진적 권한 요청(`authenticateTasksScope` + 브라우저 탭 강제 종료 시 즉시 재시도 및 90초 타임아웃 복구 처리), `calendar.js` Google Tasks API v1 CRUD 및 `Clear completed`, `widget.js`/`styles.css` 서랍장 `Local` ↔ `✓ Google` 스위치 및 120fps GPU 코닉 라이트 빔 효과 구현 및 실기기 양방향 연동 테스트 완료.
- [x] **Step 3. Google OAuth `auth/tasks` (Sensitive Scope) 심사 제출 & 최종 승인 완료 (완료 ✅ — Approved on 2026-10-27!)**:
  - 2026-10-27 Google Third Party Data Safety Team으로부터 프로젝트 `926265289282 (calendar-on-demand)`의 `.../auth/tasks` 스코프 정식 승인 이메일 수신 완료! (미확인 앱 경고 완전 제거됨)
  - `docs/privacy.html` 및 `landing/privacy.html` 5대 필수 공시 항목 및 `docs/index.html` FAQ(`Supporter Pro Pass $5+`) 라이브 배포 완료.
- [x] **Step 4-A. 서포터 잠금 화면(`☕ SUPPORTER PERK`) & Lemon Squeezy 라이선스 키 검증 UI 구현 (완료 ✅)**:
  - `widget.html` / `styles.css` / `widget.js`: `✓ Google` 탭 선택 시 따뜻한 인디 서포터 감성의 `☕ SUPPORTER PERK` (`Support & Unlock Google Tasks`, `$5+`) 잠금 카드 및 서포터 키 입력/해제 UI 장착 완료 (한 번 `Unlock` 시 로컬 PC에 영구 귀속되어 구글 계정 재연동 시에도 결제창 재노출 없음).
  - `main.js`: Lemon Squeezy License API (`https://api.lemonsqueezy.com/v1/licenses/activate`) 연동 및 개발자 전용 마스터 키(`CAL-PRO-2026`, `SUPPORTER-DEV`) 검증 핸들러(`activate-pro-license`, `deactivate-pro-license`) 구현 완료.
- [x] **Step 4-B. Lemon Squeezy 스토어 개설, 심사 제출 & 체크아웃 URL 연결 (완료 ✅ — Store Review 대기 중)**:
  - Lemon Squeezy 스토어(`cal-ondemand.lemonsqueezy.com`, 통화 `USD`, Tax-inclusive ON, 2FA 및 신분증/계좌 인증 제출 완료) 및 상품(`Calendar-On-Demand — Supporter Pro Pass`, Pay what you want `$5+`, License Keys 무제한 기한 + 기기 활성화 한도 5대) 생성 완료.
  - 발급된 체크아웃 링크(`https://cal-ondemand.lemonsqueezy.com/checkout/buy/67e519aa-463e-4deb-b471-4f1a85d05cbe`)를 `widget.js`의 `SUPPORTER_CHECKOUT_URL`에 반영 및 실제 라이선스 키 발급/해제(`Active 1/5`) End-to-End 검증 완료.
- [ ] **Step 5. [다음 액션 — 이메일 컨펌 2건 수신 후 진행할 체크리스트]**:
  1. **Lemon Squeezy 스토어 승인 완료 메일 수신 시**:
     - 대시보드(`https://app.lemonsqueezy.com/dashboard`) 좌측 하단 `Test mode` 토글이 OFF(Live 모드)로 전환되었는지 확인.
     - Live 모드의 `Store ➔ Products`에 `Calendar-On-Demand — Supporter Pro Pass` (`$5+`, Generate license keys ON, Activation limit `5`) 상품이 동일하게 존재하는지 확인하고, 만약 Live 상품 체크아웃 URL이 Test mode 때와 달라졌다면 `widget.js` 상단 `SUPPORTER_CHECKOUT_URL`을 Live 체크아웃 링크로 교체.
  2. ~~**Google Cloud Console OAuth (`auth/tasks`) 승인 완료 메일 수신 시**~~ **(2026-10-27 정식 승인 완료 ✅)**:
     - 위젯에서 `Connect Google Tasks` 클릭 시 'Google에서 확인하지 않은 앱' 경고 화면 없이 곧바로 깔끔한 권한 동의 화면이 뜨는 상태 확보 완료.
  3. **랜딩 페이지(`docs/index.html` & `landing/index.html`) 업데이트 및 `v1.7.0` 정식 릴리즈 배포**:
     - 랜딩 페이지에 **2-way Google Tasks Sync** 및 **Supporter Pro Pass (`$5+` 원타임 후원, 1개의 라이선스 키로 최대 5대 기기까지 무료 활성화 가능)** 안내 반영.
     - 배포 전 필수 QA 4대 시나리오 및 `npm test` (0 errors, 0 warnings) 확인 후 `v1.7.0` 릴리즈 빌드하여 퍼블릭 레포(`public`)의 GitHub Releases(`latest.yml`) 및 `docs/` 업데이트 배포 (단, Pro 소스코드는 프라이빗 `origin`에만 유지).
     - 1호 Ko-fi 후원자(Oskar님)에게 감사 메시지 및 신규 발급한 `0/5` 서포터 라이선스 키 선물 발송.

### 2. macOS 단일 화면(노트북) UX 최적화 & HUD Popover 모드 (실기기 테스트 가능 시)
- **배경**: 데스크톱 멀티 모니터 고정 위젯으로 상정되어 있어, 맥북 등 단일 노트북 화면에서는 상시 노출 창이 거치적거리거나 바탕화면 클릭 시 포커스가 튀는 현상 발생.
- **해결 방안**:
  - macOS 환경을 위한 전용 **HUD Popover / 메뉴바 팝업 모드** 도입 (단축키 또는 트레이 아이콘 클릭 시만 즉각 팝업 후 포커스 이탈 시 자연스럽게 숨김).
  - 맥북 실기기 환경(귀가 후)에서 포커스 전환 및 다크 테마 시각적 완성도 검증.
- **Homebrew Cask 등록**:
  - Mac 테스트 완료 후 `brew install --cask calendar-on-demand` 공식 Cask PR 제출.

### 3. 아웃룩 & 마이크로소프트 365 캘린더 연동 (Pro Phase 2 확장)
- 현재 구글 계정 한정 멀티 계정 시스템을 Microsoft Graph API로 확장.
- 직장인/기업 유저들의 피드백 접수 추이를 모니터링하여 Pro Pass Phase 2($19 인상 시점) 핵심 기능으로 탑재.

### 4. 12시간(AM/PM) / 24시간 시간 포맷 옵션 (12-Hour vs 24-Hour Localization)
- **배경**: 현재 24시간제(`14:00`, `18:30`)가 기본 적용되어 있으나, 미국 및 글로벌 영미권 유저들은 12시간제(`2:00 PM`, `6:30 PM`)를 일상적으로 사용하여 피드백 접수됨.
- **구현 계획**:
  - 설정창(Appearance 또는 Behavior)에 `Time Format` 설정 추가: `24-Hour (14:00) [기본값]` / `12-Hour (2:00 PM)`.
  - 적용 영역:
    - 월간 뷰 마이크로 타임 뱃지 (`14:00` ➔ `2:00 PM` 또는 콤팩트 `2p`)
    - 주간 뷰 타임라인 거터 라벨 (`14:00` ➔ `2 PM`)
    - 데이 팝업 및 투두 리스트 메타 태그 (`14:00 ~ 15:00` ➔ `2:00 PM ~ 3:00 PM`)
    - 퀵애드 시간 파서 및 시간 입력 필드

### 5. 아키텍처 보안 보강 1단계 (Electron 버전 유지 상태)
- `nodeIntegration: false` + `contextIsolation: true` + `preload.js` IPC 브리지 도입 → XSS→RCE 사슬 원천 차단.
- `widget.html`에 CSP 메타 태그 추가 (`script-src 'self'`).
- 이벤트 `description` 렌더링 시 `innerHTML` → DOMPurify 적용.
- `shell.openExternal` 호출 URL에 `http(s)://` 프로토콜 화이트리스트 검증 추가.

---

## ⚠️ Important Rules & Cautions (개발 및 배포 시 반드시 준수)

1. **버전 및 릴리즈 규칙**:
   - **사용자가 명시적으로 릴리즈를 요청할 때만** 버전을 올리고 배포를 트리거함.
   - 사소한 버그 수정이나 점진적 개발 시에는 임의로 버전을 올리지 않음.
2. **웹사이트 동기화 규칙**:
   - GitHub Pages의 퍼블리시 루트는 퍼블릭 레포(`public`)의 `docs/`이지만, 소스 트리에는 `landing/`도 함께 존재함.
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
5. **HANDOFF.md 상시 업데이트 및 투트랙 레포 보안 규칙** [필수 📝]:
   - 매 작업(기능 개발, 버그 수정, 보안 보강 등) 종료 시 **반드시 HANDOFF.md를 최신 상태로 업데이트**함.
   - 다른 컴퓨터/에이전트에서 작업을 이어받을 때 이 문서만 읽고도 전체 맥락을 파악할 수 있도록 변경 내용, 결정사항, 남은 할 일을 항상 반영함.
   - **투트랙(Dual-Track) 레포 운용**:
     - 모든 신규 코드 및 `HANDOFF.md` 커밋은 **프라이빗 본진(`origin`: `Calendar-On-Demand-Pro`)**에만 푸시함.
     - 퍼블릭 레포(`public`: `Calendar-On-Demand`)는 랜딩 페이지(`docs/`) 업데이트 및 GitHub Releases 설치 파일 배포 용도로만 사용하며, Pro 소스코드나 최신 `HANDOFF.md`를 퍼블릭 레포에 푸시하지 않음.
6. **보안 취약점 현황 (2026-10-11 기준)**:
   - `nodeIntegration: true` + `contextIsolation: false` — XSS 발생 시 RCE로 이어질 수 있음. preload.js 브리지 도입 필요.
   - Content Security Policy (CSP) 없음.
   - 이벤트 `description`을 `innerHTML`로 렌더링하는 경로 존재 (`_showEventDetails` 함수).
   - `shell.openExternal` 호출 시 URL 스킴 검증 없음.
   - 의존성 취약점 27개 (런타임: fast-uri, js-yaml, node-forge, uuid).
   - **주의**: 악성 코드나 백도어는 없으나, 아키텍처 수준의 보안 보강이 필요한 상태. Next Tasks의 1번(보안 보강 1단계) 참고.
