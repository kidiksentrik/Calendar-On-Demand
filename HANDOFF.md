# HANDOFF.md - Calendar on Demand

## 📌 Project Overview
- **Product**: **Calendar on Demand** (v1.5.3)
- **Concept**: Windows/macOS 데스크톱 트레이에서 바로 열고 쓰는 빠르고 미려한 Google Calendar & Todo 위젯.
- **Current Version**: `v1.5.3` (Google Calendar 24 Official Colorways, Adaptive Contrast Typography & Time Picker Auto-Save)
- **Live Landing Page**: GitHub Pages (`docs/` & `landing/`) with Custom Domain + GA4 (`G-DTN5BM6653`)

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
  ├── Day Cell / Todo Modal (Quick Add, Edit, Delete, [x] Done Toggle)
  ├── Web Audio API Synthesized Chime Sounds (Task Complete / Uncomplete)
  ├── Tag System: [IMPORTANT], [HIGHLIGHT], [COLOR:#hex], [x]
  └── Meeting Direct Join (📹 Google Meet / Video Conference)
```

- **Runtime**: Electron 31+
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism, CSS Variables Theme System), JavaScript (ESNext)
- **Google API**: OAuth 2.0 (`google-auth-library`), Google Calendar API v3 (`googleapis`)
- **Release Automation**: `release.ps1` (Version Bump, Build, Git Tag & Push, GitHub Actions Mac/Win CI)

---

## ✅ Completed Features (v1.4.0 Status)

### 1. 캘린더 & 투두 핵심 기능
- [x] **Google Calendar 동기화**: 15분 주기 자동 백그라운드 동기화 + 수동 동기화 + 에러 시 지수 백오프 재시도.
- [x] **다중 계정 (Multi-Account) 지원**:
  - 복수 Google 계정 로그인 및 저장.
  - 계정별/캘린더별 개별 표시 On/Off 체크박스.
  - 투두 목록에서 계정 뱃지(Badge) 표시.
- [x] **투두 & 일정 인터랙션**:
  - 날짜 클릭 시 해당 날짜의 Todo Modal 팝업.
  - **직접 시간 입력 (Time Picker) & 스마트 연동 & 가독성 강화**:
    - **디폴트 시간 지정 활성화**: 모달 오픈 시 `All-day`가 기본 해제되어 바로 현재 시간대(다음 정각~+1시간)로 타임 피커가 활성화됨 (종일 일정 시 클릭 한 번으로 전환).
    - **캘린더 그리드 시간 표시**: 시작 시간이 있는 일정은 `10:00 미팅`처럼 시간 접두사가 자동으로 표시되어 한눈에 확인 가능.
    - **투두 모달 타임 뱃지**: 등록된 할 일 목록 옆에 `10:00 - 11:00` 형태의 스마트 타임 뱃지(`todo-time-tag`) 자동 노출.
    - **스마트 자연어 파싱 & 수정 연동**: 텍스트 입력(`14:00 미팅`) 시 타임 피커 자동 동기화 및 기존 일정 수정 클릭 시 시간 자동 채움.
  - `[x]` 토글: 클릭 즉시 로컬 상태 반영 (0ms Optimistic UI) + Web Audio API 신스 차임 사운드 재생 + 백그라운드 API 동기화.
  - 구글 미트 회의 링크 감지 시 `📹 Join` 버튼 자동 노출 (외부 브라우저로 열기).
  - 일정 수정 및 삭제 (`✕` 버튼).
  - 특수 태그 지원: `[IMPORTANT]`(별표 표시), `[HIGHLIGHT]`(셀 전체 강조), `[COLOR:#hex]`(엔트리/셀 색상 커스텀).

### 2. UI/UX 및 커스터마이징
- [x] **외형 커스텀**:
  - Background Color, Opacity (0.1~1.0), Text Color, Accent Color.
  - **Today Highlight Color**: 오늘 날짜 테두리/뱃지 색상 자유 지정.
- [x] **동작 커스텀**:
  - Launch on startup (윈도우 부팅 시 자동 실행).
  - Always on Top (항상 위에 표시).
  - Lock Position (창 드래그 방지).
  - Stick to Desktop (바탕화면 고정 위젯 모드).
  - Sound Effects (완료 차임벨 On/Off 토글).
  - Start of Week (일요일 / 월요일 시작 선택).

### 3. 랜딩 페이지 & 인프라
- [x] GitHub Pages 배포 (`docs/` 및 `landing/` 동기화).
- [x] Google Analytics GA4 태그 (`G-DTN5BM6653`) 및 앱 다운로드 이벤트 로깅.
- [x] v1.5.0 업데이트 안내 배너 & What's New 체인지로그.
- [x] 월간 뷰(Month View) & 주간 타임라인(Weekly Timeline) 듀얼 뷰(Dual View) 나란히 보기 및 인터랙티브 뷰 스위처 쇼케이스.
- [x] 신뢰도 뱃지 250+ Users 업데이트 (GA4 활성 사용자 기반).

---

## 🎯 Next Tasks (Immediate Priorities)

### 1. 🚀 예정 개선 과제 (회사에서 진행 가능한 아이템)
- [x] **데스크톱 알림 (Notification)**:
  - 설정(Settings) > Notifications 토글 (`#notifications-enabled-check`) 및 알림 시간 선택 필 버튼 (`5m`, `10m`, `15m`, `30m`).
  - Windows 네이티브 토스트 알림 및 OS 알림 꺼짐 안내 문구 제공.
  - 1분 주기 백그라운드 스케줄러 (`checkUpcomingNotifications`).
- [x] **자정 교차 일정(Cross-midnight) 분할 & 연속성 표시 (주간 & 월간 뷰)**:
  - **주간 뷰(Weekly View)**: 시작일 하단 점선 테두리 + `→` 화살표, 익일 상단 점선 테두리 + `↩` 화살표로 분할 렌더링.
  - **월간 뷰(Month View)**: 시작일 우측 점선 테두리 + 우측 flat 모서리 + `→`, 익일 좌측 점선 컬러바 + 좌측 flat 모서리 + `↩` 화살표로 퍼즐처럼 연결된 카드 렌더링.
  - 일정 생성 시 종료 시간이 시작 시간보다 빠르면 익일 날짜로 자동 산출하여 Google API 오류 방지.
  - 월간/주간 뷰 양쪽에서 익일 연결 카드 클릭 시에도 원본 일정 편집 모달 즉시 연동.
- [x] **Ko-fi 후원 버튼**: 설정(Settings) 헤더에 은은한 ☕ Buy me a coffee 버튼 연동.
- **Global Hotkey (글로벌 단축키)**: `Ctrl+Shift+C` 또는 `Alt+C` 등으로 백그라운드 상태의 위젯 즉시 포커스 / 토글.
- **반복 일정(Recurrence) 생성 & 표시**: 주간/월간 반복 룰 지원.
- **시간 직접 입력 UI 추가 고도화**: 분 단위 15분/30분 스냅 버튼 등 편의성 강화 (필요 시).

### 2. 📝 User Feedback Backlog
- [x] **일정 종료 시간(End Time) 커스텀 입력값 유지 (1시간 강제 리셋 버그 수정)**:
  - 사용자가 종료 시간(`eventEndTime`)을 수동으로 변경한 경우 플래그(`isEndTimeUserModified`)로 기억하여 불필요한 자동 덮어쓰기 방지.
  - 시작 시간 변경 시 기존 설정된 커스텀 duration 유지.
  - 자연어 파싱 시에도 단일 시간 감지가 기존에 설정된 커스텀 종료 시간을 임의로 초기화하지 않도록 예외 처리 완료.
- [x] **일정 시간/Duration 표시 개선 (설정 옵션화)**:
  - 설정(Settings) > Appearance에서 `Event Time Style` 선택 지원:
    - **옵션 1 (Start time only)**: 기존 심플 시작 시간만 표시 (`10:00 미팅`).
    - **옵션 2 (Duration 축약 표기)**: 글자 수를 대폭 절약하는 `10:00 (1h)` / `10:00 (+1.5h)` 형태의 간결한 소요 시간 표기.
    - **옵션 3 (상단 마이크로 뱃지)**: 제목 윗줄에 0.65rem의 작은 폰트로 `10:00 - 11:00` 분리 노출하여 제목 가독성 유지.
- [x] **주간 뷰(Weekly View) 구글 캘린더 스타일 세로 타임라인 그리드 고도화**:
  - 헤더 우측 미니멀 32px 아이콘 버튼(`📅` ↔ `📆`) 추가 및 툴팁 제공.
  - 단축키 `W` (주간 뷰) / `M` (월간 뷰) 전환 지원.
  - 00:00~23:00 세로 타임라인 그리드, 실제 일정 시작/종료 시간에 비례한 블록 배치 및 클러스터 중복(Overlap) 컬럼 자동 분할.
  - 상단 종일(All-day) 일정 전용 섹션 제공.
  - 현재 시각 실시간 레드 인디케이터 라인 & 자동 스마트 스크롤 지원.
  - 빈 타임라인 슬롯 클릭 시 해당 날짜/시간으로 일정 추가 모달 자동 팝업.
  - 설정(Settings) > Behavior에서 `Default View` (Month / Week) 영구 저장 지원.
- [x] **일정 시간 표시 스타일 (Micro-time 11:30 ~ 13:40 상단 배치)**:
  - 설정(Settings) > Appearance에서 `Event Time Style` 지원 (Micro time on top / Start time only / Compact duration).
  - 카드 상단에 0.62rem `11:30 ~ 13:40` 마이크로 타임 배치로 긴 텍스트 침해 없이 시각적 정보성 극대화.
- [x] **최소 창 크기 제한(Min-size) 및 소형 창 반응형 레이아웃 강화**:
  - Windows Frameless Transparent 창에서 OS가 `minWidth`를 무시하고 마우스 드래그 축소를 허용하는 문제를 해결하기 위해 Electron `will-resize` 이벤트에서 `newBounds.width < 370 || newBounds.height < 430` 감지 시 `event.preventDefault()`로 마우스 축소 차단.
  - `resize` 이벤트에서도 `mainWindow.setSize(Math.max(370, w), Math.max(430, h))`로 강제 스냅 보정 및 `saveBounds` 저장 시 클램핑 적용.
  - CSS 그리드 5개 영역(`calendar-grid-header`, `calendar-days`, `week-header-days`, `week-allday-days`, `week-days-columns`)을 `repeat(7, minmax(0, 1fr))`로 변경하여 내부 콘텐츠로 인한 주말 컬럼 잘림 방지.
  - 헤더 우측 버튼 그룹(`📅 📌 🔄 ⚙️`)에 `flex-shrink: 0; gap: 6px;` 적용 및 월 제목 `clamp` 폰트 적용.
- [x] **윈도우 11 첫 실행 시 화면 중앙 배치 및 최상단 포커스 강제 (오프스크린 방지)**:
  - 초기 실행 시 저장된 좌표가 없거나(`undefined`), 다중 모니터 분리 등으로 인해 좌표가 유효 모니터 화면 밖(Off-screen)에 있을 경우 `screen.getAllDisplays()`로 검증 후 자동으로 화면 정중앙(`mainWindow.center()`)으로 리셋.
  - 최초 실행 시 크롬 등 전체화면 프로그램 뒤에 가려지지 않도록 일시적으로 `setAlwaysOnTop(true, 'screen-saver')` 후 최상단 포커스 부여 (1초 후 유저 설정 복귀).
  - 중복 실행(`second-instance`) 시에도 화면 밖 좌표 감지 시 즉시 중앙으로 소환 및 최상단 포커스.
- [x] **랜딩 페이지 SEO & AI 추천 엔진(ChatGPT/Perplexity) 최적화 (Step 1)**:
  - `docs/index.html` 및 `landing/index.html`에 Schema.org JSON-LD 구조화 데이터(`SoftwareApplication` 및 `FAQPage`) 탑재.
  - 메타 설명, 키워드, OpenGraph, Twitter Card 태그를 영어 글로벌 타겟으로 보강.
  - 웹사이트 하단 및 네비게이션에 8개 핵심 질의응답(FAQ: Notion Calendar 비교, 보안/OAuth, 다중 계정, 양방향 동기화, 무료/오픈소스 등) 반응형 섹션 추가.
  - Google Search Console 색인 및 크롤러 가이드 최적화: `rel="canonical"` 대표 도메인 명시, `sitemap.xml` 및 `robots.txt` 구축.
- [x] **구글 캘린더 공식 24종 컬러웨이 완전 연동 & 양방향 동기화 (`eventLabelVersion: 1`)**:
  - 최신 Google Calendar 웹의 `labelProperties.eventLabels` 아키텍처 연동 (코코아 `#795548` 등 24종 전체 지원).
  - 기존 구글 캘린더 웹/앱의 제목에 `[COLOR:#hex]` 태그가 노출되던 문제를 완전 제거하고 네이티브 라벨 ID로 깔끔하게 저장.
  - Quick Add 모달에 12열 × 2행 미니멀 24색 스와치 및 `Default` (캘린더 기본색) 버튼 탑재.
- [x] **배경 명도 기반 동적 텍스트 대비(Adaptive Contrast) 타이포그래피**:
  - 배경 색상의 밝기(YIQ/Luminance)를 계산하여 바나나, 레몬, 아보카도, 피스타치오, 샌드, 플라밍고, 라벤더 등 밝거나 중간 톤 배경에는 또렷한 다크 텍스트(`#18181b`, `font-weight: 600`, 그림자 제거) 자동 적용.
  - 토마토, 바질, 그레이프, 코발트, 코코아 등 어두운 배경에서만 가독성을 보장하기 위해 화이트 텍스트(`#ffffff`, 드롭 섀도우) 유지.
  - 마우스 호버 시 `!important`로 인해 커스텀 배경색이 회색으로 가려지던 CSS 버그 수정 (`brightness(1.08)`로 고유 색상 유지).
- [x] **타임 피커 UI 잘림 해소 & 모달 바깥 클릭 시 시간 자동 저장(`handleAutoSaveAndClose`)**:
  - 타임 피커 폭을 96px로 확장하여 12시간제(`03:00 PM`) 및 24시간제에서 시계 아이콘과 텍스트가 잘리지 않도록 레이아웃 최적화.
  - 모달 바깥 영역 클릭 시 실행되는 변경 감지 로직에 시작/종료 시간(`originalStartTime/EndTime` vs `currentStartTime/EndTime`) 비교를 추가하여, 시간만 변경하고 닫아도 구글 캘린더에 완벽하게 자동 반영되도록 수정.
  - 일정 수정 모드 진입 시 실제 시작 날짜 동기화 보강.
- [ ] **Windows 'winget' & macOS 'Homebrew' 패키지 매니저 등록**:
  - `winget install kidiksentrik.calendar-on-demand` 및 `brew install --cask calendar-on-demand` 등록 추진.
- [ ] **커스텀 디자인 옵션 추가**: '오늘' 및 '주말' 하이라이트 색상 커스텀, 이모지 대신 텍스트 색상과 어울리는 모노톤(단색) 심플 아이콘 옵션.
- [x] *(참고)* **다중 계정 연동**: 피드백에 요청되었으나 v1.4.0에서 이미 구현 완료된 기능.

---

## ⚠️ Important Rules & Cautions
- **버전 및 릴리즈 규칙**:
  - `release.ps1`은 **사용자가 명시적으로 릴리즈를 요청할 때만** 실행하며, 단순 기능 추가나 수정 시에는 버전을 올리지 않음.
- **Google OAuth**:
  - 토큰 갱신 실패 시 `reset-auth` IPC를 통해 재로그인 유도.
  - `credentials.json`과 로컬 토큰 파일은 절대 외부에 노출되지 않도록 주의.
