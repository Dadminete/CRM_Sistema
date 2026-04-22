import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import jwt from "jsonwebtoken";

import { db } from "@/lib/db";
import { sesionesUsuario, usuarios } from "@/lib/db/schema";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "30d";

export interface TokenPayload {
  userId: string;
  sessionId: string;
  iat?: number;
  exp?: number;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user session
 */
export function generateToken(userId: string, sessionId: string): string {
  const payload: TokenPayload = {
    userId,
    sessionId,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Create a new session in the database
 */
export async function createSession(userId: string, ipAddress?: string, userAgent?: string): Promise<string> {
  const tokenHash = await hashPassword(`${userId}-${Date.now()}`);
  const now = new Date();
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + 30); // 30 days from now

  const [session] = await db
    .insert(sesionesUsuario)
    .values({
      usuarioId: userId,
      tokenHash,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      activa: true,
      fechaUltimoUso: now.toISOString(),
      fechaExpiracion: expirationDate.toISOString(),
    })
    .returning();

  return session.id;
}

/**
 * Invalidate a session by marking it as inactive
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  await db.update(sesionesUsuario).set({ activa: false }).where(eq(sesionesUsuario.id, sessionId));
}

/**
 * Get active session from database
 */
export async function getActiveSession(sessionId: string) {
  if (!sessionId) return null;

  try {
    const [session] = await db
      .select()
      .from(sesionesUsuario)
      .where(and(eq(sesionesUsuario.id, sessionId), eq(sesionesUsuario.activa, true)))
      .limit(1);

    if (!session) return null;

    // Check if session is expired
    const now = new Date();
    const expiration = new Date(session.fechaExpiracion);

    if (now > expiration) {
      await invalidateSession(sessionId);
      return null;
    }

    return session;
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Auth] Error fetching active session (ignored):", error);
    }
    return null;
  }
}

/**
 * Get user by session ID
 */
export async function getUserBySession(sessionId: string) {
  try {
    const session = await getActiveSession(sessionId);
    if (!session) return null;

    const [user] = await db
      .select({
        id: usuarios.id,
        username: usuarios.username,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        email: usuarios.email,
        avatar: usuarios.avatar,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(eq(usuarios.id, session.usuarioId))
      .limit(1);

    return user || null;
  } catch (error) {
    console.error("[Auth] Error fetching user by session:", error);
    return null;
  }
}

export async function getUserById(userId: string) {
  try {
    if (!userId) return null;

    const [user] = await db
      .select({
        id: usuarios.id,
        username: usuarios.username,
        nombre: usuarios.nombre,
        apellido: usuarios.apellido,
        email: usuarios.email,
        avatar: usuarios.avatar,
        activo: usuarios.activo,
      })
      .from(usuarios)
      .where(eq(usuarios.id, userId))
      .limit(1);

    if (!user || !user.activo) return null;
    return user;
  } catch (error) {
    console.error("[Auth] Error fetching user by id:", error);
    return null;
  }
}

/**
 * Get current user from cookies (for Server Components)
 */
export async function getCurrentUser(token: string | undefined) {
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const userFromSession = await getUserBySession(payload.sessionId);
  if (userFromSession) return userFromSession;

  return getUserById(payload.userId);
}
