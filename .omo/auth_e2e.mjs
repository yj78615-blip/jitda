// 인증 E2E: node .omo/auth_e2e.mjs [주소]  (데모 계정 사용, 개발 서버 필요)
import fs from 'fs';
import { chromium } from 'playwright';
const B=process.argv[2]??'http://localhost:3000';
const seed=fs.readFileSync(new URL('../prisma/seed.ts',import.meta.url),'utf8');
const email=seed.match(/email: '(.*?)'/)[1], pw=seed.match(/password: '(.*?)'/)[1];
const br=await chromium.launch(); const ctx=await br.newContext(); const page=await ctx.newPage();
let fail=0; const ok=(n,c,x='')=>{console.log(c?'통과':'실패',n,x); if(!c)fail++;};
const settled=p=>p.waitForFunction(()=>document.querySelector('.user-nav')&&!document.querySelector('.user-nav span.btn'),null,{timeout:40000});
const inn=async p=>{await settled(p);return await p.locator('.btn-logout').count()>0;};
const cookie=async()=>(await ctx.cookies()).find(c=>c.name==='__Host-jitda_refresh')?.value;
await page.goto(B); ok('비로그인', !(await inn(page)));
for(const u of ['/auth','/studio','/profile?handle=demo'])await page.request.get(B+u).catch(()=>{});
const login=async()=>{await page.goto(B+'/auth');await settled(page);await page.fill('input[type=email]',email);await page.fill('input[type=password]',pw);await page.click('form button[type=submit]');await page.waitForURL(B+'/',{timeout:40000});};
await login(); ok('로그인', await inn(page));
await page.evaluate(()=>localStorage.setItem('jitda_access_token','old'));
const reqs=[];const l=r=>{if(r.url().includes('/api/v1/auth/'))reqs.push(r.url().split('/auth/')[1]);};page.on('request',l);
await page.reload(); ok('새로고침 유지', await inn(page)); page.off('request',l);
ok('refresh 1회만', reqs.join()==='refresh', reqs.join());
ok('저장소에 토큰 없음', await page.evaluate(()=>!JSON.stringify([{...localStorage},{...sessionStorage}]).match(/eyJ|jitda_access/)));
const bearer=page.waitForResponse(r=>r.url().includes('/follow/'),{timeout:40000});
await page.goto(B+'/profile?handle=demo'); ok('인증 API 200',(await bearer).status()===200);
await page.goto(B+'/studio'); ok('스튜디오', await inn(page) && page.url().includes('/studio'));
const ps=await Promise.all([1,2,3,4,5].map(()=>ctx.newPage()));
await Promise.all(ps.map(p=>p.goto(B))); ok('탭 5개 동시', (await Promise.all(ps.map(inn))).every(Boolean)); for(const p of ps)await p.close();
await page.goto(B); ok('동시 이후 유지', await inn(page));
// 서버는 처리했는데 응답을 못 받은 상황 (쿠키 A 그대로)
const A=(await ctx.cookies()).find(c=>c.name==='__Host-jitda_refresh');
const call=async v=>{const r=await fetch(B+'/api/v1/auth/refresh',{method:'POST',headers:{cookie:'__Host-jitda_refresh='+v}});return{s:r.status,c:r.headers.get('set-cookie')?.match(/refresh=([^;]+)/)?.[1]};};
await call(A.value); await call(A.value);
await page.reload(); ok('응답 2회 유실 뒤 복원', await inn(page));
if(!(await page.locator('.btn-logout').count())) await login(), await settled(page);
const old=await cookie();
for(let i=0;i<8;i++){page.reload().catch(()=>{});await new Promise(r=>setTimeout(r,60+i*70));}
await page.goto(B).catch(()=>page.goto(B)); ok('새로고침 연타 뒤 유지', await inn(page));
if(!(await page.locator('.btn-logout').count())) await login(), await settled(page);
// 유예 시간이 지난 재사용은 거절
const X=await cookie(); const n=await call(X); await new Promise(r=>setTimeout(r,12000));
ok('12초 뒤 재사용 거절',(await call(X)).s===401);
// 유예 중 교체된 미수령 토큰은 죽는다
const c1=await call(n.c); const c2=await call(n.c); if(c2.c) ok('유예 시 이전 자식 폐기', (await call(c1.c)).s===401);
await ctx.addCookies([{...A,value:(c2.c??c1.c)}]); await page.reload(); ok('이어쓰기', await inn(page));
const beforeOut=await cookie(); const parent=beforeOut;
await page.click('.btn-logout'); await page.waitForFunction(()=>document.querySelector('.user-nav a[href="/auth"]'));
ok('로그아웃 쿠키 삭제', !(await cookie())); ok('로그아웃 토큰 즉시 거절',(await call(parent)).s===401);
await page.reload(); ok('로그아웃 유지', !(await inn(page)));
// 로그아웃 직전의 부모 토큰으로 부활 불가
await login(); await settled(page); const par=await cookie(); const ch=await call(par);
await fetch(B+'/api/v1/auth/logout',{method:'POST',headers:{cookie:'__Host-jitda_refresh='+ch.c}});
ok('로그아웃 후 부모 재사용 거절',(await call(par)).s===401);
// 새로고침 직후 로그아웃: 세션이 되살아나지 않는다
await login(); await settled(page);
await page.evaluate(async()=>{ await Promise.all([navigator.locks.request('jitda_auth',()=>fetch('/api/v1/auth/refresh',{method:'POST'})),Promise.resolve(document.querySelector('.btn-logout').click())]); });
await page.waitForTimeout(4000); ok('갱신과 로그아웃 경합', !(await cookie()));
await br.close(); console.log('실패',fail); process.exit(fail?1:0); 
