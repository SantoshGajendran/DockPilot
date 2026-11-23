import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmDangerDialogComponent } from './confirm-danger-dialog.component';

describe('ConfirmDangerDialogComponent', () => {
  let component: ConfirmDangerDialogComponent;
  let fixture: ComponentFixture<ConfirmDangerDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDangerDialogComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDangerDialogComponent);
    component = fixture.componentInstance;
    component.targetName = 'core-database';
    component.actionName = 'terminate';
    fixture.detectChanges();
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should render target name and hold button', () => {
    const targetEl = fixture.nativeElement.querySelector('.target-name');
    const holdBtn = fixture.nativeElement.querySelector('.btn-hold-confirm');

    expect(targetEl.textContent.trim()).toBe('core-database');
    expect(holdBtn.textContent.trim()).toContain('HOLD 1.2s TO CONFIRM');
  });

  it('should start and cancel hold on mouse release', () => {
    component.startHold();
    expect(component.isHolding).toBe(true);

    component.cancelHold();
    expect(component.isHolding).toBe(false);
    expect(component.holdProgress).toBe(0);
  });

  it('should emit confirmed after completing 1.2s hold', (done) => {
    const confirmSpy = jest.spyOn(component.confirmed, 'emit');
    component.startHold();

    setTimeout(() => {
      expect(confirmSpy).toHaveBeenCalled();
      done();
    }, 1250);
  });
});
