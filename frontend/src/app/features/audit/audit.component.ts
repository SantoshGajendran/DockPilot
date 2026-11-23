import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';

import { AuditStore } from './audit.store';
import { AuditLog } from '../../core/models/audit.model';
import {
  AUDIT_ACTION_OPTIONS,
  AUDIT_TARGET_TYPE_OPTIONS,
  AUDIT_DATE_PRESET_OPTIONS,
  getAuditResultMeta,
  AuditResultMeta,
} from '../../core/constants/audit.constants';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'dp-audit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTableModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatChipsModule,
  ],
  providers: [AuditStore],
  templateUrl: './audit.component.html',
  styleUrls: ['./audit.component.scss'],
})
export class AuditComponent implements OnInit {
  readonly store = inject(AuditStore);
  private readonly toast = inject(ToastService);

  readonly actionOptions = AUDIT_ACTION_OPTIONS;
  readonly targetTypeOptions = AUDIT_TARGET_TYPE_OPTIONS;
  readonly datePresetOptions = AUDIT_DATE_PRESET_OPTIONS;

  readonly displayedColumns: string[] = [
    'timestamp',
    'username',
    'action',
    'target',
    'result',
    'ip_address',
    'actions',
  ];

  filterUser = '';
  filterAction = '';
  filterTargetType = '';
  filterTargetId = '';
  filterResult = '';
  selectedDatePreset = 'all';

  ngOnInit(): void {
    this.store.init();
  }

  applyFilters(): void {
    this.store.setFilter({
      user: this.filterUser.trim() || undefined,
      action: this.filterAction || undefined,
      target_type: this.filterTargetType || undefined,
      target_id: this.filterTargetId.trim() || undefined,
      result: this.filterResult || undefined,
    });
  }

  onDatePresetChange(preset: string): void {
    this.selectedDatePreset = preset;
    const opt = this.datePresetOptions.find((o) => o.value === preset);
    this.store.setDatePreset(preset, opt?.hours);
  }

  resetFilters(): void {
    this.filterUser = '';
    this.filterAction = '';
    this.filterTargetType = '';
    this.filterTargetId = '';
    this.filterResult = '';
    this.selectedDatePreset = 'all';
    this.store.setDatePreset('all');
  }

  onPageChange(event: PageEvent): void {
    if (event.pageSize !== this.store.pageSize()) {
      this.store.setPageSize(event.pageSize);
    } else {
      this.store.setPage(event.pageIndex + 1);
    }
  }

  getResultMeta(result: string): AuditResultMeta {
    return getAuditResultMeta(result);
  }

  formatTimestamp(isoString: string, relative: boolean): string {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      if (!relative) {
        return d.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      }
      const now = Date.now();
      const diffMs = now - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return `${Math.max(0, diffSec)}s ago`;
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return isoString;
    }
  }

  formatPayload(payload: any): string {
    if (!payload) return 'No payload';
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  }

  copyPayload(payload: any): void {
    const text = this.formatPayload(payload);
    navigator.clipboard?.writeText(text).then(() => {
      this.toast.show('Payload copied to clipboard');
    });
  }

  openDrawer(item: AuditLog): void {
    this.store.selectItem(item);
  }

  closeDrawer(): void {
    this.store.selectItem(null);
  }
}
