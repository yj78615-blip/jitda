import type { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { withErrors, unauthorized, jsonOk } from '@/lib/api-error';
import {
  ACCESS_TOKEN_TTL_SEC, REFRESH_TOKEN_TTL_SEC,
  issueRefreshToken, hashRefreshToken, signAccessToken,
} from '@/lib/auth/tokens';
import { REFRESH_COOKIE, REFRESH_COOKIE_OPTS } from '@/lib/auth/session';

export const runtime = 'nodejs';

// 교체는 됐는데 응답을 못 받은 클라(로딩 중 새로고침)를 구제하는 유예 시간.
const ROTATION_GRACE_MS = 10_000;

export const POST = withErrors(async (req: NextRequest) => {
  // 쿠키 우선, body 는 fallback
  let raw = req.cookies.get(REFRESH_COOKIE)?.value;
  if (!raw) {
    const body = await req.json().catch(() => null);
    if (body && typeof body === 'object' && typeof (body as { refresh_token?: unknown }).refresh_token === 'string') {
      raw = (body as { refresh_token: string }).refresh_token;
    }
  }
  if (!raw) throw unauthorized('refresh token 이 없습니다.');

  const hash = hashRefreshToken(raw);
  const record = await db.refreshToken.findUnique({
    where: { tokenHash: hash },
    select: {
      id: true, userId: true, expiresAt: true, revokedAt: true,
      // displayName·bio·createdAt 은 응답에 user 를 실어보내기 위한 것.
      // 클라가 refresh 뒤 /me 를 또 부르지 않아도 되게 (왕복 1회 절약).
      user: {
        select: {
          id: true, role: true, handle: true, status: true,
          displayName: true, bio: true, createdAt: true,
        },
      },
    },
  });

  if (!record || record.expiresAt < new Date() || !record.user || record.user.status !== 'ACTIVE') {
    throw unauthorized('refresh token 이 유효하지 않습니다.');
  }

  // 폐기된 토큰은 '회전으로 막 폐기됐고 자식이 아직 살아있을 때'만 유예한다.
  // 로그아웃으로 폐기됐거나 자식까지 폐기됐으면 거절. 미수령 자식은 아래에서 폐기해 1회용을 유지.
  let revokeId = record.id;
  if (record.revokedAt) {
    const child = Date.now() - record.revokedAt.getTime() < ROTATION_GRACE_MS
      ? await db.refreshToken.findFirst({
          where: { parentId: record.id, revokedAt: null },
          select: { id: true },
        })
      : null;
    if (!child) throw unauthorized('refresh token 이 유효하지 않습니다.');
    revokeId = child.id;
  }

  // 회전(rotation): 이전 토큰 무효화 → 새 토큰 발급
  const newRefresh = issueRefreshToken();
  await db.$transaction([
    db.refreshToken.update({
      where: { id: revokeId },
      data: { revokedAt: new Date() },
    }),
    db.refreshToken.create({
      data: {
        userId: record.userId,
        tokenHash: newRefresh.hash,
        parentId: record.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_SEC * 1000),
      },
    }),
  ]);

  const accessToken = await signAccessToken({
    sub: record.user.id,
    role: record.user.role,
    handle: record.user.handle,
  });

  const res = jsonOk({
    access_token: accessToken,
    expires_in: ACCESS_TOKEN_TTL_SEC,
    token_type: 'Bearer',
    // login 응답과 동일 shape. 클라의 refresh → me 왕복을 없앤다.
    user: {
      id: record.user.id,
      handle: record.user.handle,
      display_name: record.user.displayName,
      avatar_url: null,
      bio: record.user.bio,
      is_author: true,
      created_at: record.user.createdAt.toISOString(),
    },
  });
  res.cookies.set(REFRESH_COOKIE, newRefresh.raw, REFRESH_COOKIE_OPTS);
  return res;
});
