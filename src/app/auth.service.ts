import { Service, computed, signal } from '@angular/core';
import { MONGO_CONFIG } from './data/race-db/mongo.config';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  favoriteCarModelIds: string[];
}

const AUTH_TOKEN_KEY = 'race-game-auth-token';

interface ApiErrorPayload {
  error?: {
    message?: string;
    details?: string[];
  };
}

interface LoginResponsePayload {
  token?: string;
  user?: AuthUser;
}

interface RegisterResponsePayload {
  user?: AuthUser;
}

interface MeResponsePayload {
  user?: AuthUser;
}

@Service()
export class AuthService {
  private readonly tokenSource = signal<string | null>(this.getSavedToken());
  private readonly userSource = signal<AuthUser | null>(null);
  private readonly errorSource = signal<string | null>(null);
  private readonly successSource = signal<string | null>(null);

  private readonly readyPromise: Promise<void>;

  readonly user = this.userSource.asReadonly();
  readonly token = this.tokenSource.asReadonly();
  readonly isAuthenticated = computed(() => Boolean(this.userSource()));
  readonly authError = this.errorSource.asReadonly();
  readonly authSuccess = this.successSource.asReadonly();

  constructor() {
    this.readyPromise = this.initialize();
  }

  ready(): Promise<void> {
    return this.readyPromise;
  }

  private getSavedToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(AUTH_TOKEN_KEY);
  }

  private saveToken(token: string | null): void {
    this.tokenSource.set(token);

    if (typeof window !== 'undefined') {
      if (token) {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
      } else {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
  }

  private get authHeaders(): Record<string, string> {
    const token = this.tokenSource();
    if (!token) {
      return {};
    }

    return { Authorization: `Bearer ${token}` };
  }

  private async initialize(): Promise<void> {
    if (!this.tokenSource()) {
      return;
    }

    try {
      const user = await this.fetchMe();
      this.userSource.set(user);
    } catch {
      this.clearAuth();
    }
  }

  private clearAuth(): void {
    this.saveToken(null);
    this.userSource.set(null);
  }

  private async parseResponseBody(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  private extractErrorMessage(payload: unknown, fallback: string): string {
    const errorPayload = payload as ApiErrorPayload | null;
    const details = errorPayload?.error?.details;
    if (Array.isArray(details) && details.length > 0) {
      return details.join(', ');
    }

    return errorPayload?.error?.message ?? fallback;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    this.errorSource.set(null);
    this.successSource.set(null);

    const response = await fetch(`${MONGO_CONFIG.baseUrl}${MONGO_CONFIG.auth.login}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const payload = (await this.parseResponseBody(response)) as LoginResponsePayload | null;
    if (!response.ok) {
      this.errorSource.set(this.extractErrorMessage(payload, 'Unable to sign in'));
      throw new Error(this.errorSource() ?? 'Login failed');
    }

    const token = payload?.token;
    const user = payload?.user;

    if (typeof token !== 'string' || !user) {
      this.errorSource.set('Invalid login response');
      throw new Error('Invalid login response');
    }

    this.saveToken(token);
    this.userSource.set(user);
    this.successSource.set('Signed in successfully');
    return user;
  }

  async register(email: string, password: string, displayName: string): Promise<AuthUser> {
    this.errorSource.set(null);
    this.successSource.set(null);

    const response = await fetch(`${MONGO_CONFIG.baseUrl}${MONGO_CONFIG.auth.register}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName })
    });

    const payload = (await this.parseResponseBody(response)) as RegisterResponsePayload | null;
    if (!response.ok) {
      this.errorSource.set(this.extractErrorMessage(payload, 'Unable to register'));
      throw new Error(this.errorSource() ?? 'Registration failed');
    }

    this.successSource.set('Registration successful. Please sign in.');
    return payload?.user as AuthUser;
  }

  async fetchMe(): Promise<AuthUser> {
    const response = await fetch(`${MONGO_CONFIG.baseUrl}${MONGO_CONFIG.auth.me}`, {
      headers: { ...this.authHeaders }
    });

    const payload = (await this.parseResponseBody(response)) as MeResponsePayload | null;
    if (!response.ok || !payload?.user) {
      throw new Error('Unable to fetch profile');
    }

    return payload.user;
  }

  async getProtectedData(): Promise<unknown> {
    const response = await fetch(`${MONGO_CONFIG.baseUrl}${MONGO_CONFIG.auth.protected}`, {
      headers: { ...this.authHeaders }
    });

    if (!response.ok) {
      const payload = await this.parseResponseBody(response);
      throw new Error(this.extractErrorMessage(payload, 'Protected access failed'));
    }

    return await response.json();
  }

  setError(message: string | null): void {
    this.errorSource.set(message);
  }

  clearMessages(): void {
    this.errorSource.set(null);
    this.successSource.set(null);
  }

  logout(): void {
    this.clearAuth();
    this.successSource.set('Signed out successfully');
  }

  setFavoriteCarModelIds(favoriteCarModelIds: string[]): void {
    this.userSource.update((user) => (user ? { ...user, favoriteCarModelIds } : user));
  }
}
