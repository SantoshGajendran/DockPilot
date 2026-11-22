import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { EventsStore } from './events.store';
import { EventsTimelineComponent } from './components/events-timeline.component';
import { EVENT_ACTION_FILTER_OPTIONS } from '../../core/constants/events.constants';

@Component({
  selector: 'dp-events',
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
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    EventsTimelineComponent,
  ],
  providers: [EventsStore],
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss'],
})
export class EventsComponent implements OnInit, OnDestroy {
  readonly store = inject(EventsStore);
  readonly actionOptions = EVENT_ACTION_FILTER_OPTIONS;

  filterContainerName = '';
  filterAction = '';
  filterIncidentsOnly = false;

  ngOnInit(): void {
    this.store.init();
  }

  ngOnDestroy(): void {
    this.store.destroy();
  }

  applyFilters(): void {
    this.store.setFilter({
      container_name: this.filterContainerName || undefined,
      action: this.filterAction || undefined,
      incidents_only: this.filterIncidentsOnly ? true : undefined,
    });
  }

  clearFilters(): void {
    this.filterContainerName = '';
    this.filterAction = '';
    this.filterIncidentsOnly = false;
    this.store.setFilter({
      container_name: undefined,
      action: undefined,
      incidents_only: undefined,
    });
  }
}
