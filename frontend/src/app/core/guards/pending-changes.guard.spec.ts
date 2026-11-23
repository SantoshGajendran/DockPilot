import { TestBed } from '@angular/core/testing';
import { pendingChangesGuard, ComponentCanDeactivate } from './pending-changes.guard';

describe('pendingChangesGuard', () => {
  it('should allow navigation if component allows', () => {
    const comp: ComponentCanDeactivate = {
      canDeactivate: () => true,
    };
    TestBed.runInInjectionContext(() => {
      const res = pendingChangesGuard(comp, null as any, null as any, null as any);
      expect(res).toBe(true);
    });
  });

  it('should prevent navigation if component disallows', () => {
    const comp: ComponentCanDeactivate = {
      canDeactivate: () => false,
    };
    TestBed.runInInjectionContext(() => {
      const res = pendingChangesGuard(comp, null as any, null as any, null as any);
      expect(res).toBe(false);
    });
  });

  it('should allow navigation if component has no canDeactivate method', () => {
    TestBed.runInInjectionContext(() => {
      const res = pendingChangesGuard({} as any, null as any, null as any, null as any);
      expect(res).toBe(true);
    });
  });
});
