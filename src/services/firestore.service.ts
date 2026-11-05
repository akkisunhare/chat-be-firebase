import {
  Firestore,
  CollectionReference,
  DocumentData,
  FieldValue,
  Query,
} from 'firebase-admin/firestore';
import { firestoreDb, isFirebaseConfigured } from '../config/firebase';
import { AppError } from '../utils/AppError';
import {
  MessageItem,
  PaginationMetadata,
  MarkMessageReadResponseData,
  UpdateLastSeenResponseData,
} from '../types/chat.types';

export interface FirestoreHealthStatus {
  status: 'connected' | 'not_configured' | 'disconnected';
  responseTimeMs?: number;
  error?: string;
}

export class FirestoreService {
  /**
   * Retrieve the active Firestore instance. Throws an AppError if not initialized.
   */
  public static getDb(): Firestore {
    if (!isFirebaseConfigured || !firestoreDb) {
      throw new AppError(
        'Firestore is not configured. Please check FIREBASE_* variables in .env',
        500
      );
    }
    return firestoreDb;
  }

  /**
   * Verify Firestore connectivity and credentials with a lightweight ping
   */
  public static async verifyConnectivity(): Promise<FirestoreHealthStatus> {
    if (!isFirebaseConfigured || !firestoreDb) {
      return {
        status: 'not_configured',
        error: 'Firebase credentials not supplied in .env',
      };
    }

    const start = Date.now();
    try {
      await firestoreDb.listCollections();
      return {
        status: 'connected',
        responseTimeMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'disconnected',
        responseTimeMs: Date.now() - start,
        error: error instanceof Error ? error.message : 'Firestore connection failed',
      };
    }
  }

  /**
   * Generic helper to get a typed collection reference
   */
  public static collection<T = DocumentData>(collectionName: string): CollectionReference<T> {
    return this.getDb().collection(collectionName) as CollectionReference<T>;
  }

  /**
   * Save a chat message to Firestore under chats/{chatId}/messages/{messageId}
   */
  public static async saveMessage(
    chatId: string,
    messageId: string,
    senderId: string,
    text: string
  ): Promise<{
    messageId: string;
    chatId: string;
    senderId: string;
    text: string;
    timestamp: string;
  }> {
    const db = this.getDb();
    const docRef = db
      .collection('chats')
      .doc(chatId)
      .collection('messages')
      .doc(messageId);

    const now = new Date();
    await docRef.set({
      messageId,
      chatId,
      senderId,
      text,
      timestamp: FieldValue.serverTimestamp(),
      createdAtIso: now.toISOString(),
    });

    try {
      const snap = await docRef.get();
      const data = snap.data();
      const firestoreTime = data?.timestamp;
      let timestampStr = now.toISOString();

      if (firestoreTime && typeof firestoreTime.toDate === 'function') {
        timestampStr = firestoreTime.toDate().toISOString();
      }

      return {
        messageId,
        chatId,
        senderId,
        text,
        timestamp: timestampStr,
      };
    } catch {
      return {
        messageId,
        chatId,
        senderId,
        text,
        timestamp: now.toISOString(),
      };
    }
  }

  /**
   * Retrieve messages using server-side ordering and cursor-based pagination
   */
  public static async getMessages(
    chatId: string,
    limit: number,
    cursor?: string
  ): Promise<{
    messages: MessageItem[];
    pagination: PaginationMetadata;
  }> {
    const db = this.getDb();
    const messagesCollection = db.collection('chats').doc(chatId).collection('messages');

    let query: Query = messagesCollection
      .orderBy('timestamp', 'asc')
      .orderBy('__name__', 'asc');

    if (cursor) {
      const cursorDoc = await messagesCollection.doc(cursor).get();
      if (!cursorDoc.exists) {
        throw new AppError(`Cursor message with ID ${cursor} does not exist in this chat`, 400);
      }
      query = query.startAfter(cursorDoc);
    }

    query = query.limit(limit + 1);

    const snapshot = await query.get();
    const hasMore = snapshot.docs.length > limit;
    const returnedDocs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;
    const nextCursor =
      hasMore && returnedDocs.length > 0 ? returnedDocs[returnedDocs.length - 1].id : null;

    const messages: MessageItem[] = returnedDocs.map((doc) => {
      const data = doc.data();
      let timestampStr = data.createdAtIso || new Date().toISOString();
      if (data.timestamp && typeof data.timestamp.toDate === 'function') {
        timestampStr = data.timestamp.toDate().toISOString();
      }
      return {
        messageId: doc.id,
        chatId,
        senderId: data.senderId,
        text: data.text,
        timestamp: timestampStr,
      };
    });

    return {
      messages,
      pagination: {
        limit,
        hasMore,
        nextCursor,
      },
    };
  }

  /**
   * Mark a message as read in Firestore under chats/{chatId}/messages/{messageId}/readReceipts/{userId}
   * Idempotent: Does not alter readAt if already marked read by the same user.
   */
  public static async markMessageRead(
    chatId: string,
    messageId: string,
    userId: string
  ): Promise<MarkMessageReadResponseData> {
    const db = this.getDb();
    const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);

    // 1. Verify message exists in this specific chat
    const messageSnap = await messageRef.get();
    if (!messageSnap.exists) {
      throw new AppError(`Message with ID ${messageId} does not exist in this chat`, 404);
    }

    const receiptRef = messageRef.collection('readReceipts').doc(userId);
    const existingReceipt = await receiptRef.get();

    // 2. Idempotent check: if already read, return original read timestamp
    if (existingReceipt.exists) {
      const data = existingReceipt.data();
      const firestoreTime = data?.readAt;
      let readAtStr = data?.createdAtIso || new Date().toISOString();
      if (firestoreTime && typeof firestoreTime.toDate === 'function') {
        readAtStr = firestoreTime.toDate().toISOString();
      }
      return {
        chatId,
        messageId,
        userId,
        readAt: readAtStr,
      };
    }

    // 3. Write new read receipt
    const now = new Date();
    await receiptRef.set({
      userId,
      readAt: FieldValue.serverTimestamp(),
      createdAtIso: now.toISOString(),
    });

    let readAtStr = now.toISOString();
    try {
      const savedSnap = await receiptRef.get();
      const savedData = savedSnap.data();
      if (savedData?.readAt && typeof savedData.readAt.toDate === 'function') {
        readAtStr = savedData.readAt.toDate().toISOString();
      }
    } catch {
      readAtStr = now.toISOString();
    }

    return {
      chatId,
      messageId,
      userId,
      readAt: readAtStr,
    };
  }

  /**
   * Update the user's last seen position in Firestore under chats/{chatId}/lastSeen/{userId}
   * Enforces sequence monotonicity (cannot move last seen position backwards in time).
   */
  public static async updateLastSeen(
    chatId: string,
    userId: string,
    messageId: string
  ): Promise<UpdateLastSeenResponseData> {
    const db = this.getDb();
    const messageRef = db.collection('chats').doc(chatId).collection('messages').doc(messageId);

    // 1. Verify message exists in this chat
    const messageSnap = await messageRef.get();
    if (!messageSnap.exists) {
      throw new AppError(`Message with ID ${messageId} does not exist in this chat`, 404);
    }

    const messageData = messageSnap.data();
    const newMsgMillis =
      messageData?.timestamp?.toMillis?.() ??
      new Date(messageData?.createdAtIso || Date.now()).getTime();

    const lastSeenRef = db.collection('chats').doc(chatId).collection('lastSeen').doc(userId);
    const existingLastSeen = await lastSeenRef.get();

    if (existingLastSeen.exists) {
      const existingData = existingLastSeen.data();

      // If already set to this exact message, return existing data (idempotent)
      if (existingData?.messageId === messageId) {
        let lastSeenAtStr = existingData?.updatedAtIso || new Date().toISOString();
        if (existingData?.lastSeenAt && typeof existingData.lastSeenAt.toDate === 'function') {
          lastSeenAtStr = existingData.lastSeenAt.toDate().toISOString();
        }
        return {
          chatId,
          userId,
          messageId,
          lastSeenAt: lastSeenAtStr,
        };
      }

      // Check that position does not move backwards in sequence
      const existingMsgMillis =
        existingData?.messageTimestamp?.toMillis?.() ??
        new Date(existingData?.messageTimestampIso || 0).getTime();

      if (newMsgMillis < existingMsgMillis) {
        throw new AppError('Cannot move last seen backwards in message sequence', 400);
      }
    }

    const now = new Date();
    await lastSeenRef.set({
      userId,
      messageId,
      lastSeenAt: FieldValue.serverTimestamp(),
      messageTimestamp: messageData?.timestamp || FieldValue.serverTimestamp(),
      messageTimestampIso: new Date(newMsgMillis).toISOString(),
      updatedAtIso: now.toISOString(),
    });

    let lastSeenAtStr = now.toISOString();
    try {
      const savedSnap = await lastSeenRef.get();
      const savedData = savedSnap.data();
      if (savedData?.lastSeenAt && typeof savedData.lastSeenAt.toDate === 'function') {
        lastSeenAtStr = savedData.lastSeenAt.toDate().toISOString();
      }
    } catch {
      lastSeenAtStr = now.toISOString();
    }

    return {
      chatId,
      userId,
      messageId,
      lastSeenAt: lastSeenAtStr,
    };
  }
}
