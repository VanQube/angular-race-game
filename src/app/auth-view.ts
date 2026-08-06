import { Component, computed, inject, signal } from '@angular/core';
import { FormField, email, form, minLength, required, submit } from '@angular/forms/signals';
import { AuthService } from './auth.service';

interface AuthFormValue {
  mode: 'login' | 'register';
  email: string;
  password: string;
  displayName: string;
}

@Component({
  selector: 'app-auth-view',
  imports: [FormField],
  templateUrl: './auth-view.html',
  styleUrl: './auth-view.css'
})
export class AuthView {
  private readonly auth = inject(AuthService);

  protected readonly formValue = signal<AuthFormValue>({
    mode: 'login',
    email: '',
    password: '',
    displayName: ''
  });

  protected readonly authForm = form(this.formValue, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email address' });
    required(path.password, { message: 'Password is required' });
    minLength(path.password, 8, { message: 'Password must be at least 8 characters' });
    required(path.displayName, {
      message: 'Display name is required',
      when: ({ valueOf }) => valueOf(path.mode) === 'register'
    });
  });

  protected readonly isAuthenticated = this.auth.isAuthenticated;
  protected readonly authError = this.auth.authError;
  protected readonly authSuccess = this.auth.authSuccess;
  protected readonly protectedData = signal<string | null>(null);

  protected readonly mode = computed(() => this.formValue().mode);
  protected readonly submitLabel = computed(() => (this.mode() === 'login' ? 'Sign in' : 'Register'));
  protected readonly toggleText = computed(() =>
    this.mode() === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'
  );

  protected toggleMode(): void {
    this.formValue.update((value) => ({ ...value, mode: value.mode === 'login' ? 'register' : 'login' }));
    this.auth.clearMessages();
    this.protectedData.set(null);
  }

  protected submit(): void {
    void submit(this.authForm, async (field) => {
      this.auth.clearMessages();
      this.protectedData.set(null);

      const { mode, email: emailValue, password, displayName } = field().value();

      try {
        if (mode === 'login') {
          await this.auth.login(emailValue, password);
        } else {
          await this.auth.register(emailValue, password, displayName);
        }
      } catch {
        // AuthService sets error state
      }
    });
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
}
