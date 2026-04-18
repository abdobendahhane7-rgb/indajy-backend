import "dotenv/config";
import { Injectable } from "@nestjs/common";
import * as admin from "firebase-admin";

@Injectable()
export class FirebaseAdminService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.initialized || admin.apps.length > 0) {
      this.initialized = true;
      return;
    }

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!projectId || !clientEmail || !privateKey) {
      console.warn("Firebase Admin env vars are missing.");
      return;
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });

      this.initialized = true;
    } catch (error) {
      console.error("Firebase Admin init failed:", error);
      this.initialized = false;
    }
  }

  get isReady() {
    return this.initialized && admin.apps.length > 0;
  }

  async sendPushToToken(params: {
    token: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    if (!this.isReady) {
      return { skipped: true, reason: "firebase_not_initialized" };
    }

    return admin.messaging().send({
      token: params.token,
      notification: {
        title: params.title,
        body: params.body,
      },
      data: params.data ?? {},
      android: {
        priority: "high",
      },
    });
  }
}