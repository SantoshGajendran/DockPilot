import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ComposeActionResponse, ComposeProject } from '../../core/models/compose.model';
import { ComposeService } from '../../core/services/compose.service';

@Injectable()
export class ComposeStore {
  private readonly composeService = inject(ComposeService);

  readonly projects = signal<ComposeProject[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);
  readonly expandedProjects = signal<Set<string>>(new Set());

  loadProjects(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.composeService.getProjects().subscribe({
      next: (resp) => {
        this.projects.set(resp.projects);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message || 'Failed to load compose projects');
        this.isLoading.set(false);
      },
    });
  }

  toggleExpand(projectName: string): void {
    this.expandedProjects.update((prev) => {
      const next = new Set(prev);
      if (next.has(projectName)) {
        next.delete(projectName);
      } else {
        next.add(projectName);
      }
      return next;
    });
  }

  isExpanded(projectName: string): boolean {
    return this.expandedProjects().has(projectName);
  }

  executeAction(projectName: string, action: string): Observable<ComposeActionResponse> {
    return this.composeService.executeAction(projectName, action).pipe(
      tap(() => {
        // reload projects after triggering action
        this.loadProjects();
      })
    );
  }

  downProject(projectName: string): Observable<ComposeActionResponse> {
    const obs = this.executeAction(projectName, 'down');
    obs.subscribe({
      error: (err) => {
        this.error.set(err?.message || 'Failed to tear down compose project');
      },
    });
    return obs;
  }
}
