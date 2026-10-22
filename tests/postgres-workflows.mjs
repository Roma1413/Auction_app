import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { io } from 'socket.io-client';
import { assertIsolatedDatabase, root } from '../scripts/lib/local-postgres.mjs';

// Fail before importing Prisma or starting any service if pointed at app data.
assertIsolatedDatabase(process.env.DATABASE_URL);
assert.ok(process.env.DATABASE_URL === process.env.DIRECT_URL, 'The isolated runtime/direct targets must match');
assert.ok(process.env.JWT_SECRET, 'The runner must supply an ephemeral JWT key');
const require = createRequire(new URL('../server/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

test('isolated PostgreSQL, HTTP, Socket.IO, and React auction workflows', { timeout: 100000 }, async t => {
  const db = new PrismaClient();
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const base = `http://127.0.0.1:${port}`;
  let backend;
  let backendLog = '';
  const sockets = [];
  const metrics = {};
  async function stopBackend() {
    if (!backend || backend.exitCode !== null) return;
    const child = backend;
    const closed = new Promise(resolve => child.once('exit', resolve));
    child.kill();
    await Promise.race([closed, delay(3000).then(() => { if (child.exitCode === null) child.kill('SIGKILL'); })]);
  }
  t.after(async () => {
    for (const socket of sockets) socket.disconnect();
    await stopBackend();
    await db.$disconnect();
    // No table/database cleanup: retained fixtures require explicit deletion approval.
    await writeFile(new URL('../node_modules/.cache/auction/postgres-test-metrics.json', import.meta.url), JSON.stringify(metrics, null, 2));
  });
  async function startBackend() {
    backend = spawn(process.execPath, ['--max-old-space-size=192', 'server/dist/index.js'], {
      cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production', PORT: String(port) },
    });
    backend.stdout.on('data', chunk => { backendLog += chunk; });
    backend.stderr.on('data', chunk => { backendLog += chunk; });
    backend.on('error', error => { backendLog += error.code; });
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      if (backend.exitCode !== null) throw new Error('Isolated backend exited before readiness');
      try { if ((await fetch(base + '/api/ready', { signal: AbortSignal.timeout(500) })).ok) return; } catch {}
      await delay(50);
    }
    throw new Error('Isolated backend was not ready within ten seconds');
  }
  async function api(path, { token, body, method = body === undefined ? 'GET' : 'POST' } = {}) {
    const response = await fetch(base + '/api' + path, {
      method, signal: AbortSignal.timeout(5000),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, data: await response.json() };
  }
  async function until(predicate, timeout = 5000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) { if (await predicate()) return; await delay(25); }
    assert.fail('Expected workflow state before deadline');
  }
  async function connect(socket) {
    const connected = new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
    socket.connect();
    await connected;
  }
  const accounts = {};
  const nonce = randomBytes(6).toString('hex');
  let auction;
  const firstEvents = [], secondEvents = [], endings = [];
  const first = io(base, { autoConnect: false, transports: ['websocket'], timeout: 3000 });
  const second = io(base, { autoConnect: false, transports: ['websocket'], timeout: 3000 });
  sockets.push(first, second);
  first.on('bid-updated', event => firstEvents.push(event));
  second.on('bid-updated', event => secondEvents.push(event));
  first.on('auction-ended', event => endings.push(event));
  const payload = (overrides = {}) => ({
    title: 'Integration auction ' + nonce, description: 'Isolated development fixture', category: 'Electronics',
    condition: 'Like New', images: ['data:image/jpeg;base64,/9j/2Q=='], startingPrice: 100,
    endTime: new Date(Date.now() + 300000).toISOString(), location: 'Test location', shippingCost: 0, ...overrides,
  });
  async function listing(overrides = {}) {
    const response = await api('/auctions', { token: accounts.seller.token, body: payload(overrides) });
    assert.equal(response.status, 201);
    return response.data;
  }
  const bid = (id, user, amount) => api(`/auctions/${id}/bid`, { token: accounts[user].token, body: { amount } });
  await startBackend();

  await t.test('fresh migration produces exactly five application tables and enforces isolation', async () => {
    const tables = await db.$queryRaw`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations' ORDER BY tablename`;
    assert.deepEqual(tables.map(row => row.tablename), ['Auction','Bid','Notification','User','Watchlist']);
    assert.equal(await db.user.count(), 0);
    const migration = await db.$queryRaw`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"`;
    assert.equal(migration.length, 1);
    assert.ok(migration[0].finished_at);
    assert.equal(migration[0].rolled_back_at, null);
    const workingUrl = new URL(process.env.DATABASE_URL); workingUrl.pathname = '/auction_db';
    assert.throws(() => assertIsolatedDatabase(workingUrl.href));
    workingUrl.hostname = 'example.com';
    assert.throws(() => assertIsolatedDatabase(workingUrl.href));
  });
  await t.test('registration creates four isolated accounts without returning password hashes', async () => {
    for (const role of ['seller','a','b','c']) {
      const email = `${role}-${nonce}@auction.test`, password = randomBytes(24).toString('hex');
      const response = await api('/auth/register', { body: { email, password, name: 'Integration ' + role } });
      assert.equal(response.status, 200);
      assert.ok(typeof response.data.token === 'string');
      assert.ok(!Object.hasOwn(response.data.user, 'password'), 'Registration must not return password material');
      accounts[role] = { ...response.data.user, token: response.data.token, password };
    }
    assert.equal(await db.user.count(), 4);
  });
  await t.test('passwords are bcrypt hashes rather than plaintext', async () => {
    for (const account of Object.values(accounts)) {
      const stored = await db.user.findUniqueOrThrow({ where: { id: account.id } });
      assert.ok(stored.password !== account.password, 'Passwords must not be stored as plaintext');
      assert.equal(await bcrypt.compare(account.password, stored.password), true);
    }
  });
  await t.test('registration and login reject duplicate, missing, and incorrect credentials', async () => {
    assert.equal((await api('/auth/register', { body: { email: accounts.a.email, password: accounts.a.password, name: 'Duplicate' } })).status, 400);
    assert.equal((await api('/auth/register', { body: {} })).status, 400);
    assert.equal((await api('/auth/login', { body: { email: accounts.a.email, password: 'wrong-password' } })).status, 400);
    assert.equal((await api('/auth/login', { body: {} })).status, 400);
    assert.equal(await db.user.count(), 4);
  });
  await t.test('login and authenticated profile return the correct account', async () => {
    const loggedIn = await api('/auth/login', { body: { email: accounts.a.email, password: accounts.a.password } });
    assert.equal(loggedIn.status, 200);
    const profile = await api('/auth/me', { token: loggedIn.data.token });
    assert.equal(profile.status, 200);
    assert.equal(profile.data.user.id, accounts.a.id);
    assert.ok(!Object.hasOwn(profile.data.user, 'password'), 'Profiles must not return password material');
  });
  await t.test('anonymous, tampered, and expired tokens cannot access protected routes', async () => {
    for (const path of ['/auth/me','/user/notifications']) assert.equal((await api(path)).status, 401);
    for (const path of ['/auctions','/auctions/not-real/bid','/auctions/not-real/buy-now','/auctions/not-real/close','/user/watchlist/not-real']) assert.equal((await api(path,{body:{}})).status, 401);
    const expired = jwt.sign({ userId: accounts.a.id }, process.env.JWT_SECRET, { expiresIn: -1 });
    assert.equal((await api('/auth/me', { token: expired })).status, 401);
    assert.equal((await api('/auth/me', { token: accounts.a.token.slice(0,-5) + 'xxxxx' })).status, 401);
  });
  await t.test('seller creates a listing with its requested deadline and ownership', async () => {
    const endTime = new Date(Date.now()+300000).toISOString();
    auction = await listing({ endTime, sellerId: accounts.b.id });
    assert.equal(auction.seller.id, accounts.seller.id);
    assert.equal(auction.endTime, endTime);
    assert.equal(auction.status, 'active');
    assert.equal(auction.currentBid, 100);
  });
  await t.test('invalid prices, deadlines, and image inputs do not create listings', async () => {
    const count = await db.auction.count();
    for (const override of [{ startingPrice: 0 }, { endTime: new Date(0).toISOString() }, { reservePrice: 50 }, { buyItNowPrice: 50 }, { images: [] }, { shippingCost: -1 }]) {
      assert.equal((await api('/auctions', { token: accounts.seller.token, body: payload(override) })).status, 400);
    }
    assert.equal(await db.auction.count(), count);
  });
  await t.test('buyer browses and filters listings without leaking seller password fields', async () => {
    const response = await api('/auctions?category=Electronics&search=' + nonce);
    assert.equal(response.status, 200);
    assert.ok(response.data.some(item => item.id === auction.id));
    assert.ok(!Object.hasOwn(response.data[0].seller, 'password'), 'Listings must not return password material');
    assert.equal((await api(`/auctions/${auction.id}`)).status, 200);
    assert.equal((await fetch(base)).status, 200, 'The real production entrypoint serves the frontend');
  });
  await t.test('valid bid commits atomically and reaches two real Socket.IO clients', async () => {
    await connect(first); await connect(second);
    first.emit('join-auction', auction.id); second.emit('join-auction', auction.id);
    const response = await api(`/auctions/${auction.id}/bid`, { token: accounts.a.token, body: { amount: 110, bidderId: accounts.b.id } });
    assert.equal(response.status, 200);
    assert.equal(response.data.bid.bidderId, accounts.a.id);
    await until(() => firstEvents.some(event => event.currentBid === 110) && secondEvents.some(event => event.currentBid === 110));
    assert.equal(await db.bid.count({ where: { auctionId: auction.id } }), 1);
  });
  await t.test('invalid and seller self-bids leave bid count and current price unchanged', async () => {
    for (const amount of [0,-1,'invalid',100,110]) assert.equal((await bid(auction.id,'b',amount)).status,400);
    assert.equal((await bid(auction.id,'seller',200)).status,400);
    const stored=await db.auction.findUniqueOrThrow({where:{id:auction.id}});
    assert.equal(stored.currentBid,110); assert.equal(stored.bidCount,1);
    assert.equal(await db.bid.count({where:{auctionId:auction.id}}),1);
  });
  await t.test('concurrent bids preserve the maximum accepted price and roll back losing transactions', async () => {
    const attempts=[['a',150],['b',170],['c',190],['a',210],['b',230],['c',250]];
    const responses=await Promise.all(attempts.map(([user,amount])=>bid(auction.id,user,amount)));
    const accepted=responses.flatMap((response,index)=>response.status===200?[attempts[index][1]]:[]);
    assert.ok(accepted.length>=1);
    for(const response of responses)assert.ok([200,400].includes(response.status));
    const stored=await db.auction.findUniqueOrThrow({where:{id:auction.id},include:{bids:true}});
    assert.equal(stored.currentBid,Math.max(110,...accepted));
    assert.equal(stored.bidCount,1+accepted.length);
    assert.equal(stored.bids.length,stored.bidCount,'Failed transactions must not leave orphan bid rows');
    assert.equal(stored.currentBid,Math.max(...stored.bids.map(item=>item.amount)));
    const visible=await api(`/auctions/${auction.id}`);
    assert.equal(visible.data.bids[0].amount,stored.currentBid,'Visible leading bidder must match the committed maximum');
    await until(()=>firstEvents.some(event=>event.currentBid===stored.currentBid)&&secondEvents.some(event=>event.currentBid===stored.currentBid));
    metrics.concurrentBids={attempted:attempts.length,accepted:accepted.length,rejected:attempts.length-accepted.length,currentBid:stored.currentBid,committedBidRows:stored.bidCount};
    t.diagnostic(JSON.stringify(metrics.concurrentBids));
  });
  await t.test('disconnected client reloads canonical state and receives live updates after reconnection', async () => {
    second.disconnect();
    const previous=secondEvents.length;
    let stored=await db.auction.findUniqueOrThrow({where:{id:auction.id}});
    assert.equal((await bid(auction.id,'c',stored.currentBid+10)).status,200);
    await delay(50); assert.equal(secondEvents.length,previous);
    await connect(second); second.emit('join-auction',auction.id);
    const snapshot=await api(`/auctions/${auction.id}`);
    assert.equal(snapshot.data.currentBid,stored.currentBid+10);
    stored=await db.auction.findUniqueOrThrow({where:{id:auction.id}});
    assert.equal((await bid(auction.id,'a',stored.currentBid+10)).status,200);
    await until(()=>secondEvents.some(event=>event.currentBid===stored.currentBid+10));
  });
  await t.test('another user cannot close a seller listing or impersonate a bidder through Socket.IO', async () => {
    assert.equal((await api(`/auctions/${auction.id}/close`,{token:accounts.b.token,body:{action:'cancel',reason:'This is not my listing.'}})).status,400);
    const count=await db.bid.count({where:{auctionId:auction.id}});
    const error=new Promise(resolve=>first.once('bid-error',resolve));
    first.emit('place-bid',{auctionId:auction.id,amount:10000,bidderId:accounts.seller.id});
    assert.match((await error).message,/authenticated/);
    assert.equal(await db.bid.count({where:{auctionId:auction.id}}),count);
  });
  await t.test('buy-now records one purchase and rejects seller, repeat, and post-sale bids', async () => {
    const item=await listing({buyItNowPrice:300});
    assert.equal((await api(`/auctions/${item.id}/buy-now`,{token:accounts.seller.token,body:{}})).status,400);
    assert.equal((await bid(item.id,'a',150)).status,200);
    const response=await api(`/auctions/${item.id}/buy-now`,{token:accounts.b.token,body:{}});
    assert.equal(response.status,200); assert.equal(response.data.auction.status,'sold');
    assert.equal(response.data.auction.currentBid,300); assert.equal(response.data.auction.bids[0].bidderId,accounts.b.id);
    assert.equal((await api(`/auctions/${item.id}/buy-now`,{token:accounts.a.token,body:{}})).status,400);
    assert.equal((await bid(item.id,'c',350)).status,400);
    assert.equal(await db.bid.count({where:{auctionId:item.id}}),2);
  });
  await t.test('two concurrent buy-now requests cannot purchase the same listing twice', async () => {
    const item=await listing({buyItNowPrice:300});
    const responses=await Promise.all(['a','b'].map(user=>api(`/auctions/${item.id}/buy-now`,{token:accounts[user].token,body:{}})));
    assert.deepEqual(responses.map(response=>response.status).sort(),[200,400]);
    const stored=await db.auction.findUniqueOrThrow({where:{id:item.id},include:{bids:true}});
    assert.equal(stored.status,'sold'); assert.equal(stored.bidCount,1); assert.equal(stored.bids.length,1);
  });
  await t.test('configured deadline closes the auction and announces its highest valid bidder', async () => {
    const endTime=new Date(Date.now()+2500).toISOString();
    const item=await listing({endTime,reservePrice:120});
    assert.equal((await bid(item.id,'a',110)).status,200);
    assert.equal((await bid(item.id,'b',130)).status,200);
    await until(()=>endings.some(event=>event.auctionId===item.id),16000);
    const event=endings.find(event=>event.auctionId===item.id);
    assert.equal(event.winner.bidderName,accounts.b.name); assert.equal(event.winner.amount,130);
    const closed=await api(`/auctions/${item.id}`);
    assert.equal(closed.data.status,'ended'); assert.equal(closed.data.bids[0].bidderId,accounts.b.id);
    assert.equal((await bid(item.id,'c',200)).status,400);
    assert.equal(await db.bid.count({where:{auctionId:item.id}}),2);
    metrics.expiry={deadline:endTime,observedAt:new Date().toISOString(),winnerAmount:event.winner.amount,persistedWinnerId:closed.data.winnerId};
  });
  await t.test('no-bid and below-reserve auctions close without declaring a winner', async () => {
    const endTime=new Date(Date.now()+2000).toISOString();
    const empty=await listing({endTime}), reserved=await listing({endTime,reservePrice:200});
    assert.equal((await bid(reserved.id,'a',150)).status,200);
    await until(()=>[empty,reserved].every(item=>endings.some(event=>event.auctionId===item.id)),16000);
    for(const item of [empty,reserved]){
      assert.equal(endings.find(event=>event.auctionId===item.id).winner,null);
      assert.equal((await db.auction.findUniqueOrThrow({where:{id:item.id}})).status,'ended');
    }
  });
  await t.test('seller early acceptance enforces the reviewed bid and persists buyer notifications', async () => {
    const item=await listing({reservePrice:300});
    await bid(item.id,'a',110); await bid(item.id,'b',130);
    const highest=await db.bid.findFirstOrThrow({where:{auctionId:item.id},orderBy:{amount:'desc'}});
    assert.equal((await api(`/auctions/${item.id}/close`,{token:accounts.seller.token,body:{action:'accept-highest',expectedBidId:'stale'}})).status,400);
    const response=await api(`/auctions/${item.id}/close`,{token:accounts.seller.token,body:{action:'accept-highest',expectedBidId:highest.id}});
    assert.equal(response.status,200); assert.equal(response.data.auction.winnerId,accounts.b.id);
    assert.equal(response.data.auction.closureType,'accepted-highest');
    assert.equal(await db.notification.count({where:{userId:{in:[accounts.a.id,accounts.b.id]}}}),2);
    assert.equal((await api('/user/notifications',{token:accounts.b.token})).data.notifications.length,1);
  });
  await t.test('seller cancellation requires a reason after bids and preserves bidding history', async () => {
    const item=await listing(); await bid(item.id,'a',110);
    assert.equal((await api(`/auctions/${item.id}/close`,{token:accounts.seller.token,body:{action:'cancel'}})).status,400);
    const response=await api(`/auctions/${item.id}/close`,{token:accounts.seller.token,body:{action:'cancel',reason:'The isolated fixture is unavailable.'}});
    assert.equal(response.status,200); assert.equal(response.data.auction.status,'cancelled');
    assert.equal(response.data.auction.winnerId,null); assert.equal(await db.bid.count({where:{auctionId:item.id}}),1);
  });
  await t.test('real PostgreSQL foreign keys and watchlist uniqueness are enforced', async () => {
    assert.equal((await api(`/user/watchlist/${auction.id}`,{token:accounts.a.token,body:{}})).data.watched,true);
    await assert.rejects(db.watchlist.create({data:{userId:accounts.a.id,auctionId:auction.id}}),error=>error.code==='P2002');
    await assert.rejects(db.watchlist.create({data:{userId:accounts.a.id,auctionId:'missing-auction'}}),error=>error.code==='P2003');
    assert.equal(await db.watchlist.count(),1);
  });
  await t.test('React authentication/logout and server reconnection retain the correct selected auction', async () => {
    const {JSDOM}=await import('jsdom');
    const {act,createElement,StrictMode,useLayoutEffect}=await import('react');
    const dom=new JSDOM('<div id="root"></div>',{url:base});
    const originalFetch=globalThis.fetch;
    const globals={window:dom.window,document:dom.window.document,localStorage:dom.window.localStorage,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true,fetch:(url,options)=>originalFetch(new URL(url,base),options)};
    const previous=new Map(Object.keys(globals).map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
    for(const [key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value});
    let reactRoot,current;
    try {
      const {createRoot}=await import('react-dom/client');
      const {AuctionProvider}=await import('../src/context/AuctionContext.tsx');
      const {useAuction}=await import('../src/context/useAuction.ts');
      function Consumer(){const context=useAuction();useLayoutEffect(()=>{current=context;});return createElement('span',null,context.user.name);}
      async function reactUntil(predicate){for(let i=0;i<200&&!predicate();i++)await act(async()=>{await delay(25);});assert.ok(predicate(),'React state should converge after real HTTP/socket updates');}
      reactRoot=createRoot(document.getElementById('root'));
      await act(async()=>reactRoot.render(createElement(StrictMode,null,createElement(AuctionProvider,null,createElement(Consumer)))));
      await reactUntil(()=>current.isBackendConnected&&current.auctions.some(item=>item.id===auction.id));
      await act(async()=>{assert.equal((await current.authenticate(accounts.a.email,accounts.a.password)).success,true);});
      assert.equal(current.user.id,accounts.a.id); assert.ok(localStorage.getItem('auction-token'));
      const savedToken=localStorage.getItem('auction-token');
      await act(async()=>current.logout());
      assert.equal(current.user.id,''); assert.ok(localStorage.getItem('auction-token')===null,'Logout must remove the stored token');
      assert.equal((await api('/auth/me')).status,401);
      assert.equal((await api('/auth/me',{token:savedToken})).status,200,'Existing JWT logout is client-side; revocation is not implemented');
      await act(async()=>current.setSelectedItem(current.auctions.find(item=>item.id===auction.id)));
      await act(async()=>{await stopBackend();await delay(50);});
      await reactUntil(()=>!current.isBackendConnected);
      const before=await db.auction.findUniqueOrThrow({where:{id:auction.id}});
      await act(async()=>{await startBackend();assert.equal((await bid(auction.id,'c',before.currentBid+25)).status,200);});
      await reactUntil(()=>current.isBackendConnected&&current.selectedItem?.currentBid===before.currentBid+25);
      assert.equal(current.selectedItem.id,auction.id);
      assert.ok(current.auctions.some(item=>item.id===auction.id&&item.currentBid===before.currentBid+25));
      metrics.reactReconnect=true; metrics.logout='Client token removal; server JWT revocation not implemented';
    } finally {
      if(reactRoot)await act(async()=>reactRoot.unmount());
      dom.window.close();
      for(const [key,descriptor]of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
    }
  });
  metrics.applicationRecords={users:await db.user.count(),auctions:await db.auction.count(),bids:await db.bid.count()};
  metrics.backendUnexpectedSchedulerError=/Scheduler error:/.test(backendLog);
  assert.equal(metrics.backendUnexpectedSchedulerError,false);
});
