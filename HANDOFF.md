# 짓다(IF) 인수인계 · 2026-08-02

다른 환경(다른 PC · 다른 세션)에서 이어서 작업하기 위한 문서.
새 세션 첫 메시지로 이 파일 내용을 붙여넣거나 `HANDOFF.md 읽고 이어서 작업해줘` 라고 하면 됨.

---

## 1. 프로젝트 개요

| 항목 | 값 |
|---|---|
| 이름 | **IF** (구 짓다) — 웹툰 오픈 플랫폼 |
| 저장소 | `https://github.com/yj78615-blip/jitda` |
| 배포 | `https://jitda-epl2.vercel.app` (Vercel Hobby) |
| 로컬 경로 | `C:\Users\kor\jitda` |
| 브랜치 | `main` (직접 푸시 중, PR 없음) |
| 최신 커밋 | `4ca2bef` |

**스택**
- Next.js 15 App Router (Server Components + `'use client'` 혼용)
- Prisma ORM + Supabase PostgreSQL (도쿄 `ap-northeast-1`)
- Supabase Storage (버킷명 `images`) — presigned URL 업로드
- Vercel 서버리스, 함수 리전 **`hnd1`(도쿄)** 로 고정 (`vercel.json`)

---

## 2. 환경 설정 (새 PC 세팅)

```bash
git clone https://github.com/yj78615-blip/jitda.git
cd jitda
npm install
npx prisma generate
```

**`.env` 파일이 필요함 (gitignore 되어 있어 clone 에 안 딸려옴).**
기존 PC `C:\Users\kor\jitda\.env` 를 복사하거나, Vercel 대시보드 환경변수에서 재구성.

필요한 키:
```
DATABASE_URL       # Supabase transaction pooler, 포트 6543, pgbouncer=true&connection_limit=1
DIRECT_URL         # 포트 5432 (Prisma migrate 용)
SUPABASE_URL       # https://<project-id>.supabase.co
SUPABASE_SERVICE_ROLE_KEY   # ⚠️ 절대 채팅·커밋에 노출 금지
JWT_SECRET 등 인증 관련 (`.env.example` 참고)
```

> `.env.example` 에 키 이름 목록 있음. 값은 Supabase / Vercel 대시보드에서.

```bash
npm run dev      # 로컬 개발 (localhost:3000)
npx tsc --noEmit # 타입 체크 — 커밋 전 필수 (아래 6번 참고)
```

---

## 3. 이번 세션(2026-08-02)에 한 일

### 핵심 성과: 홈 로딩 6초 → 0.46초 (13배)

**진단 과정**
1. 사용자 "로딩이 길다" → DevTools Network waterfall 확인 (document 5.76s, refresh 3.47s, me 재시도 2.14s = 총 11초)
2. **1차 오진**: 콜드 스타트로 결론 → `keep-warm` GitHub Actions cron 배포 (5분마다 health 핑)
3. keep-warm 배포 후 재측정 → **변화 없음** (5.96s → 6.30s). 웜인데도 느림 = 콜드 스타트 아님
4. `.env` 확인 → DB 커넥션 설정은 이미 최적 (pooler 6543 + pgbouncer + 도쿄)
5. **`curl -sI <url>/api/v1/health | grep x-vercel-id`** → `icn1::iad1::...`
   → **함수가 미국(iad1) 에서 실행 중, DB 는 도쿄.** 쿼리마다 태평양 왕복 ~180ms
6. `vercel.json` 에 `{"regions": ["hnd1"]}` 추가 → 재배포 45초 → `icn1::hnd1::...` → **0.46초**
7. keep-warm 은 무용지물이 되어 제거

**커밋 로그**
```
4ca2bef chore: keep-warm workflow 제거 + 2026-08-02 23:00 회고
8dcf8ba perf(deploy): 함수 리전을 도쿄(hnd1) 로 고정   ← 핵심
6a5d666 chore(ci): keep-warm 에 홈 SSR 함수도 핑        (제거됨)
5cbd74c docs: 2026-08-02 21:52 세션 회고 추가
640f710 chore(ci): Vercel 콜드 스타트 방지용 keep-warm cron 추가  (제거됨)
```

### 성능 진단 레시피 (재사용)

```bash
# 함수 실행 리전 확인 — X-Vercel-Id 형식: <edge>::<function>::<id>
curl -sI https://jitda-epl2.vercel.app/api/v1/health | grep -i x-vercel-id

# 응답시간 5회 측정
for i in 1 2 3 4 5; do
  curl -sS -o /dev/null -w "%{http_code} total=%{time_total}s ttfb=%{time_starttransfer}s\n" \
    --max-time 30 https://jitda-epl2.vercel.app/
done
```

---

## 4. 직전 세션(2026-07-24)까지의 기능 현황

**완료된 것**
- 이미지 업로드 파이프라인 (presigned URL 방식)
  - `POST /api/v1/images/upload` → 서명 URL 발급
  - 클라가 Supabase Storage 로 직접 `PUT` (Vercel 4.5MiB body 한계 우회)
  - `PATCH /api/v1/images/{id}` 로 `status: READY` + `url` 갱신
- 회차 생성 (`POST /api/v1/series/{id}/episodes`) — `$transaction` timeout 30초, 이미지 순서 `Promise.all` 병렬
- 웹툰 세로 스크롤 뷰어 (`/episodes/{id}`)
- 스튜디오 (`/studio`) — 작품/회차 업로드, 회차 관리 인라인 확장, 작품 삭제
- 회차 편집 페이지 (`/studio/episodes/{id}/edit`) — 기존/신규 이미지 혼합, discriminated union 상태
- 회원가입 handle 규칙 (`[a-z0-9_.\-]` 3~20자, 라벨 `@아이디`)
- soft-delete 된 회차도 자동 번호 max 계산에 포함 (재사용 충돌 방지)

**회고 문서** — `retros/` 폴더에 시간순 정리
```
retros/2026-07-22-1702.md
retros/2026-07-23-2100.md
retros/2026-07-23-2300.md
retros/2026-07-24-0100.md
retros/2026-07-24-0300.md
retros/2026-08-02-2152.md   ← 콜드 스타트 오진 기록
retros/2026-08-02-2300.md   ← 리전 미스매치 정답
```

---

## 5. 남은 할 일 (우선순위 순)

### 성능
- [ ] **인증 waterfall 최적화** — 현재 `/me` 401 → `/refresh` → `/me` 재호출 3단 직렬.
      클라에서 액세스 토큰 만료를 미리 판단해 `refresh` 부터 치면 한 왕복 절약.
      파일: `src/lib/auth-context.tsx`
- [ ] `/search` 라우트 없는데 어딘가 `<Link href="/search">` prefetch 중 → 404 발생.
      `grep -rn 'href="/search"' src/` 로 찾아 제거

### 기능
- [ ] 업로드 파이프라인 helper 추출 — `init → PUT → PATCH READY` 흐름이
      `src/app/studio/page.tsx` 의 `NewEpisodeForm` 과
      `src/app/studio/episodes/[id]/edit/page.tsx` 에 중복
- [ ] 회차 편집 후 스튜디오 복귀 시 목록 자동 갱신 (현재 수동 새로고침 필요)
- [ ] 시리즈 편집 UI (`PATCH /api/v1/series/{id}` — 제목·소개·장르·커버)

### 정리 / 부채
- [ ] `src/lib/api-error.ts` 의 `jsonError` 가 프로덕션에서도 내부 에러 메시지 노출 중.
      진단 끝났으니 generic 메시지로 되돌릴 것
- [ ] `src/lib/security/headers.ts` — prod `script-src` 에 `'unsafe-inline'`.
      RSC 하이드레이션 때문에 넣었으나 nonce 방식으로 업그레이드 필요
- [ ] `src/app/api/v1/series/route.ts` 의 죽은 코드 `void op;` 제거
- [ ] orphan 이미지 정리 배치 (업로드했으나 회차에 붙지 않은 것)
- [ ] Auth happy-path 스모크 테스트
- [ ] `REFLECTION.md` (peer review PR #1 요청 사항)
- [ ] 사용자 원본 이미지가 저해상도인 문제 — 뷰어에서 흐리게 보임. 원인 규명 필요

---

## 6. 작업 규칙 (이 프로젝트에서 지킬 것)

### 언어
- 모든 대화·주석·커밋 메시지 **한국어**

### 커밋
- **검증 끝나면 즉시 커밋** (한 싸이클 = 한 커밋)
- `git checkout -- <file>` 로 파일 전체 원복 금지 (과거 작업 유실 사고 있었음)
- 커밋 메시지 형식: `type(scope): 한국어 요약` + 본문 2~3줄

### 커밋 전 필수
```bash
npx tsc --noEmit
```
> 과거 4회 이상 import 누락(`Fragment`, `APIError`, `loadError`)으로 Vercel 빌드 실패함.
> 로컬 타입체크 없이 푸시하지 말 것.

### 외부 UI 안내 금지 규칙
- Vercel · Supabase 등 SaaS 대시보드 경로를 **추측으로 안내하지 말 것**
- 확신 없으면 "모르겠다, 지금 화면 캡처 부탁" 이라고 말하기
- 2026-07-23, 2026-08-02 두 번 사용자에게 지적받음 (헛짚음 = 시간 낭비 + 신뢰 손상)

### 검증
- 불리한 조건(엣지 케이스)에서 검증할 것. 통과를 내 수정 효과로 성급히 귀속하지 말 것
- 파일 하나 보고 전체 계약을 단정하지 말 것 (stale 스키마·fixture 로 같은 실수 3회 있었음)

### 스킬 조합 (`CLAUDE.md` 규칙)
- 일반 코딩 → `ponytail:ponytail` + 완료 직전 `superpowers:verification-before-completion`
- 버그 수정 → `ponytail` + `superpowers:systematic-debugging`
- 아이디어 발산 → `superpowers:brainstorming` 단독

---

## 7. 알아둘 함정

| 함정 | 내용 |
|---|---|
| **Vercel 기본 함수 리전** | 설정 안 하면 `iad1`(미국). DB 가 아시아면 반드시 `vercel.json` 로 매칭 |
| **Vercel body 한계** | Hobby 4.5MiB. 이미지는 반드시 presigned URL 로 클라 직접 업로드 |
| **Prisma `$transaction` 기본 timeout** | 5초. 이미지 28장 순차 update 하면 초과 → `{ timeout: 30_000 }` + `Promise.all` |
| **soft-delete + unique 제약** | `(seriesId, order)` unique 유지하려면 자동 번호가 soft-deleted 도 max 계산에 포함해야 함 |
| **CSR 페이지 배포 검증** | `'use client'` 페이지는 HTML grep 무효. `/_next/static/chunks/app/*/page-*.js` 청크를 fetch 해서 grep |
| **dynamic 라우트 존재 확인** | 307(middleware redirect) = 라우트 있음, 404 = 없음 |
| **API 응답 래핑** | 일부 엔드포인트는 DTO 를 그대로 반환(`{episode: ...}` 아님). 클라에서 unwrap 주의 |

---

## 8. 새 세션 시작 프롬프트 예시

```
C:\Users\kor\jitda 프로젝트를 이어서 작업할게.
HANDOFF.md 읽고 현재 상태 파악해줘.
그다음 [작업하고 싶은 항목] 진행하자.
```
