import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';

import { LogsStore } from './logs.store';
import { LogViewerComponent } from '../../shared/components/log-viewer/log-viewer.component';
import { GlassPanelComponent } from '../../shared/components/glass-panel/glass-panel.component';
import { IconComponent } from '../../shared/components/icon/icon.component';

@Component({
  selector: 'dp-logs-explorer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    LogViewerComponent,
    GlassPanelComponent,
    IconComponent,
  ],
  providers: [LogsStore],
  templateUrl: './logs-explorer.component.html',
  styleUrls: ['./logs-explorer.component.scss'],
})
export class LogsExplorerComponent implements OnInit {
  readonly store = inject(LogsStore);

  ngOnInit(): void {
    this.store.loadContainers();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.store.setSearchQuery(input.value);
  }
}
