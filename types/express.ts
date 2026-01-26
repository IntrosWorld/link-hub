import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface RequestContext {
  userAgent: string;
  ip: string;
}

export interface AuthenticatedRequest extends Request {
  user: DecodedIdToken;
  ctx: RequestContext;
}

export interface ContextRequest extends Request {
  ctx: RequestContext;
}
