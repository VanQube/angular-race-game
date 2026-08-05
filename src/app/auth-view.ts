import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-auth-view',
  imports: [],
  templateUrl: './auth-view.html',
  styleUrl: './auth-view.css'
})
export class AuthView {
  private readonly auth = inject(AuthService);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly displayName = signal('');
  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly authError = this.auth.authError;
  protected readonly authSuccess = this.auth.authSuccess;
  protected readonly protectedData = signal<string | null>(null);

  protected readonly submitLabel = computed(() => (this.mode() === 'login' ? 'Sign in' : 'Register'));
  protected readonly toggleText = computed(() =>
    this.mode() === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'
  );

  protected toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.auth.clearMessages();
    this.protectedData.set(null);
  }

  protected async submit(): Promise<void> {
    this.auth.clearMessages();
    this.protectedData.set(null);

    try {
      if (this.mode() === 'login') {
        await this.auth.login(this.email(), this.password());
      } else {
        await this.auth.register(this.email(), this.password(), this.displayName());
      }
    } catch {
      // AuthService sets error state
    }
  }

  protected async fetchProtectedData(): Promise<void> {
    try {
      this.auth.clearMessages();
      const data = await this.auth.getProtectedData();
      this.protectedData.set(JSON.stringify(data, null, 2));
    } catch (error) {
      this.auth.setError(error instanceof Error ? error.message : 'Unable to fetch protected data');
    }
  }

  protected onEmailInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (target) {
      this.email.set(target.value);
    }
  }

  protected onPasswordInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (target) {
      this.password.set(target.value);
    }
  }

  protected onDisplayNameInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    if (target) {
      this.displayName.set(target.value);
    }
  }
}
