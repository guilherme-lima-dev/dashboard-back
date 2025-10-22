import { Injectable } from '@nestjs/common';
import { IWebhookValidator } from './webhook-validator.interface';
import * as crypto from 'crypto';

@Injectable()
export class CartpandaWebhookValidator implements IWebhookValidator {
    validate(signature: string, payload: string, secret: string): boolean {
        try {
            if (!signature) {
                return false;
            }

            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
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
            eventType: payload.event || 'order.paid',
            externalEventId: payload.order?.id || `cartpanda_${Date.now()}`,
            data: payload,
            timestamp: payload.created_at || new Date().toISOString(),
        };
    }
}
