import { Injectable } from '@nestjs/common';
import { IWebhookValidator } from './webhook-validator.interface';
import * as crypto from 'crypto';

@Injectable()
export class StripeWebhookValidator implements IWebhookValidator {
    validate(signature: string, payload: string, secret: string): boolean {
        try {
            const elements = signature.split(',');
            const timestamps: string[] = [];
            const signatures: string[] = [];

            elements.forEach((element) => {
                const [key, value] = element.split('=');
                if (key === 't') {
                    timestamps.push(value);
                } else if (key === 'v1') {
                    signatures.push(value);
                }
            });

            if (timestamps.length === 0 || signatures.length === 0) {
                return false;
            }

            const timestamp = timestamps[0];
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(`${timestamp}.${payload}`)
                .digest('hex');

            return signatures.some((sig) =>
                crypto.timingSafeEqual(
                    Buffer.from(sig),
                    Buffer.from(expectedSignature)
                )
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
            eventType: payload.type,
            externalEventId: payload.id,
            data: payload.data,
            timestamp: payload.created ? new Date(payload.created * 1000).toISOString() : undefined,
        };
    }
}
