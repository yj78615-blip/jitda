# AGENTS.md — IF (jitda repo)

> 이 파일은 이 저장소에서 작업하는 **AI 에이전트를 위한 헌법**이다.
> 사람 개발자 문서는 [`README.md`](README.md), 스펙은 [`docs/specs/`](docs/specs/) 참고.
> 아래 규칙은 PRD·API·보안 명세에서 이미 결정된 사항의 요약이다. **재협상 금지.**

---

## 0. About IF

- **무엇**: 웹툰·일러스트 작가가 자기 페이지를 만들고 팬 기반 수익(구독·팁)을 받는 오픈 플랫폼.
- **한 줄**: 오픈 게시 + 팬 기반 수익화 + 웹툰 최적 뷰어 (한국어·영어권 동시).
- **원 브랜드**: `짓다` → 리브랜드 `IF`. 저장소 폴더명은 유산상 `jitda/` 유지.
- **스펙 링크** (수정 전 반드시 확인):
  - PRD: [`docs/specs/prd.html`](docs/specs/prd.html)
  - API: [`docs/specs/api.html`](docs/specs/api.html)
  - Security: [`docs/specs/security.html`](docs/specs/security.html)
- **데모**: `demo@if.com` / `DemoPass1234!` (핸들 `demo`, 시드로 생성됨)

---

## 1. Core decisions (PRD §2·§3·§7)

| 항목 | 결정 | 재협상 |
|---|---|---|
| 포지셔닝 | 오픈 게시(작가 심사 없음) + SFW 원칙 | ✗ |
| 콘텐츠 단위 | **시리즈(회차 다수) + 개별 포스트(단발)** 병존 | ✗ |
| 수익화 | 팔로우(무료) · **단일 월 구독료** · 일회성 팁(자유·프리셋) | ✗ |
| 구독 혜택 | 조기공개 · 구독자 전용 회차 · 사랑방(Phase 2) | ✗ |
| 팔로우 방향 | **단방향** (상호 팔로우 개념 없음) | ✗ |
| 랭킹 | 인기 작품 TOP 10 · 최신작 TOP 3 (집계 대상 확정 필요) | 최신작 대상만 △ |
| 발견 | 장르 카테고리 + 자유 태그 + 검색 | ✗ |
| 결제 | **Stripe**. 실패 3회 재시도 후 자동 해지. 통화는 정수(KRW = 원 그대로). | ✗ |
| 정산 | 월 1회. Phase 1 은 수동, Phase 2 Stripe Connect Express. | ✗ |
| 언어 | 한국어 우선 · 영어 i18n (Phase 1 후반) | ✗ |
| 모더레이션 | 사후 신고. **72h 내 1차 응답**. 3-strike. | ✗ |
| 성인 | Phase 1 SFW only. **업로드 스위치 자체가 존재하면 안 된다.** | Phase 2에서 별관으로 |
| 스택 | **Next.js 15 App Router + Prisma + Supabase(PostgreSQL)** | ✗ |

**핵심 원칙 (Ponytail)**: 위 표에 없는 새 축(예: NFT, DAO, AI 큐레이션)은 PR로 열지 마라. `Phase 3+` 폴더에 메모하고 스코프 밖.

---

## 2. Absolute don'ts (보안 명세 §3~§8)

이 목록은 **깨면 프로덕션이 죽는** 것들이다. 위반 PR 은 자동 리젝트로 취급.

1. **Refresh 쿠키 이름은 `__Host-jitda_refresh` 고정.** `HttpOnly · Secure · SameSite=Strict · Path=/`. 다른 조합으로 바꾸지 마라. → [`src/lib/auth/session.ts`](src/lib/auth/session.ts)
2. **Access token 을 localStorage / sessionStorage 에 저장 금지.** 메모리 + Bearer 헤더로만 흘려라. XSS 로 즉시 탈취됨.
3. **`$queryRawUnsafe` / 문자열 연결 SQL 금지.** Prisma parameterized query 또는 `Prisma.sql\`\`` 태그드 템플릿만.
4. **`dangerouslySetInnerHTML` 금지.** 사용자 입력이 들어가는 곳은 React 기본 이스케이프에 맡겨라. Markdown 렌더가 필요하면 화이트리스트 sanitize (rehype-sanitize) 를 별도 PR 로.
5. **Argon2id 파라미터 하향 금지.** 현재 `m=12288, t=2, p=1`. 튜닝은 벤치마크 첨부 후에만. → [`src/lib/auth/password.ts:6`](src/lib/auth/password.ts:6)
6. **Stripe 웹훅 서명 검증 우회 금지.** `stripe.webhooks.constructEvent` + idempotency 키 필수. → [`src/app/api/v1/webhooks/stripe/route.ts`](src/app/api/v1/webhooks/stripe/route.ts)
7. **소유권 재확인 없이 mutation 금지.** 시리즈·회차·포스트 수정/삭제는 반드시 `requireUser()` → `assertOwner()` → mutation 순서. → [`src/lib/access.ts`](src/lib/access.ts)
8. **구독자 전용 회차는 서버에서 걸러라.** 클라이언트 `if (!isSubscriber) hide()` 금지. 응답 자체에 본문이 없어야 한다.
9. **성인 콘텐츠 업로드 스위치를 추가하지 마라.** Phase 1 은 SFW. UI 에 체크박스가 있으면 **명세 위반**이다.
10. **장르 카테고리를 자유 태그로 저장하지 마라.** 장르는 enum, 자유 태그는 별도 문자열 배열. 섞이면 랭킹 집계가 무의미해진다. → [`src/lib/genres.ts`](src/lib/genres.ts), [`src/lib/tags.ts`](src/lib/tags.ts)
11. **비밀번호 최소 10자·흔한 사전 차단 유지.** `minLength` 를 8 로 되돌리지 마라. → [`src/lib/auth/password.ts:52`](src/lib/auth/password.ts:52) + [`src/app/auth/page.tsx:133`](src/app/auth/page.tsx:133)
12. **로그인 실패 응답에서 "존재하지 않는 계정" vs "비밀번호 오류" 구분 금지.** 통일 메시지 + `burnCpuLikeAVerify()` 로 타이밍 균일화. → [`src/app/api/v1/auth/login/route.ts:21`](src/app/api/v1/auth/login/route.ts:21)

---

## 3. Setup

```bash
npm install
npm run db:migrate      # Prisma migrate dev (개발). 프로덕션은 db:migrate:deploy
npm run db:seed         # 장르 10개 + 데모 유저·시리즈·포스트
npm run dev             # http://localhost:3000
```

- **환경변수**: [`.env`](.env) (gitignored). `DATABASE_URL` (pooled, `pgbouncer=true&connection_limit=1`) + `DIRECT_URL` (migrations) 둘 다 필요.
- **Windows Prisma DLL 잠금**: 개발 서버가 쿼리 엔진 DLL 을 잡고 있어 `prisma generate` 가 EPERM 나면 `taskkill //F //IM node.exe` 후 재시도.
- **Supabase 재시작 시**: DB 비밀번호가 URL 에 들어가면 `!`, `@` 등 특수문자는 반드시 URL 인코딩 (`%21`, `%40`).

---

## 4. Codemap

작업 전에 **반드시 여기부터 확인**. 이미 있는 helper 를 재구현하는 게 이 리포 최대 슬롭 원천.

```
src/lib/
  db.ts                  Prisma 싱글턴. 다른 곳에서 new PrismaClient() 금지.
  id.ts                  prefix ID 생성 (usr_/srs_/epi_/pst_/img_/tag_/sub_/tip_/cmt_/rct_/ntf_/rpt_/pay_)
  cursor.ts              base64url 커서 페이지네이션 encode/decode
  mappers.ts             DB camelCase ↔ API snake_case 변환. 라우트에서 손으로 변환 금지.
  access.ts              assertOwner / assertSubscriber
  genres.ts              장르 enum (10개 고정)
  tags.ts                자유 태그 정규화
  api-error.ts           APIError · withErrors · jsonOk · jsonError · validationFailed
  schemas/               Zod 스키마 (auth · common · series · episode · post)
  auth/
    password.ts          Argon2id + burnCpuLikeAVerify + checkPasswordStrength
    tokens.ts            jose JWT (HS256, 1h) + refresh (256bit random → SHA-256)
    session.ts           REFRESH_COOKIE · requireUser
    ratelimit.ts         로그인 락아웃 (5회/15분/email+IP)
  security/headers.ts    CSP · HSTS · nosniff · frame-ancestors

src/app/api/v1/          모든 REST 엔드포인트. Base URL = /api/v1
  auth/{signup,login,logout,refresh,me}/route.ts
  series/, series/[id]/, series/[id]/episodes/
  episodes/[id]/, episodes/[id]/view/
  posts/, posts/[id]/, posts/[id]/view/
  health/route.ts
  webhooks/stripe/route.ts

src/app/                 서버 컴포넌트 페이지 (page.tsx)
  page.tsx               랜딩 (Prisma 직접 쿼리, 인기·최신)
  auth/page.tsx          로그인·회원가입
  studio/, viewer/, ...  작가 스튜디오·회차 뷰어

middleware.ts            HTTPS 강제 (prod) + x-request-id
prisma/schema.prisma     27+ 모델. 스키마 변경은 반드시 migration 파일 동반.
prisma/seed.ts           장르·데모 데이터
public/mockups/          정적 목업 (수정 금지 — 참고용)
docs/                    GitHub Pages 소스 (README·specs 사본)
```

---

## 5. API 규약 (API 명세 §1)

- **Base URL**: `/api/v1`
- **인증**: `Authorization: Bearer <access_token>` (Access 1h). Refresh 는 `__Host-jitda_refresh` 쿠키만.
- **응답 케이스**: **snake_case only**. DB 는 camelCase (Prisma). 경계는 [`mappers.ts`](src/lib/mappers.ts) 가 담당.
- **에러 포맷**:
  ```json
  { "error": { "code": "invalid_credentials", "message": "...", "fields": {...} } }
  ```
- **ID prefix**: `usr_` `srs_` `epi_` `pst_` `img_` `tag_` `sub_` `tip_` `cmt_` `rct_` `ntf_` `rpt_` `pay_`. **UUID 원문 노출 금지.**
- **통화**: 정수 (KRW = 원 단위). float 사용 시 정산 오차 → 즉시 리젝트.
- **페이지네이션**: `?cursor=<base64url>&limit=20` 커서 방식. `offset` 금지.
- **HTTP 코드**: 200/201/204 · 400 validation · 401 unauth · 403 forbidden · 404 not found · 409 conflict · 422 semantic · 429 rate-limited · 500 server. 창의성 금지.

---

## 6. How to add a new endpoint

1. **Zod 스키마 먼저** — [`src/lib/schemas/`](src/lib/schemas/) 에 request/response 형태 정의.
2. **route.ts 작성** — `withErrors` 로 감싸고, 필요 시 `requireUser` → `assertOwner` 순서.
3. **응답은 mapper 통해** — 손으로 camelCase → snake_case 변환 금지.
4. **API 명세 업데이트** — [`docs/specs/api.html`](docs/specs/api.html) 에 요청·응답 예시 추가. **명세와 코드 불일치 = 버그.**
5. **커밋 메시지에 엔드포인트 명시** — `feat(api): POST /api/v1/tips`.

**템플릿**:
```ts
// src/app/api/v1/tips/route.ts
import type { NextRequest } from 'next/server';
import { withErrors, validationFailed, jsonOk } from '@/lib/api-error';
import { requireUser } from '@/lib/auth/session';
import { TipCreateSchema } from '@/lib/schemas/tip';
import { zodErrorToFields } from '@/lib/schemas/common';
import { db } from '@/lib/db';
import { toTipDTO } from '@/lib/mappers';

export const runtime = 'nodejs';

export const POST = withErrors(async (req: NextRequest) => {
  const user = await requireUser(req);
  const parsed = TipCreateSchema.safeParse(await req.json());
  if (!parsed.success) throw validationFailed({ fields: zodErrorToFields(parsed.error) });
  const tip = await db.tip.create({ data: { ...parsed.data, senderId: user.id } });
  return jsonOk(toTipDTO(tip));
});
```

---

## 7. Don'ts (일반)

- **새 의존성 금지** — 스택 표(§1)에 없는 라이브러리를 `package.json` 에 넣지 마라. 필요하면 PR 설명에 이유 3줄 + 대안 3개 비교.
- **새 파일 금지 (helper 이미 있으면)** — Codemap 부터 봐라. `src/lib/utils/formatCurrency.ts` 같은 걸 새로 만들지 말고 기존 `mappers.ts` 확장.
- **camelCase ↔ snake_case 이중 저장 금지** — DB 는 camelCase, 응답은 snake_case. 둘 다 저장하지 마라.
- **자체 API 를 클라이언트에서 fetch 하지 마라** — 서버 컴포넌트면 Prisma 직접. `/api/v1/*` 는 외부·모바일용.
- **`console.log` 커밋 금지** — 디버그는 로컬에서만. 프로덕션 로깅이 필요하면 `console.error` + request-id.
- **`!important` 커밋 금지** — CSS 우선순위 싸움은 명세 위반의 냄새.
- **`any` 타입 남발 금지** — 정말 필요하면 주석으로 이유. TypeScript 는 라벨이 아니라 계약이다.
- **README·PRD 를 코드보다 먼저 바꾸지 마라** — 스펙 변경은 별도 PR (합의 후 코드).

---

## 8. Phase 1 backlog (착수 순서 힌트)

- [ ] Follow / Subscription / Tip / Comment / Reaction / Notification 엔드포인트
- [ ] Refresh 쿠키 fallback 을 `getSessionFromRequest` 에 추가 (서버 컴포넌트에서 현재 유저 인식)
- [x] 이미지 업로드 플로우 — 서버 프록시 방식 (presigned URL 대신): `POST /images/upload` multipart → Supabase Storage 업로드 → `READY` Image 반환. `src/lib/storage.ts` 참조. (2026-07-24)
- [ ] Stripe webhook 이벤트 핸들러 (지금은 서명 검증만, 이벤트 처리 TODO)
- [ ] OAuth (Google/Apple, PKCE + JWKS)
- [ ] 이메일 인증 (Resend)
- [ ] 랭킹 배치 잡 (인기 TOP 10 · 최신 TOP 3 집계)
- [ ] Series/Post RLS (Supabase 정책)
- [ ] 관리자 콘솔 (신고 큐 · 정산 실행)
- [ ] Auth happy-path smoke test (`assert` 3~5개, tsx 로 실행)
- [ ] 죽은 코드 제거: [`src/app/api/v1/series/route.ts`](src/app/api/v1/series/route.ts) 의 `void op;` + "remove the naive lte" 주석

---

## 9. When in doubt

1. **PRD 를 다시 읽어라** ([`docs/specs/prd.html`](docs/specs/prd.html))
2. Codemap (§4) 에 이미 있는지 확인
3. 그래도 애매하면 사람에게 물어라. 추측해서 새 축을 열지 마라.
