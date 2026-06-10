<div align="center">

# 🏫 전주영생고등학교 커뮤니티

전주영생고등학교 학생들을 위한 **비공식 학생 커뮤니티**입니다.
게시판 · 실시간 채팅 · 급식/시간표 조회 · 미니게임까지 한곳에서.

<br/>

![Node.js](https://img.shields.io/badge/Node.js-ESM-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-better--sqlite3-003B57?logo=sqlite&logoColor=white)
![Playwright](https://img.shields.io/badge/Tests-Playwright-2EAD33?logo=playwright&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

</div>

---

## ✨ 소개

별도의 빌드 도구 없이 동작하는 **Node.js + Express + SQLite 기반 게시판 SPA**입니다.
서버는 JSON API와 정적 파일을 함께 제공하고, 프론트엔드는 순수 HTML/CSS/JavaScript로 작성되어 `public/app.js`의 **해시 라우팅**으로 화면을 전환합니다.

- 📦 빌드 단계 없음 — `npm install` 후 바로 실행
- 🗄️ 파일 기반 SQLite — 별도 DB 서버 불필요
- 🌐 [NEIS 교육정보 개방 포털](https://open.neis.go.kr/) 연동으로 **실시간 급식·시간표** 제공

---

## 🚀 주요 기능

| 분류 | 기능 |
| --- | --- |
| 📋 **게시판** | 10개 게시판, 글 목록·페이지네이션, 글쓰기/상세, 조회수 집계 |
| 💬 **댓글** | 댓글 작성/삭제, 비밀번호 기반 삭제 |
| 👍 **투표** | 개념추천/싫어요, IP + 쿠키 토큰 기반 중복 투표 방지 |
| #️⃣ **해시태그** | 본문에서 `#태그` 자동 추출 및 태그별 검색 |
| 🏆 **랭킹** | 추천 수 기준 인기글 TOP 10, 해시태그 클라우드 |
| 🔐 **인증** | 회원가입/로그인, 세션(Bearer 토큰), 권한(user/admin), 계정 상태(active/blocked) |
| 🛡️ **자동 관리** | 신고 누적 시 글 자동 삭제, 삭제 누적 작성자 자동 차단(밴) |
| 🧑‍💼 **관리자** | 통계 대시보드, 글 수정/삭제, 유저 권한·상태·비밀번호 관리 |
| 🗨️ **실시간 채팅** | 전체 채팅방 (최근 80개 메시지) |
| 🍚 **급식·시간표** | NEIS API 연동 실시간 급식 / 학년·반별 시간표 |
| 🎮 **미니게임** | 타깃 게임 + 지뢰찾기 (최고 기록 저장) |
| 🌐 **부가 기능** | 언어 지원, 반응형 레이아웃, 숨겨진 이스터에그 🐈 |

---

## 🛠️ 기술 스택

- **런타임** — Node.js (ES Modules, `"type": "module"`)
- **서버** — [Express 4](https://expressjs.com/)
- **데이터베이스** — SQLite + [`better-sqlite3`](https://github.com/WiseLibs/better-sqlite3)
- **프론트엔드** — 순수 HTML / CSS / JavaScript (빌드 도구 없음)
- **외부 API** — NEIS 교육정보 개방 포털 (급식·시간표)
- **테스트** — [Playwright](https://playwright.dev/)

---

## 📁 프로젝트 구조

```text
.
├─ server.js          # Express 앱 · API 라우트 · 정적 서빙 · 신고/차단/투표/NEIS/관리자 로직
├─ db.js              # SQLite 연결 · 테이블 생성 · 마이그레이션
├─ package.json
├─ community.db       # SQLite 데이터 파일 (+ -shm / -wal 보조 파일)
├─ public/            # 프론트엔드
│  ├─ index.html      # SPA 기본 HTML (헤더/푸터/모달)
│  ├─ app.js          # 라우팅 · 화면 렌더링 · API 호출 · 인증/게시글/댓글 UI
│  ├─ game.js         # 미니게임 (타깃 · 지뢰찾기)
│  ├─ style.css       # 전체 레이아웃 / 반응형 스타일
│  └─ assest/         # 로고 · 이스터에그 SVG
└─ tests/             # Playwright 테스트
   ├─ popular-ranking.spec.js
   └─ logo-easter-egg.spec.js
```

---

## ⚡ 빠른 시작

### 1. 설치

```powershell
npm install
```

### 2. 실행

```powershell
# 로컬 개발 시 3000 포트 권장 (Windows에서 80 포트는 권한 문제 발생 가능)
$env:COMMUNITY_PORT = "3000"
npm start
```

브라우저에서 **http://localhost:3000** 접속 🎉

### 3. 개발 모드 (파일 변경 시 자동 재시작)

```powershell
$env:COMMUNITY_PORT = "3000"
npm run dev
```

> **기본 관리자 계정** — 서버 첫 실행 시 자동 생성됩니다.
> 계정이름 `admin` / 비밀번호 `admin1234` (운영 환경에서는 반드시 변경하세요)

---

## ⚙️ 환경 변수

| 이름 | 기본값 | 설명 |
| --- | ---: | --- |
| `COMMUNITY_HOST` | `0.0.0.0` | 서버 바인딩 주소 |
| `COMMUNITY_PORT` | `80` | 서버 포트 |
| `REPORT_THRESHOLD` | `5` | 신고 누적 시 게시글 자동 삭제 기준 |
| `BAN_DELETE_THRESHOLD` | `10` | 작성자 자동 차단이 발생하는 삭제 누적 수 |
| `BAN_DAYS` | `10` | 작성자 차단 기간(일) |
| `NEIS_API_KEY` | 내장 기본키 | NEIS 교육정보 개방 포털 API 키 |

---

## 📋 게시판 목록

| ID | 이름 | | ID | 이름 |
| --- | --- | --- | --- | --- |
| `free` | 💬 자유게시판 | | `study` | 📚 공부/입시 |
| `humor` | 😂 유머게시판 | | `sports` | ⚽ 운동/체육 |
| `info` | 📢 정보게시판 | | `game` | 🎮 게임게시판 |
| `religion` | 🛐 종교게시판 | | `meal` | 🍚 밥 추천 |
| `school` | 🏫 생활 | | `paint` | 🖌️ 그림게시판 |

---

## 🔌 API

<details>
<summary><b>게시판 · 게시글 · 댓글</b></summary>

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/boards` | 게시판 목록 |
| `GET` | `/api/boards/:boardId/posts?page=1` | 게시판별 글 목록 |
| `GET` | `/api/posts/:id` | 게시글 상세 · 댓글 · 해시태그 · 내 투표 상태 |
| `POST` | `/api/boards/:boardId/posts` | 게시글 작성 |
| `POST` | `/api/posts/:id/delete` | 게시글 삭제 (비밀번호) |
| `POST` | `/api/posts/:id/comments` | 댓글 작성 |
| `POST` | `/api/comments/:id/delete` | 댓글 삭제 (비밀번호) |

</details>

<details>
<summary><b>랭킹 · 해시태그 · 투표 · 신고</b></summary>

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/ranking/posts` | 추천 수 기준 인기글 TOP 10 |
| `GET` | `/api/hashtags` | 상위 해시태그 목록 |
| `GET` | `/api/hashtags/:tag/posts` | 특정 해시태그가 붙은 글 목록 |
| `POST` | `/api/posts/:id/vote` | 개념추천/싫어요 (`{ type: "up" \| "down" }`) |
| `POST` | `/api/posts/:id/report` | 신고 |

</details>

<details>
<summary><b>인증</b></summary>

| Method | Path | 설명 |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | 회원가입 (사용자명 · 계정이름 · 이메일 · 비밀번호) |
| `POST` | `/api/auth/login` | 로그인 → 세션 토큰 발급 |

</details>

<details>
<summary><b>채팅 · 학교 정보 (NEIS)</b></summary>

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/chat/messages` | 최근 채팅 메시지 (80개) |
| `POST` | `/api/chat/messages` | 채팅 메시지 전송 |
| `GET` | `/api/school/meals?date=YYYYMMDD` | 급식 정보 |
| `GET` | `/api/school/timetable?date=&grade=&classNm=` | 학년·반별 시간표 |

</details>

<details>
<summary><b>관리자 (🔒 admin 권한 필요)</b></summary>

| Method | Path | 설명 |
| --- | --- | --- |
| `GET` | `/api/admin/overview` | 통계 대시보드 (글/댓글/유저/신고/채팅 수) |
| `GET` | `/api/admin/posts` | 전체 게시글 목록 |
| `PUT` | `/api/admin/posts/:id` | 게시글 수정 |
| `DELETE` | `/api/admin/posts/:id` | 게시글 삭제 (연관 데이터 정리) |
| `GET` | `/api/admin/users` | 전체 유저 목록 |
| `PATCH` | `/api/admin/users/:id` | 유저 권한/상태 변경 |
| `PATCH` | `/api/admin/users/:id/password` | 유저 비밀번호 변경 |
| `DELETE` | `/api/admin/users/:id` | 유저 삭제 |

</details>

> 관리자 API는 `Authorization: Bearer <token>` 헤더가 필요합니다.

---

## 🗺️ 화면 라우팅 (해시 기반)

| Hash | 화면 |
| --- | --- |
| `#/` | 홈 (인기글 · 해시태그 · 게시판별 최근 글) |
| `#/board/:id` | 게시판 글 목록 |
| `#/board/:id/write` | 글쓰기 |
| `#/post/:id` | 게시글 상세 |
| `#/search/hashtag/:tag` | 해시태그 검색 결과 |
| `#/chat` | 실시간 채팅 |

---

## 🗄️ 데이터베이스

`db.js`의 `initDB()`가 테이블 생성과 컬럼 마이그레이션을 자동으로 처리합니다 (`WAL` 모드, 외래키 ON).

| 테이블 | 설명 |
| --- | --- |
| `users` | 사용자 계정 (권한 · 상태 · 레벨/경험치) |
| `posts` | 게시글 (조회수 · 추천 · 싫어요) |
| `comments` | 댓글 |
| `post_votes` | 게시글 투표 기록 (중복 방지용) |
| `hashtags` | 게시글 해시태그 |
| `reports` | 신고 기록 |
| `author_stats` | 작성자별 삭제 누적 통계 |
| `bans` | 작성자 차단 정보 |
| `chat_messages` | 실시간 채팅 메시지 |

---

## 🧪 테스트

```powershell
# 인기글 랭킹 테스트
npm run test:popular

# 전체 Playwright 테스트
npx playwright test
```

---

## 🩹 트러블슈팅

<details>
<summary><b><code>better_sqlite3.node was compiled against a different Node.js version</code></b></summary>

<br/>

`better-sqlite3`의 네이티브 바이너리와 현재 Node.js 버전이 맞지 않을 때 발생합니다.
같은 Node 버전에서 재빌드하거나 의존성을 다시 설치하세요.

```powershell
npm rebuild better-sqlite3
```

또는

```powershell
Remove-Item -Recurse -Force node_modules
npm install
```

</details>

---

## ⚠️ 참고 / 보안 주의사항

> 이 프로젝트는 학생 커뮤니티용으로, 운영 배포 시 다음 사항을 보완하는 것을 권장합니다.

- 비밀번호(계정·게시글·댓글)가 **평문으로 저장**됩니다 → 해시 저장 필요
- 신고 API는 동일 사용자의 중복 신고를 막지 않습니다
- 투표 중복 방지는 애플리케이션 로직으로만 처리되며 DB 유니크 제약은 없습니다
- 데이터 파일(`community.db*`)과 `node_modules`가 저장소에 포함될 수 있으니 `.gitignore` 설정을 권장합니다

---
dltjwls8147-mint
## 📄 License

MIT

<div align="center">
<br/>
전주영생고등학교 커뮤니티 &copy; 2026 · 비공식 학생 커뮤니티
</div>
