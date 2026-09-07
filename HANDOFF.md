# HANDOFF.md - Calendar on Demand

## 📌 Project Overview
- **Product**: **Calendar on Demand** (v1.5.0)
- **Concept**: Windows/macOS 데스크톱 트레이에서 바로 열고 쓰는 빠르고 미려한 Google Calendar & Todo 위젯.
- **Current Version**: `v1.5.0` (Weekly Timeline View, Micro-time Display, End Time Fix, Window Min-size & Responsive Grid)
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

---

## 🎯 Next Tasks (Immediate Priorities)

### 1. 🚀 예정 개선 과제 (회사에서 진행 가능한 아이템)
- **Global Hotkey (글로벌 단축키)**: `Ctrl+Shift+C` 또는 `Alt+C` 등으로 백그라운드 상태의 위젯 즉시 포커스 / 토글.
- **데스크톱 알림 (Notification)**: 다가오는 일정 10분/15분 전 윈도우/맥 네이티브 알림 알림음 발송.
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
- [ ] **커스텀 디자인 옵션 추가**: '오늘' 및 '주말' 하이라이트 색상 커스텀, 이모지 대신 텍스트 색상과 어울리는 모노톤(단색) 심플 아이콘 옵션.
- [x] *(참고)* **다중 계정 연동**: 피드백에 요청되었으나 v1.4.0에서 이미 구현 완료된 기능.

---

## ⚠️ Important Rules & Cautions
- **버전 및 릴리즈 규칙**:
  - `release.ps1`은 **사용자가 명시적으로 릴리즈를 요청할 때만** 실행하며, 단순 기능 추가나 수정 시에는 버전을 올리지 않음.
- **Google OAuth**:
  - 토큰 갱신 실패 시 `reset-auth` IPC를 통해 재로그인 유도.
  - `credentials.json`과 로컬 토큰 파일은 절대 외부에 노출되지 않도록 주의.
