import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  ActiveAlertsCountResponse,
  AlertDryRunRequest,
  AlertDryRunResponse,
  AlertEvent,
  AlertEventsListResponse,
  AlertRule,
  AlertRuleCreate,
  AlertRuleUpdate,
  AlertRulesListResponse,
  AlertSilenceCreate,
  AlertSilenceResponse,
} from '../models/alerts.model';
import { ALERTS_ENDPOINTS } from '../constants/alerts.constants';

@Injectable({ providedIn: 'root' })
export class AlertsService {
  private readonly http = inject(HttpClient);

  getRules(enabledOnly: boolean = false): Observable<AlertRulesListResponse> {
    let params = new HttpParams();
    if (enabledOnly) {
      params = params.set('enabled_only', 'true');
    }
    return this.http.get<AlertRulesListResponse>(ALERTS_ENDPOINTS.rules, { params });
  }

  getRule(id: number): Observable<AlertRule> {
    return this.http.get<AlertRule>(`${ALERTS_ENDPOINTS.rules}/${id}`);
  }

  createRule(rule: AlertRuleCreate): Observable<AlertRule> {
    return this.http.post<AlertRule>(ALERTS_ENDPOINTS.rules, rule);
  }

  updateRule(id: number, rule: AlertRuleUpdate): Observable<AlertRule> {
    return this.http.put<AlertRule>(`${ALERTS_ENDPOINTS.rules}/${id}`, rule);
  }

  deleteRule(id: number): Observable<void> {
    return this.http.delete<void>(`${ALERTS_ENDPOINTS.rules}/${id}`);
  }

  dryRunRule(req: AlertDryRunRequest): Observable<AlertDryRunResponse> {
    return this.http.post<AlertDryRunResponse>(ALERTS_ENDPOINTS.rulesTest, req);
  }

  dryRunRuleById(id: number): Observable<AlertDryRunResponse> {
    return this.http.post<AlertDryRunResponse>(`${ALERTS_ENDPOINTS.rules}/${id}/test`, {});
  }

  getEvents(
    status?: string,
    severity?: string,
    ruleId?: number,
    limit: number = 50,
    offset: number = 0
  ): Observable<AlertEventsListResponse> {
    let params = new HttpParams().set('limit', String(limit)).set('offset', String(offset));
    if (status) params = params.set('status', status);
    if (severity) params = params.set('severity', severity);
    if (ruleId !== undefined && ruleId !== null) params = params.set('rule_id', String(ruleId));

    return this.http.get<AlertEventsListResponse>(ALERTS_ENDPOINTS.events, { params });
  }

  acknowledgeEvent(id: number): Observable<AlertEvent> {
    return this.http.post<AlertEvent>(`${ALERTS_ENDPOINTS.events}/${id}/ack`, { acknowledged: true });
  }

  createSilence(silence: AlertSilenceCreate): Observable<AlertSilenceResponse> {
    return this.http.post<AlertSilenceResponse>(ALERTS_ENDPOINTS.silence, silence);
  }

  getActiveCount(): Observable<ActiveAlertsCountResponse> {
    return this.http.get<ActiveAlertsCountResponse>(ALERTS_ENDPOINTS.activeCount);
  }
}
