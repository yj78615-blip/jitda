# AIFFEL Campus Code Peer Review Template

- 코더 : yj78615-blip (짓다 / JITDA)
- 리뷰어 : 김뮤 (soulairise)

> 대상 저장소: 웹툰 오픈 플랫폼 "짓다(JITDA)" — Next.js 15 (App Router) + TypeScript 풀스택 백엔드
> 리뷰 범위: `src/` 전체(약 2,760 LOC), `prisma/schema.prisma`, `middleware.ts`, `README.md`, `docs/`
> 리뷰 성격: 딥러닝 과정용 항목(모델/Metrics/Loss)이 아닌 **웹 백엔드 프로젝트**이므로, PRT 5개 항목을 프로젝트 성격에 맞춰 해석하여 적용함. 5번의 "PEP8"은 TypeScript 컨벤션/ESLint 기준으로 대체.

---

# PRT(Peer Review Template)

## [O] 1. 주어진 문제를 해결하는 완성된 코드가 제출되었나요?

**판정: O (기능 단위 완성도는 충족, 단 실행 검증은 미확인)**

Phase 1 목표(인증 + 콘텐츠 CRUD)에 해당하는 엔드포인트가 실제로 구현되어 있음. 문서상 나열이 아니라 라우트 파일이 물리적으로 존재함을 확인:

```
src/app/api/v1/
├─ auth/{signup,login,refresh,logout,me}/route.ts   # 인증 6종
├─ series/route.ts, series/[id]/route.ts, series/[id]/episodes/route.ts
├─ episodes/[id]/route.ts, episodes/[id]/view/route.ts
├─ posts/route.ts, posts/[id]/route.ts, posts/[id]/view/route.ts
└─ webhooks/stripe/route.ts
```

데이터 모델도 스텁이 아니라 `prisma/schema.prisma`에 **27개 model**로 구체화되어 있음(enum 다수 포함). 로그인 플로우(`src/app/api/v1/auth/login/route.ts`)는 잠금 확인 → 유저 조회 → 검증 → 토큰 발급 → refresh 쿠키 세팅까지 실제 로직이 끝까지 연결됨.

**근거가 되는 부정적 사실도 함께 기록(냉정한 판정 근거):**
- 자동화 테스트 코드 **0개** (`*.test.*` / `*.spec.*` 없음). "정상 작동"을 코드/CI로 증명하는 장치가 없음.
- 리뷰 환경에서 `npm install` + Postgres 없이는 실제 구동을 확인할 수 없어, **런타임 동작은 코드 정적 판독으로만 판단**함.
- Stripe 웹훅은 서명 검증·idempotency까지는 완성이나 이벤트별 처리는 `// TODO`로 스텁 상태(`src/app/api/v1/webhooks/stripe/route.ts`).

→ "완성"의 기준을 *Phase 1 스코프 내 CRUD/인증*으로 본다면 **충족(O)**. 다만 실행/테스트로 뒷받침되지 않은 점은 명확한 리스크로 남김.

---

## [O] 2. 핵심적이거나 복잡한 부분에 작성된 설명을 보고 코드가 잘 이해되었나요?

**판정: O (이 프로젝트에서 가장 강한 부분)**

단순 "무엇을 한다"가 아니라 **"왜 이렇게 했는가"**와 보안 명세 조항 번호(§3.2 등)까지 주석에 연결되어 있어, 주석만 읽어도 의도가 파악됨.

근거 1 — 타이밍 공격 방어 의도가 명시됨 (`src/lib/auth/password.ts`):
```ts
// 보안 명세 §3.2 — Argon2id.
// 이 파라미터는 OWASP 2024 권장. 서버 CPU 에서 목표 시간 ~500ms.
const HASH_OPTS = { algorithm: Algorithm.Argon2id, memoryCost: 19_456, timeCost: 2, ... };

// 존재하지 않는 계정에 대해서도 실 해싱과 유사한 CPU 시간을 소비.
// 로그인 응답 시간으로 계정 존재 여부가 유출되는 걸 막는다 (§3.6 timing attack 방어).
```

근거 2 — 접근 제어 헬퍼에 JSDoc으로 분기 조건과 반환 규약 명시 (`src/lib/access.ts`):
```ts
/**
 * Episode 접근 권한 확인.
 * - 삭제되었으면 404
 * - 미공개(publishedAt 미래) 이고 소유자가 아니면 404 (존재 자체를 숨김)
 * - is_subscriber_only 이고 소유자·활성 구독자가 아니면 403 with required_subscription
 */
```
→ "미공개는 왜 403이 아니라 404인가"(리소스 존재 은닉)라는 설계 의도까지 주석에 담겨 있어 이해에 결정적으로 도움이 됨.

근거 3 — 자료구조 계약을 주석으로 고정 (`src/lib/cursor.ts`):
```ts
// 커서 페이지네이션.
// opaque base64url({k: sortKeyValue, i: id}).
// 클라이언트는 문자열로만 취급.
```

→ 주석의 밀도·품질·"의도 설명" 모두 우수. **명확히 O.**

---

## [X] 3. 에러를 디버깅해 "문제를 해결한 기록"을 남겼나요? 또는 "새로운 시도/추가 실험"을 했나요?

**판정: X (추가 시도는 풍부하나, "기록"이 없음)**

이 항목은 (A)디버깅 기록 **또는** (B)새로운 시도의 *기록* 여부를 봄. 코드에는 기본 요구를 넘는 시도가 분명히 존재하나, **그 과정이나 판단을 문서/커밋으로 남긴 흔적이 없어** X로 판정.

**시도 자체는 있음(코드로 확인되는 것):**
- Refresh 토큰 **회전(rotation)** + 이전 토큰 무효화를 트랜잭션으로 처리 (`src/app/api/v1/auth/refresh/route.ts`)
- 조회수 **1시간 dedup** + 간이 GC (`src/app/api/v1/episodes/[id]/view/route.ts`)
- 목록 API의 **N+1 방지**를 위한 batch `groupBy` (`src/app/api/v1/series/route.ts`)

**그러나 "기록"이 없음(X의 근거):**
- 커밋 히스토리가 사실상 2개뿐 — `Initial commit` + `docs: README URL 반영`. 문제 발생→원인→해결로 이어지는 커밋 서사가 없음.
```
12b96e0 docs: README에 실제 GitHub Pages URL 반영
fb0d11a Initial commit: 짓다 (JITDA) — 웹툰 오픈 플랫폼
```
- `troubleshooting` / `실험 기록` 류 문서가 저장소에 없음(검색 결과 0건).
- 코드 내 `// TODO`(예: Stripe 이벤트 처리, View dedup의 Redis 이관)는 "남은 일" 표기일 뿐, "해결한 기록"이 아님.

→ 시도의 결과물(코드)은 있으나 **과정의 기록이 부재**하여 이 항목 기준으로는 **X.**

---

## [X] 4. 회고를 잘 작성했나요?

**판정: X**

배운 점 / 아쉬운 점 / 느낀 점 / 어려웠던 점에 해당하는 **회고 문서가 존재하지 않음.** README·docs 어디에도 회고 섹션이 없음(검색 결과 0건).

README의 "다음 단계" 섹션은 회고가 아니라 **로드맵**임:
```
## 다음 단계
1. Auth OAuth — Google · Apple (PKCE + JWKS 검증)
2. 이메일 인증 · 비밀번호 재설정 — Resend 연동
...
9. View dedup 을 Redis (Upstash) 로 이관 — 현재 in-memory (단일 인스턴스 한정)
```
→ "앞으로 할 일"은 있으나 "무엇을 배웠고 무엇이 아쉬웠는지"에 대한 서술이 없음.

또한 항목이 권장하는 **아키텍처 도식(입력→처리→출력 흐름도)**도 없음. 디렉토리 트리는 있으나 인증 토큰 라이프사이클(access/refresh 발급·회전·검증)이나 요청 처리 파이프라인을 그림으로 정리한 자료는 부재.

→ 회고 부재로 **명확히 X.** (본 항목은 코드 품질과 무관하게 "기록물" 유무로 판정.)

---

## [O] 5. 코드가 간결하고 효율적인가요? (TS/ESLint 컨벤션 기준으로 해석)

**판정: O (모듈화·중복 제거 우수, 단 국소적 개선점 존재)**

근거 1 — 에러 처리를 래퍼로 일원화해 라우트마다 try/catch 반복을 제거 (`src/lib/api-error.ts`):
```ts
export function withErrors<Args extends unknown[]>(fn: ...) {
  return async (...args) => {
    try { return await fn(...args); }
    catch (err) { return jsonError(err); }
  };
}
```
→ 모든 라우트가 `export const POST = withErrors(async (req) => {...})` 패턴으로 통일됨. 중복 최소화·범용화 모범 사례.

근거 2 — 검증 스키마를 `lib/schemas/`로 분리하고 공통 규칙을 재사용 (`common.ts` → `auth.ts`가 `zEmail`, `zPassword` 등을 import). 관심사 분리가 명확.

근거 3 — 목록 조회의 효율성 고려. `take: limit + 1`로 `has_more`를 한 번의 쿼리로 판정하고, subscriber-only 집계는 `groupBy` 배치로 N+1 회피 (`src/app/api/v1/series/route.ts`).

**개선 제안(냉정한 관점 — 반드시 고칠 필요는 없음):**
- `series/route.ts`의 커서 분기에 **죽은 코드**가 남아 있음. `op` 변수를 만들고 `void op;`로 무시하며 "remove the naive lte" 주석까지 있어, 리팩터링 중간 상태가 커밋된 것으로 보임:
  ```ts
  const op: 'lt' | 'lte' = 'lte'; // tie-break id 로 정확히 커팅
  ...
  void op; // remove the naive lte
  ```
- 로그인 응답에서 일부 유저 필드가 **하드코딩**됨(`avatar_url: null`, `bio: null`, `is_author: true`, `created_at: new Date().toISOString()`). DB 실제 값이 아니라 응답 시점 값이라, 프론트가 신뢰하면 데이터 불일치 소지 (`src/app/api/v1/auth/login/route.ts`).
- `getClientIp`가 `X-Forwarded-For` 첫 값을 신뢰함. 주석에 "신뢰할 수 있는 프록시 전제"라고 밝혀둔 점은 좋으나, 스푸핑 시 로그인 잠금(rate limit)을 우회할 수 있어 프록시 신뢰 경계 설정이 배포 시 필수 (`src/lib/auth/ratelimit.ts`).

→ 전반적으로 **간결·모듈화·효율 모두 양호(O)**. 위 3가지는 감점이 아니라 다음 커밋에서 다듬으면 좋을 포인트로 제안.

---

# 참고 링크 및 코드 개선

```
[리뷰 총평]
- 강점: 보안 설계(Argon2id·timing attack 방어·refresh 회전·__Host- 쿠키·감사로그)와
  주석의 "의도 설명" 품질이 신입/학습 프로젝트 수준을 크게 상회함.
  에러 응답 스키마 통일, 접근제어 헬퍼 분리 등 백엔드 구조 감각이 뛰어남.
- 보완: (1) 테스트 코드 부재 (2) 회고·트러블슈팅 기록 부재 (3) 커밋 서사 부재.
  즉 "코드 품질"은 높으나 "학습 과정을 증명하는 기록물"이 약함 → PRT 3·4번에서 X.

[개선 제안 요약]
1. series/route.ts 커서 분기의 죽은 코드(op/void op) 제거 → 가독성 향상.
2. 로그인 응답의 하드코딩 필드(avatar_url, bio, is_author, created_at)를
   DB 실제 값으로 반환하도록 수정 → 프론트 데이터 정합성.
3. 최소한의 통합 테스트(예: auth 플로우 happy-path) 1~2개 추가 → 완성도 근거 확보.
4. REFLECTION.md 또는 README에 회고 섹션 추가 + 인증 토큰 라이프사이클 도식.

[참고 링크]
- OWASP Password Storage Cheat Sheet (Argon2id 파라미터 근거 확인용):
  https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- Refresh Token Rotation 개념:
  https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation
```
