import { Injectable, inject, signal } from '@angular/core';
import {
  AlertEvent,
  AlertRule,
  AlertRuleCreate,
  AlertRuleUpdate,
  AlertSilenceCreate,
} from '../../core/models/alerts.model';
import { AlertsService } from '../../core/services/alerts.service';

@Injectable()
export class AlertsStore {
  private readonly alertsService = inject(AlertsService);

  readonly rules = signal<AlertRule[]>([]);
  readonly rulesTotal = signal<number>(0);
  readonly rulesLoading = signal<boolean>(false);
  readonly rulesError = signal<string | null>(null);

  readonly events = signal<AlertEvent[]>([]);
  readonly eventsTotal = signal<number>(0);
  readonly eventsLoading = signal<boolean>(false);
  readonly eventsError = signal<string | null>(null);

  readonly eventsStatusFilter = signal<string | null>(null);
  readonly eventsSeverityFilter = signal<string | null>(null);

  readonly activeCount = signal<number>(0);

  init(): void {
    this.loadRules();
    this.loadEvents();
    this.refreshActiveCount();
  }

  loadRules(): void {
    this.rulesLoading.set(true);
    this.rulesError.set(null);
    this.alertsService.getRules().subscribe({
      next: (res) => {
        this.rules.set(res.rules);
        this.rulesTotal.set(res.total);
        this.rulesLoading.set(false);
      },
      error: (err) => {
        this.rulesError.set(err?.message || 'Failed to load alert rules');
        this.rulesLoading.set(false);
      },
    });
  }

  createRule(rule: AlertRuleCreate, onSuccess?: () => void): void {
    this.rulesLoading.set(true);
    this.alertsService.createRule(rule).subscribe({
      next: () => {
        this.loadRules();
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.rulesError.set(err?.message || 'Failed to create rule');
        this.rulesLoading.set(false);
      },
    });
  }

  updateRule(id: number, rule: AlertRuleUpdate, onSuccess?: () => void): void {
    this.rulesLoading.set(true);
    this.alertsService.updateRule(id, rule).subscribe({
      next: () => {
        this.loadRules();
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.rulesError.set(err?.message || 'Failed to update rule');
        this.rulesLoading.set(false);
      },
    });
  }

  toggleRule(rule: AlertRule): void {
    const updated = !rule.enabled;
    this.alertsService.updateRule(rule.id, { enabled: updated }).subscribe({
      next: (res) => {
        this.rules.update((prev) =>
          prev.map((r) => (r.id === rule.id ? { ...r, enabled: updated } : r))
        );
      },
      error: (err) => {
        this.rulesError.set(err?.message || 'Failed to toggle rule state');
      },
    });
  }

  deleteRule(id: number): void {
    this.alertsService.deleteRule(id).subscribe({
      next: () => {
        this.rules.update((prev) => prev.filter((r) => r.id !== id));
        this.rulesTotal.update((prev) => Math.max(0, prev - 1));
      },
      error: (err) => {
        this.rulesError.set(err?.message || 'Failed to delete rule');
      },
    });
  }

  setStatusFilter(status: string | null): void {
    this.eventsStatusFilter.set(status);
    this.loadEvents();
  }

  setSeverityFilter(severity: string | null): void {
    this.eventsSeverityFilter.set(severity);
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventsLoading.set(true);
    this.eventsError.set(null);
    const status = this.eventsStatusFilter() || undefined;
    const severity = this.eventsSeverityFilter() || undefined;

    this.alertsService.getEvents(status, severity).subscribe({
      next: (res) => {
        this.events.set(res.events);
        this.eventsTotal.set(res.total);
        this.eventsLoading.set(false);
      },
      error: (err) => {
        this.eventsError.set(err?.message || 'Failed to load alert events');
        this.eventsLoading.set(false);
      },
    });
  }

  acknowledgeEvent(id: number): void {
    this.alertsService.acknowledgeEvent(id).subscribe({
      next: (updatedEvent) => {
        this.events.update((prev) =>
          prev.map((e) => (e.id === id ? updatedEvent : e))
        );
        this.refreshActiveCount();
      },
      error: (err) => {
        this.eventsError.set(err?.message || 'Failed to acknowledge alert');
      },
    });
  }

  createSilence(silence: AlertSilenceCreate, onSuccess?: () => void): void {
    this.alertsService.createSilence(silence).subscribe({
      next: () => {
        this.loadEvents();
        this.refreshActiveCount();
        if (onSuccess) onSuccess();
      },
      error: (err) => {
        this.eventsError.set(err?.message || 'Failed to create silence');
      },
    });
  }

  refreshActiveCount(): void {
    this.alertsService.getActiveCount().subscribe({
      next: (res) => {
        this.activeCount.set(res.active_count);
      },
      error: () => {},
    });
  }
}
