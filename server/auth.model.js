import crypto from 'crypto';

export const USER_COLLECTION_NAME = 'users';
export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function isValidEmail(email) {
  return EMAIL_REGEX.test(email);
}

export function validateRegisterPayload(body) {
  const errors = [];
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';
  const displayName = typeof body?.displayName === 'string' ? body.displayName.trim() : '';

  if (!email) {
    errors.push('email is required');
  } else if (!isValidEmail(email)) {
    errors.push('email must be a valid email address');
  }

  if (!password) {
    errors.push('password is required');
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  if (!displayName) {
    errors.push('displayName is required');
  } else if (displayName.length < 3 || displayName.length > 50) {
    errors.push('displayName must be between 3 and 50 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      email,
      password,
      displayName
    }
  };
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    cost: 16384,
    blockSize: 8,
    parallelization: 1
  }).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(passwordHash, password) {
  if (typeof passwordHash !== 'string' || !passwordHash.includes(':')) {
    return false;
  }

  const [salt, savedDerivedKey] = passwordHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64, {
    cost: 16384,
    blockSize: 8,
    parallelization: 1
  }).toString('hex');

  const savedBuffer = Buffer.from(savedDerivedKey, 'hex');
  const derivedBuffer = Buffer.from(derivedKey, 'hex');

  if (savedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(savedBuffer, derivedBuffer);
}

function base64UrlEncode(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(value) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), '=');
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf8');
}

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? 'race-game-secret';
}

export function createAuthToken(payload, expiresInSeconds = 3600) {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };
  const payloadSegment = base64UrlEncode(JSON.stringify(tokenPayload));
  const signature = base64UrlEncode(
    crypto
      .createHmac('sha256', getAuthSecret())
      .update(`${header}.${payloadSegment}`)
      .digest()
  );

  return `${header}.${payloadSegment}.${signature}`;
}

export function verifyAuthToken(token) {
  if (typeof token !== 'string') {
    return null;
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  const [headerSegment, payloadSegment, signature] = parts;
  const expectedSignature = base64UrlEncode(
    crypto
      .createHmac('sha256', getAuthSecret())
      .update(`${headerSegment}.${payloadSegment}`)
      .digest()
  );

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadSegment));
    if (typeof payload.exp !== 'number' || Math.floor(Date.now() / 1000) >= payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function validateLoginPayload(body) {
  const errors = [];
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === 'string' ? body.password : '';

  if (!email) {
    errors.push('email is required');
  } else if (!isValidEmail(email)) {
    errors.push('email must be a valid email address');
  }

  if (!password) {
    errors.push('password is required');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: {
      email,
      password
    }
  };
}

export function formatPublicUser(user) {
  return {
    id: user._id?.toString?.() ?? user.id,
    email: user.email,
    displayName: user.displayName,
    createdAt: user.createdAt,
    favoriteCarModelIds: user.favoriteCarModelIds ?? []
  };
}

export function createUserDocument({ email, password, displayName }) {
  return {
    email,
    displayName,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString()
  };
}
