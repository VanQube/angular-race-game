import { describe, expect, it } from 'vitest';
import {
  createAuthToken,
  verifyAuthToken,
  validateLoginPayload,
  validateRegisterPayload,
  formatPublicUser,
  hashPassword,
  verifyPassword
} from './auth.model.js';

describe('auth.model', () => {
  it('validates registration payload correctly', () => {
    const result = validateRegisterPayload({
      email: 'test@example.com',
      password: 'password123',
      displayName: 'Test User'
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects invalid registration payload', () => {
    const result = validateRegisterPayload({
      email: 'invalid',
      password: 'short',
      displayName: ''
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('email must be a valid email address');
    expect(result.errors).toContain('password must be at least 8 characters');
    expect(result.errors).toContain('displayName is required');
  });

  it('validates login payload correctly', () => {
    const result = validateLoginPayload({
      email: 'test@example.com',
      password: 'password123'
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('rejects invalid login payload', () => {
    const result = validateLoginPayload({
      email: '',
      password: ''
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('email is required');
    expect(result.errors).toContain('password is required');
  });

  it('hashes and verifies password securely', () => {
    const password = 'secure-password-123';
    const hash = hashPassword(password);

    expect(hash).toContain(':');
    expect(verifyPassword(hash, password)).toBe(true);
    expect(verifyPassword(hash, 'wrong-password')).toBe(false);
  });

  it('creates and verifies JWT-style auth tokens', () => {
    const token = createAuthToken({ userId: '123', email: 'test@example.com' }, 60);
    const payload = verifyAuthToken(token);

    expect(payload).not.toBeNull();
    expect(payload.userId).toBe('123');
    expect(payload.email).toBe('test@example.com');
  });

  it('defaults favoriteCarModelIds to an empty array when the user has none', () => {
    const publicUser = formatPublicUser({
      _id: 'user-1',
      email: 'racer@example.com',
      displayName: 'Racer',
      createdAt: '2024-01-01T00:00:00.000Z'
    });

    expect(publicUser.favoriteCarModelIds).toEqual([]);
  });

  it('passes through existing favoriteCarModelIds', () => {
    const publicUser = formatPublicUser({
      _id: 'user-1',
      email: 'racer@example.com',
      displayName: 'Racer',
      createdAt: '2024-01-01T00:00:00.000Z',
      favoriteCarModelIds: ['Vanta', 'Rift']
    });

    expect(publicUser.favoriteCarModelIds).toEqual(['Vanta', 'Rift']);
  });
});
