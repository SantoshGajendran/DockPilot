import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router, ActivatedRoute } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login.component';
import { AuthService } from '../../core/services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: { login: jest.Mock };
  let router: Router;
  let activatedRoute: ActivatedRoute;

  beforeEach(async () => {
    authServiceSpy = { login: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    activatedRoute = TestBed.inject(ActivatedRoute);
    jest.spyOn(router, 'navigateByUrl').mockImplementation(() => Promise.resolve(true));
    fixture.detectChanges();
  });

  it('should initialize with invalid form', () => {
    expect(component.loginForm.valid).toBe(false);
  });

  it('should toggle password visibility', () => {
    expect(component.hidePassword()).toBe(true);
    component.togglePasswordVisibility();
    expect(component.hidePassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.hidePassword()).toBe(true);
  });

  it('should call authService.login and redirect to returnUrl on submit', () => {
    authServiceSpy.login.mockReturnValue(of({
      access_token: 'fake',
      token_type: 'bearer',
      user: { id: '1', username: 'admin', role: 'admin', is_active: true }
    }));

    component.loginForm.patchValue({ username: 'admin', password: 'password123' });
    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({ username: 'admin', password: 'password123' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('should redirect to queryParam returnUrl when specified', () => {
    activatedRoute.snapshot.queryParams = { returnUrl: '/containers' };

    authServiceSpy.login.mockReturnValue(of({
      access_token: 'fake',
      token_type: 'bearer',
      user: { id: '1', username: 'admin', role: 'admin', is_active: true }
    }));

    component.loginForm.patchValue({ username: 'admin', password: 'password123' });
    component.onSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({ username: 'admin', password: 'password123' });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/containers');
  });

  it('should not submit if form is invalid', () => {
    component.loginForm.patchValue({ username: '', password: '' });
    component.onSubmit();

    expect(authServiceSpy.login).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
  });

  it('should display error message on login failure', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({
      error: { detail: 'Invalid username or password' }
    })));

    component.loginForm.patchValue({ username: 'admin', password: 'wrong' });
    component.onSubmit();

    expect(component.errorMessage()).toBe('Invalid username or password');
    expect(component.isLoading()).toBe(false);
  });

  it('should display fallback error message when error detail is missing', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({})));

    component.loginForm.patchValue({ username: 'admin', password: 'wrong' });
    component.onSubmit();

    expect(component.errorMessage()).toBe('Invalid username or password');
    expect(component.isLoading()).toBe(false);
  });
});
