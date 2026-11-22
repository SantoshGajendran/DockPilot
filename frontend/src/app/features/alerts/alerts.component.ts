import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AlertsStore } from './alerts.store';
import { AuthService } from '../../core/services/auth.service';
import { AlertEvent, AlertRule } from '../../core/models/alerts.model';
import { RULE_TYPES, SEVERITIES } from '../../core/constants/alerts.constants';
import { RuleDialogComponent } from './dialogs/rule-dialog.component';
import { SilenceDialogComponent } from './dialogs/silence-dialog.component';
import { AlertsService } from '../../core/services/alerts.service';

@Component({
  selector: 'dp-alerts',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule,
  ],
  providers: [AlertsStore],
  templateUrl: './alerts.component.html',
  styleUrls: ['./alerts.component.scss'],
})
export class AlertsComponent implements OnInit {
  readonly store = inject(AlertsStore);
  readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly alertsService = inject(AlertsService);

  readonly eventColumns: string[] = [
    'status',
    'severity',
    'rule',
    'target',
    'message',
    'started_at',
    'actions',
  ];

  readonly ruleColumns: string[] = [
    'enabled',
    'name',
    'type',
    'scope',
    'severity',
    'threshold',
    'cooldown',
    'actions',
  ];

  ngOnInit(): void {
    this.store.init();
  }

  get isOperator(): boolean {
    return this.authService.hasRole('operator');
  }

  get isAdmin(): boolean {
    return this.authService.hasRole('admin');
  }

  getTypeLabel(type: string): string {
    const meta = RULE_TYPES.find((t) => t.type === type);
    return meta?.label || type;
  }

  getTypeIcon(type: string): string {
    const meta = RULE_TYPES.find((t) => t.type === type);
    return meta?.icon || 'notifications';
  }

  openCreateRuleDialog(): void {
    const ref = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      data: {},
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.store.createRule(result, () => {
          this.snackBar.open('Alert rule created successfully', 'Close', { duration: 3000 });
        });
      }
    });
  }

  openEditRuleDialog(rule: AlertRule): void {
    const ref = this.dialog.open(RuleDialogComponent, {
      width: '600px',
      data: { rule },
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.store.updateRule(rule.id, result, () => {
          this.snackBar.open('Alert rule updated successfully', 'Close', { duration: 3000 });
        });
      }
    });
  }

  testRule(rule: AlertRule): void {
    this.alertsService.dryRunRuleById(rule.id).subscribe({
      next: (res) => {
        const matches = res.matches_count;
        const msg = matches > 0
          ? `Dry run: Rule conditions matched on ${matches} target(s)`
          : 'Dry run: No targets currently match alert conditions';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      },
      error: (err) => {
        this.snackBar.open(`Dry run failed: ${err?.message || 'Error'}`, 'Close', { duration: 4000 });
      },
    });
  }

  openSilenceDialog(event?: AlertEvent, rule?: AlertRule): void {
    const ref = this.dialog.open(SilenceDialogComponent, {
      width: '420px',
      data: { event, rule },
    });

    ref.afterClosed().subscribe((result) => {
      if (result) {
        this.store.createSilence(result, () => {
          this.snackBar.open('Alert silenced successfully', 'Close', { duration: 3000 });
        });
      }
    });
  }

  acknowledgeEvent(event: AlertEvent): void {
    this.store.acknowledgeEvent(event.id);
    this.snackBar.open('Alert acknowledged', 'Close', { duration: 2500 });
  }

  deleteRule(rule: AlertRule): void {
    if (confirm(`Are you sure you want to delete alert rule "${rule.name}"?`)) {
      this.store.deleteRule(rule.id);
      this.snackBar.open('Alert rule deleted', 'Close', { duration: 3000 });
    }
  }
}
