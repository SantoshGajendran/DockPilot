import { Injectable, inject, signal } from '@angular/core';
import { AuditFilterParams, AuditLog } from '../../core/models/audit.model';
import { AuditService } from '../../core/services/audit.service';
import { ToastService } from '../../core/services/toast.service';

@Injectable()
export class AuditStore {
  private readonly auditService = inject(AuditService);
  private readonly toast = inject(ToastService);

  readonly items = signal<AuditLog[]>([]);
  readonly total = signal<number>(0);
  readonly page = signal<number>(1);
  readonly pageSize = signal<number>(50);
  readonly totalPages = signal<number>(1);
  readonly isLoading = signal<boolean>(false);
  readonly isExporting = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly selectedItem = signal<AuditLog | null>(null);
  readonly relativeTime = signal<boolean>(true);
  readonly datePreset = signal<string>('all');
  readonly filters = signal<AuditFilterParams>({
    page: 1,
    page_size: 50,
    sort_order: 'desc',
  });

  init(): void {
    this.loadAuditLogs();
  }

  setFilter(update: Partial<AuditFilterParams>): void {
    this.filters.update((prev) => ({
      ...prev,
      ...update,
      page: 1,
    }));
    this.loadAuditLogs();
  }

  setDatePreset(preset: string, hours?: number): void {
    this.datePreset.set(preset);
    let since: string | undefined = undefined;
    if (hours) {
      const d = new Date(Date.now() - hours * 60 * 60 * 1000);
      since = d.toISOString();
    }
    this.setFilter({ since, until: undefined });
  }

  setPage(page: number): void {
    this.filters.update((prev) => ({ ...prev, page }));
    this.loadAuditLogs();
  }

  setPageSize(pageSize: number): void {
    this.filters.update((prev) => ({ ...prev, page_size: pageSize, page: 1 }));
    this.loadAuditLogs();
  }

  selectItem(item: AuditLog | null): void {
    this.selectedItem.set(item);
  }

  toggleTimeFormat(): void {
    this.relativeTime.update((v) => !v);
  }

  loadAuditLogs(): void {
    this.isLoading.set(true);
    this.error.set(null);

    const f = this.filters();
    this.auditService.listAuditLogs(f).subscribe({
      next: (resp) => {
        this.items.set(resp.items);
        this.total.set(resp.total);
        this.page.set(resp.page);
        this.pageSize.set(resp.page_size);
        this.totalPages.set(resp.total_pages);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.detail || err?.message || 'Failed to load audit logs');
        this.isLoading.set(false);
      },
    });
  }

  exportCsv(): void {
    if (this.isExporting()) return;
    this.isExporting.set(true);

    const f = this.filters();
    this.auditService.exportAuditCsv(f).subscribe({
      next: (blob) => {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `dockpilot_audit_${timestamp}.csv`;
        this.auditService.downloadBlob(blob, filename);
        this.isExporting.set(false);
        this.toast.show('Audit logs exported successfully');
      },
      error: (err) => {
        this.isExporting.set(false);
        this.toast.show(err?.error?.detail || err?.message || 'Failed to export CSV');
      },
    });
  }
}
