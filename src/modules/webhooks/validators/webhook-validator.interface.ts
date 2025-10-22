export interface IWebhookValidator {
    validate(signature: string, payload: string, secret: string): boolean;

    extractEventData(payload: any): {
        eventType: string;
        externalEventId: string;
        data: any;
        timestamp?: string;
    };
}
