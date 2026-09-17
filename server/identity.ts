import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export interface IdentityService {
  issue(): { credentials: string; verifier: string };
  verify(credentials: unknown, verifier: unknown): boolean;
}
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export class GuestIdentityService implements IdentityService {
  issue() { const credentials = randomBytes(32).toString('base64url'); return { credentials, verifier: digest(credentials) }; }
  verify(credentials: unknown, verifier: unknown) {
    if (typeof credentials !== 'string' || credentials.length > 200 || typeof verifier !== 'string' || verifier.length !== 64) return false;
    return timingSafeEqual(Buffer.from(digest(credentials)), Buffer.from(verifier));
  }
}
