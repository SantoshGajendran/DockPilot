import { HttpContextToken } from '@angular/common/http';

export const IS_RETRY_ATTEMPT = new HttpContextToken<boolean>(() => false);
export const IS_SILENT_REFRESH = new HttpContextToken<boolean>(() => false);
