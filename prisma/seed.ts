// npm run db:seed — 반복 실행 무해 (upsert).
import { PrismaClient } from '@prisma/client';
import { GENRES } from '../src/lib/genres';
import { hashPassword } from '../src/lib/auth/password';

const db = new PrismaClient();

const DEMO = {
  userId: 'usr_demo0001',
  email: 'demo@if.com',
  handle: 'demo',
  displayName: '김달빛',
  password: 'DemoPass1234!',
};

const SERIES = [
  { id: 'srs_demo01', title: '달빛 아래 우리',   genre: 'romance',  desc: '고요한 마을에 온 낯선 소년, 그리고 나.',   views: 1234567, likes: 84230 },
  { id: 'srs_demo02', title: '던전 배달부',       genre: 'fantasy',  desc: '오늘도 던전 20층으로 짜장면을 배달한다.',   views: 892140,  likes: 61240 },
  { id: 'srs_demo03', title: '무거운 아침',       genre: 'drama',    desc: '한 통의 전화가 아침을 무겁게 만들었다.',    views: 724380,  likes: 49820 },
  { id: 'srs_demo04', title: '고양이 사무소',     genre: 'daily',    desc: '고양이가 사장인 사무소.',                  views: 691200,  likes: 52140 },
  { id: 'srs_demo05', title: '빨간 우산',         genre: 'thriller', desc: '비 오는 밤, 빨간 우산을 세 번째 마주쳤다.', views: 542100,  likes: 38400 },
  { id: 'srs_demo06', title: '3분 요리',          genre: 'comedy',   desc: '3분 안에 못 만들면 지는 요리 대결.',        views: 423600,  likes: 29140 },
];

const POSTS = [
  { id: 'pst_demo01', title: '오늘의 낙서',     genre: 'daily',   views: 218400, likes: 12400 },
  { id: 'pst_demo02', title: '봄이 오면',       genre: 'romance', views: 187200, likes: 10120 },
  { id: 'pst_demo03', title: '커피 리뷰',       genre: 'daily',   views: 165300, likes: 9210 },
  { id: 'pst_demo04', title: '지하철 스케치',   genre: 'daily',   views: 112000, likes: 6410 },
];

async function main() {
  for (const g of GENRES) {
    await db.tag.upsert({
      where: { slug: g.slug },
      create: { slug: g.slug, isGenre: true, nameKo: g.nameKo, nameEn: g.nameEn },
      update: { isGenre: true, nameKo: g.nameKo, nameEn: g.nameEn },
    });
  }
  console.log(`✓ ${GENRES.length} genres`);

  const passwordHash = await hashPassword(DEMO.password);
  await db.user.upsert({
    where: { handle: DEMO.handle },
    create: {
      id: DEMO.userId, email: DEMO.email, handle: DEMO.handle,
      displayName: DEMO.displayName, passwordHash,
      emailVerifiedAt: new Date(),
      authorProfile: { create: { subscriptionEnabled: true, subscriptionPrice: 4900 } },
      notificationSettings: { create: {} },
    },
    update: { passwordHash, email: DEMO.email, displayName: DEMO.displayName },
  });
  // Series는 authorId 로 참조 — 기존 유저 id 확인
  const seededUser = await db.user.findUnique({ where: { handle: DEMO.handle } });
  const authorId = seededUser!.id;
  console.log(`✓ user @${DEMO.handle} (${DEMO.email} / ${DEMO.password})`);

  const now = new Date();
  for (const s of SERIES) {
    const tag = await db.tag.findUnique({ where: { slug: s.genre } });
    if (!tag) continue;
    await db.series.upsert({
      where: { id: s.id },
      create: {
        id: s.id, authorId, title: s.title, description: s.desc,
        viewerModeDefault: 'SCROLL', status: 'ONGOING',
        viewsTotal: s.views, likesTotal: s.likes,
        tags: { create: [{ tagId: tag.id }] },
      },
      update: { viewsTotal: s.views, likesTotal: s.likes, updatedAt: now },
    });
  }
  console.log(`✓ ${SERIES.length} series`);

  for (const p of POSTS) {
    const tag = await db.tag.findUnique({ where: { slug: p.genre } });
    if (!tag) continue;
    await db.post.upsert({
      where: { id: p.id },
      create: {
        id: p.id, authorId, title: p.title,
        viewerMode: 'SCROLL', publishedAt: now,
        viewsCount: p.views, likesCount: p.likes,
        tags: { create: [{ tagId: tag.id }] },
      },
      update: { viewsCount: p.views, likesCount: p.likes },
    });
  }
  console.log(`✓ ${POSTS.length} posts`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());
