import { Injectable } from '@nestjs/common';
import { IWebhookValidator } from './webhook-validator.interface';

@Injectable()
export class HotmartWebhookValidator implements IWebhookValidator {
    validate(signature: string, payload: string, secret: string): boolean {
        try {
            const parsedPayload = JSON.parse(payload);

            if (!parsedPayload.hottok) {
                return false;
            }

            return parsedPayload.hottok === secret;
        } catch (error) {
            return false;
        }
    }

    extractEventData(payload: any): {
        eventType: string;
        externalEventId: string;
        data: any;
        timestamp?: string;
    } {
        return {
            eventType: payload.event || 'UNKNOWN',
            externalEventId: payload.id || payload.data?.purchase?.transaction || `hotmart_${Date.now()}`,
            data: payload.data || payload,
            timestamp: payload.creation_date || new Date().toISOString(),
        };
    }
}
