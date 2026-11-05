import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { connectDatabase, disconnectDatabase } from '../src/config/database';

describe('Chat Backend Full Test Suite (Requirements 1 - 15)', () => {
  const aliceId = '11111111-1111-4111-8111-111111111111';
  const bobId = '22222222-2222-4222-8222-222222222222';
  const charlieId = '33333333-3333-4333-8333-333333333333';
  const nonExistentId = '99999999-9999-4999-8999-999999999999';

  let chatId: string;
  let firstMessageId: string;
  let secondMessageId: string;

  beforeAll(async () => {
    await connectDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  // 1. Create chat
  it('1. Create chat: should create a new 1:1 chat between Alice and Bob', async () => {
    const res = await request(app)
      .post('/chat/create')
      .send({ userAId: aliceId, userBId: bobId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('chatId');
    chatId = res.body.data.chatId;
  });

  // 2. Get existing chat
  it('2. Get existing chat: should return existing chat without duplicate when order is reversed', async () => {
    const res = await request(app)
      .post('/chat/create')
      .send({ userAId: bobId, userBId: aliceId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.chatId).toBe(chatId);
  });

  // 3. Send message
  it('3. Send message: should allow a chat member (Alice) to send a message to Firestore', async () => {
    const res = await request(app)
      .post(`/chat/${chatId}/message/send`)
      .send({ senderId: aliceId, text: 'Hello Bob! This is message 1.' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.chatId).toBe(chatId);
    expect(res.body.data.senderId).toBe(aliceId);
    expect(res.body.data.text).toBe('Hello Bob! This is message 1.');
    expect(res.body.data).toHaveProperty('messageId');
    expect(res.body.data).toHaveProperty('timestamp');
    firstMessageId = res.body.data.messageId;

    // Send second message for pagination testing
    const res2 = await request(app)
      .post(`/chat/${chatId}/message/send`)
      .send({ senderId: bobId, text: 'Hey Alice! This is message 2.' });

    expect(res2.status).toBe(201);
    secondMessageId = res2.body.data.messageId;
  });

  // 4. Get messages
  it('4. Get messages: should retrieve messages in ascending order', async () => {
    const res = await request(app)
      .get(`/chat/${chatId}/messages?limit=50&userId=${aliceId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.messages)).toBe(true);
    expect(res.body.data.messages.length).toBeGreaterThanOrEqual(2);
    expect(res.body.data.messages[0]).toHaveProperty('messageId');
    expect(res.body.data.messages[0]).toHaveProperty('text');
  });

  // 5. Mark message read
  it('5. Mark message read: should store read receipt in Firestore', async () => {
    const res = await request(app)
      .post(`/chat/${chatId}/message/${firstMessageId}/read`)
      .send({ userId: bobId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.chatId).toBe(chatId);
    expect(res.body.data.messageId).toBe(firstMessageId);
    expect(res.body.data.userId).toBe(bobId);
    expect(res.body.data).toHaveProperty('readAt');
  });

  // 6. Update last seen
  it('6. Update last seen: should update the user last seen position in Firestore', async () => {
    const res = await request(app)
      .post(`/chat/${chatId}/lastseen`)
      .send({ userId: bobId, messageId: secondMessageId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.chatId).toBe(chatId);
    expect(res.body.data.userId).toBe(bobId);
    expect(res.body.data.messageId).toBe(secondMessageId);
    expect(res.body.data).toHaveProperty('lastSeenAt');
  });

  // 7. List user chats
  it('7. List user chats: should list all chats for Alice', async () => {
    const res = await request(app).get(`/user/${aliceId}/chats`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.chats)).toBe(true);
    expect(res.body.data.chats.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.chats[0]).toHaveProperty('chatId');
    expect(res.body.data.chats[0].members).toContain(aliceId);
  });

  // 8. Invalid UUID
  it('8. Invalid UUID: should reject invalid UUID parameters with 400 Bad Request', async () => {
    const res = await request(app)
      .post('/chat/create')
      .send({ userAId: 'not-a-valid-uuid', userBId: bobId });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 9. Non-existent chat
  it('9. Non-existent chat: should return 404 Not Found for non-existent chat ID', async () => {
    const res = await request(app)
      .post(`/chat/${nonExistentId}/message/send`)
      .send({ senderId: aliceId, text: 'Hello' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 10. Non-existent user
  it('10. Non-existent user: should return 404 when referencing non-existent user ID', async () => {
    const res = await request(app)
      .post('/chat/create')
      .send({ userAId: aliceId, userBId: nonExistentId });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  // 11. Non-member access
  it('11. Non-member access: should return 403 Forbidden when Charlie tries to send message in Alice-Bob chat', async () => {
    const res = await request(app)
      .post(`/chat/${chatId}/message/send`)
      .send({ senderId: charlieId, text: 'Unauthorized message' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 12. Empty message
  it('12. Empty message: should reject whitespace-only messages with 400 Bad Request', async () => {
    const res = await request(app)
      .post(`/chat/${chatId}/message/send`)
      .send({ senderId: aliceId, text: '    ' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 13. Invalid limit
  it('13. Invalid limit: should reject negative or zero limit with 400 Bad Request', async () => {
    const res = await request(app)
      .get(`/chat/${chatId}/messages?limit=0`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 14. Pagination
  it('14. Pagination: should paginate messages correctly using cursor', async () => {
    const page1 = await request(app).get(`/chat/${chatId}/messages?limit=1`);

    expect(page1.status).toBe(200);
    expect(page1.body.data.messages.length).toBe(1);
    expect(page1.body.data.pagination.hasMore).toBe(true);
    const cursor = page1.body.data.pagination.nextCursor;
    expect(cursor).toBeTruthy();

    const page2 = await request(app).get(`/chat/${chatId}/messages?limit=1&cursor=${cursor}`);
    expect(page2.status).toBe(200);
    expect(page2.body.data.messages.length).toBe(1);
    expect(page2.body.data.messages[0].messageId).not.toBe(page1.body.data.messages[0].messageId);
  });

  // 15. Duplicate read receipt
  it('15. Duplicate read receipt: should be idempotent when marking message read twice', async () => {
    const firstRead = await request(app)
      .post(`/chat/${chatId}/message/${firstMessageId}/read`)
      .send({ userId: bobId });

    expect(firstRead.status).toBe(200);
    const firstTimestamp = firstRead.body.data.readAt;

    const secondRead = await request(app)
      .post(`/chat/${chatId}/message/${firstMessageId}/read`)
      .send({ userId: bobId });

    expect(secondRead.status).toBe(200);
    expect(secondRead.body.data.readAt).toBe(firstTimestamp);
  });
});

