import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';

import {
  ChannelType,
  NotificationChannel,
  NotificationChannelCreate,
} from '../../../core/models/notifications.model';
import { CHANNEL_TYPES, ChannelTypeMeta } from '../../../core/constants/notifications.constants';

export interface ChannelDialogData {
  channel?: NotificationChannel;
}

@Component({
  selector: 'dp-channel-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatIconModule,
    MatChipsModule,
  ],
  templateUrl: './channel-dialog.component.html',
  styleUrls: ['./channel-dialog.component.scss'],
})
export class ChannelDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ChannelDialogComponent>);
  readonly data: ChannelDialogData = inject(MAT_DIALOG_DATA, { optional: true }) || {};
  private readonly fb = inject(FormBuilder);

  readonly channelTypes = CHANNEL_TYPES;
  readonly isEdit = !!this.data.channel;

  form!: FormGroup;

  ngOnInit(): void {
    const c = this.data.channel;
    const cfg = c?.config || {};

    this.form = this.fb.group({
      name: [c?.name || '', [Validators.required, Validators.maxLength(128)]],
      channel_type: [c?.channel_type || 'slack', [Validators.required]],
      enabled: [c?.enabled ?? true],
      secret: [''],

      // Slack fields
      slack_url: [cfg['webhook_url'] || ''],

      // Telegram fields
      chat_id: [cfg['chat_id'] || ''],

      // Email fields
      smtp_host: [cfg['smtp_host'] || 'localhost'],
      smtp_port: [cfg['smtp_port'] || 587],
      use_tls: [cfg['use_tls'] ?? true],
      from_address: [cfg['from_address'] || 'alerts@dockpilot.io'],
      to_addresses: [
        Array.isArray(cfg['to_addresses'])
          ? cfg['to_addresses'].join(', ')
          : cfg['to_addresses'] || '',
      ],
      username: [cfg['username'] || ''],

      // Generic Webhook fields
      webhook_url: [cfg['url'] || ''],
    });

    this.updateValidators(this.form.get('channel_type')?.value);

    this.form.get('channel_type')?.valueChanges.subscribe((type) => {
      this.updateValidators(type);
    });
  }

  getCurrentMeta(): ChannelTypeMeta | undefined {
    const type = this.form.get('channel_type')?.value;
    return this.channelTypes.find((t) => t.type === type);
  }

  private updateValidators(type: ChannelType): void {
    const slackCtrl = this.form.get('slack_url');
    const chatCtrl = this.form.get('chat_id');
    const hostCtrl = this.form.get('smtp_host');
    const toCtrl = this.form.get('to_addresses');
    const webhookUrlCtrl = this.form.get('webhook_url');

    slackCtrl?.clearValidators();
    chatCtrl?.clearValidators();
    hostCtrl?.clearValidators();
    toCtrl?.clearValidators();
    webhookUrlCtrl?.clearValidators();

    if (type === 'slack') {
      if (!this.isEdit) {
        slackCtrl?.setValidators([Validators.required]);
      }
    } else if (type === 'telegram') {
      chatCtrl?.setValidators([Validators.required]);
    } else if (type === 'email') {
      hostCtrl?.setValidators([Validators.required]);
      toCtrl?.setValidators([Validators.required]);
    } else if (type === 'webhook') {
      webhookUrlCtrl?.setValidators([Validators.required]);
    }

    slackCtrl?.updateValueAndValidity();
    chatCtrl?.updateValueAndValidity();
    hostCtrl?.updateValueAndValidity();
    toCtrl?.updateValueAndValidity();
    webhookUrlCtrl?.updateValueAndValidity();
  }

  onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const val = this.form.value;
    const type: ChannelType = val.channel_type;
    const config: Record<string, any> = {};
    let secret = val.secret ? val.secret.trim() : null;

    if (type === 'slack') {
      if (val.slack_url) {
        secret = val.slack_url.trim();
      }
    } else if (type === 'telegram') {
      config['chat_id'] = val.chat_id.trim();
    } else if (type === 'email') {
      config['smtp_host'] = val.smtp_host.trim();
      config['smtp_port'] = Number(val.smtp_port);
      config['use_tls'] = Boolean(val.use_tls);
      config['from_address'] = val.from_address.trim();
      config['to_addresses'] = val.to_addresses
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
      if (val.username) {
        config['username'] = val.username.trim();
      }
    } else if (type === 'webhook') {
      config['url'] = val.webhook_url.trim();
    }

    const payload: NotificationChannelCreate = {
      name: val.name.trim(),
      channel_type: type,
      enabled: val.enabled,
      config: config,
      secret: secret || undefined,
    };

    this.dialogRef.close(payload);
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}
