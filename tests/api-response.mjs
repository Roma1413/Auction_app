import assert from 'node:assert/strict';
import { readApiResponse } from '../src/utils/apiResponse.ts';

assert.deepEqual(await readApiResponse(new Response('{"success":true}')), { success: true });
assert.deepEqual(await readApiResponse(new Response('[]')), []);
await assert.rejects(readApiResponse(new Response('{"message":"The highest bid changed"}', { status: 400 })), /highest bid changed/);
await assert.rejects(readApiResponse(new Response('<!DOCTYPE html><title>Bad gateway</title>', { status: 502 })), /temporarily unavailable.*Check the listing status/);
await assert.rejects(readApiResponse(new Response('<!DOCTYPE html>', { status: 404 })), /feature is unavailable/);
await assert.rejects(readApiResponse(new Response('<!DOCTYPE html>', { status: 200 })), /unexpected response.*check the listing status/);
await assert.rejects(readApiResponse(new Response('', { status: 503 })), /temporarily unavailable/);
await assert.rejects(readApiResponse(new Response('{}', { status: 401 })), /Request failed \(401\)/);
console.log('API response checks passed: JSON success, server errors, HTML gateway errors, missing routes, malformed success, and empty responses.');
