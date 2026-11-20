import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { Session, SessionDocument } from './schemas/session.schema';
import { SESSION_IDLE_TIMEOUT_MS } from './users.constants';

/** Server-side sessions behind the refresh token cookie (ACC-06, ACC-19). */
@Injectable()
export class SessionsService {
  constructor(
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {}

  /** Starts a session and returns the raw refresh token (to put in the cookie). */
  async create(
    userId: string,
    userAgent?: string,
  ): Promise<{ session: SessionDocument; refreshToken: string }> {
    const refreshToken = this.generateToken();
    const session = await this.sessionModel.create({
      userId: new Types.ObjectId(userId),
      refreshTokenHash: this.hash(refreshToken),
      lastActivityAt: new Date(),
      userAgent,
    });
    return { session, refreshToken };
  }

  /** Returns the session if it is not revoked and not idle-expired, otherwise null. */
  async findValidById(sessionId: string): Promise<SessionDocument | null> {
    if (!Types.ObjectId.isValid(sessionId)) return null;
    const session = await this.sessionModel.findById(sessionId);
    return this.validOrNull(session);
  }

  async findValidByRefreshToken(
    refreshToken: string,
  ): Promise<SessionDocument | null> {
    const session = await this.sessionModel.findOne({
      refreshTokenHash: this.hash(refreshToken),
    });
    return this.validOrNull(session);
  }

  /** Issues a new refresh token for the session; the old one stops working. */
  async rotate(sessionId: string): Promise<string> {
    const refreshToken = this.generateToken();
    await this.sessionModel.updateOne(
      { _id: sessionId },
      { refreshTokenHash: this.hash(refreshToken) },
    );
    return refreshToken;
  }

  /** Called by JwtAuthGuard on every authenticated request. */
  async touch(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: sessionId },
      { lastActivityAt: new Date() },
    );
  }

  async revoke(sessionId: string): Promise<void> {
    await this.sessionModel.updateOne(
      { _id: sessionId, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  /** Used by logout: revokes the session even if it is already idle-expired. */
  async revokeByRefreshToken(refreshToken: string): Promise<void> {
    await this.sessionModel.updateOne(
      { refreshTokenHash: this.hash(refreshToken), revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  /** Logs the user out everywhere (suspension, deactivation, password reset). */
  async revokeAllForUser(userId: string, exceptSessionId?: string) {
    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
      revokedAt: null,
    };
    if (exceptSessionId) filter._id = { $ne: exceptSessionId };
    await this.sessionModel.updateMany(filter, { revokedAt: new Date() });
  }

  private async validOrNull(
    session: SessionDocument | null,
  ): Promise<SessionDocument | null> {
    if (!session || session.revokedAt) return null;
    const idleFor = Date.now() - session.lastActivityAt.getTime();
    if (idleFor > SESSION_IDLE_TIMEOUT_MS) {
      await this.revoke(session._id.toString());
      return null;
    }
    return session;
  }

  private generateToken(): string {
    return randomBytes(48).toString('hex');
  }

  // Refresh tokens are long random values, so a fast SHA-256 is enough (and lets us look them up)
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
