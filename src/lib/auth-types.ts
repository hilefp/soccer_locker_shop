// Authentication types - now using API types instead of database types

import type { JWTPayload, Session, User } from "~/lib/api/types";

// User type for compatibility
export type UserDbType = User;

// Session type
export type SessionType = Session;

// JWT payload type
export type JWTPayloadType = JWTPayload;

// Re-export for convenience
export type { User };
