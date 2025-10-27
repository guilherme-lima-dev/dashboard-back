import { Injectable } from '@nestjs/common';
import { IWebhookValidator } from './webhook-validator.interface';
import * as crypto from 'crypto';

@Injectable()
export class StripeWebhookValidator implements IWebhookValidator {
    validate(signature: string, payload: string | Buffer, secret: string): boolean {
        try {
            const elements = signature.split(',');
            const timestamp = elements.find(el => el.startsWith('t='))?.split('=')[1];
            const v1Signature = elements.find(el => el.startsWith('v1='))?.split('=')[1];

            if (!timestamp || !v1Signature) {
                return false;
            }

            // Verificar se o timestamp não é muito antigo (tolerância de 5 minutos)
            const currentTime = Math.floor(Date.now() / 1000);
            const eventTime = parseInt(timestamp);
            const tolerance = 300; // 5 minutos em segundos

            if (currentTime - eventTime > tolerance) {
                console.warn('Webhook timestamp too old, rejecting');
                return false;
            }

            // Converter payload para string se for Buffer
            const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;
            
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(`${timestamp}.${payloadString}`)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(v1Signature, 'hex'),
                Buffer.from(expectedSignature, 'hex')
            );
        } catch (error) {
            console.error('Error validating webhook signature:', error);
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
