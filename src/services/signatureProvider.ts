import crypto from 'crypto';
import { z } from 'zod';
import env from '@/config/env';
import logger from '@/lib/logger';

export type SignatureStatus = 'PENDING' | 'SENT' | 'SIGNED' | 'REJECTED';

export interface SignatureEnvelope {
  envelopeId: string;
  documentId?: string | null;
  signingUrl?: string | null;
  status: SignatureStatus;
  sentAt?: Date | null;
  completedAt?: Date | null;
  declinedAt?: Date | null;
}

interface CreateEnvelopeInput {
  title: string;
  documentTemplateId: string;
  signer: {
    name: string;
    email: string;
  };
  callbackUrl: string;
  redirectUrl?: string;
  projectId?: number;
}

const envelopeResponseSchema = z.object({
  envelopeId: z.string().optional(),
  id: z.string().optional(),
  documentId: z.string().optional(),
  signingUrl: z.string().url().optional(),
  signingUrls: z
    .array(
      z.object({
        url: z.string().url(),
      })
    )
    .optional(),
  links: z
    .array(
      z.object({
        rel: z.string(),
        href: z.string().url(),
      })
    )
    .optional(),
  status: z.string(),
  sentAt: z.string().optional(),
  completedAt: z.string().optional(),
  declinedAt: z.string().optional(),
  timestamps: z
    .object({
      sentAt: z.string().optional(),
      completedAt: z.string().optional(),
      declinedAt: z.string().optional(),
    })
    .partial()
    .optional(),
});

type EnvelopeResponse = z.infer<typeof envelopeResponseSchema>;

const webhookEventSchema = envelopeResponseSchema.extend({
  envelopeId: z.string().optional(),
  status: z.string(),
});

class SignatureProvider {
  private readonly fetchImpl: typeof fetch;

  constructor(fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis)) {
    if (!fetchImpl) {
      throw new Error('Fetch implementation is required');
    }
    this.fetchImpl = fetchImpl;
  }

  private ensureConfigured(): void {
    if (!env.SIGNATURE_API_BASE_URL || !env.SIGNATURE_ACCOUNT_ID || !env.SIGNATURE_API_TOKEN) {
      throw new Error('Signature provider is not properly configured');
    }
  }

  private buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${env.SIGNATURE_API_TOKEN}`,
      'Content-Type': 'application/json',
    };
  }

  private normalizeStatus(status: string): SignatureStatus {
    const normalized = status.toLowerCase();
    if (['created', 'pending', 'draft'].includes(normalized)) {
      return 'PENDING';
    }
    if (['sent', 'delivered', 'in_process', 'in-progress'].includes(normalized)) {
      return 'SENT';
    }
    if (['completed', 'signed', 'finished', 'completed_successfully'].includes(normalized)) {
      return 'SIGNED';
    }
    if (['declined', 'rejected', 'voided', 'terminated', 'cancelled', 'canceled'].includes(normalized)) {
      return 'REJECTED';
    }
    return 'PENDING';
  }

  private resolveSigningUrl(payload: EnvelopeResponse): string | undefined {
    if (payload.signingUrl) {
      return payload.signingUrl;
    }
    const fromList = payload.signingUrls?.[0]?.url;
    if (fromList) {
      return fromList;
    }
    const fromLinks = payload.links?.find((link) => link.rel.toLowerCase() === 'signing_url');
    return fromLinks?.href;
  }

  private mapResponse(payload: EnvelopeResponse): SignatureEnvelope {
    const envelopeId = payload.envelopeId ?? payload.id;
    if (!envelopeId) {
      throw new Error('Signature provider response missing envelope identifier');
    }
    const timestamps = payload.timestamps ?? {};
    const sentAt = payload.sentAt ?? timestamps.sentAt;
    const completedAt = payload.completedAt ?? timestamps.completedAt;
    const declinedAt = payload.declinedAt ?? timestamps.declinedAt;

    return {
      envelopeId,
      documentId: payload.documentId ?? null,
      signingUrl: this.resolveSigningUrl(payload) ?? null,
      status: this.normalizeStatus(payload.status),
      sentAt: sentAt ? new Date(sentAt) : null,
      completedAt: completedAt ? new Date(completedAt) : null,
      declinedAt: declinedAt ? new Date(declinedAt) : null,
    };
  }

  async createEnvelope(input: CreateEnvelopeInput): Promise<SignatureEnvelope> {
    this.ensureConfigured();
    const baseUrl = env.SIGNATURE_API_BASE_URL.replace(/\/$/, '');
    const response = await this.fetchImpl(
      `${baseUrl}/accounts/${encodeURIComponent(env.SIGNATURE_ACCOUNT_ID)}/envelopes`,
      {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify({
          title: input.title,
          templateId: input.documentTemplateId,
          signer: input.signer,
          callbackUrl: input.callbackUrl,
          redirectUrl: input.redirectUrl,
          metadata: {
            projectId: input.projectId,
          },
        }),
      }
    );

    if (!response.ok) {
      const message = `Failed to create signature envelope: ${response.status}`;
      logger.error({ status: response.status }, message);
      throw new Error(message);
    }

    const payload = envelopeResponseSchema.parse(await response.json());
    return this.mapResponse(payload);
  }

  async getEnvelopeStatus(envelopeId: string): Promise<SignatureEnvelope> {
    this.ensureConfigured();
    const baseUrl = env.SIGNATURE_API_BASE_URL.replace(/\/$/, '');
    const response = await this.fetchImpl(
      `${baseUrl}/accounts/${encodeURIComponent(env.SIGNATURE_ACCOUNT_ID)}/envelopes/${encodeURIComponent(envelopeId)}`,
      {
        method: 'GET',
        headers: this.buildHeaders(),
      }
    );

    if (!response.ok) {
      const message = `Failed to fetch signature envelope: ${response.status}`;
      logger.error({ status: response.status, envelopeId }, message);
      throw new Error(message);
    }

    const payload = envelopeResponseSchema.parse(await response.json());
    return this.mapResponse({ ...payload, envelopeId });
  }

  validateWebhook(headers: Record<string, unknown>, payload: unknown): boolean {
    const secret = env.SIGNATURE_WEBHOOK_SECRET;
    if (!secret) {
      return false;
    }

    const secretHeader = headers['x-signature-secret'] ?? headers['x-webhook-secret'];
    if (typeof secretHeader === 'string' && secretHeader === secret) {
      return true;
    }
    if (Array.isArray(secretHeader) && secretHeader.includes(secret)) {
      return true;
    }

    const signatureHeader =
      headers['x-signature-hmac'] ?? headers['x-docusign-signature-01'] ?? headers['x-adobesign-signature-01'];
    if (!signatureHeader) {
      return false;
    }

    const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload ?? {});
    const expected = crypto.createHmac('sha256', secret).update(rawPayload).digest('hex');
    if (typeof signatureHeader === 'string') {
      return signatureHeader === expected;
    }
    if (Array.isArray(signatureHeader)) {
      return signatureHeader.includes(expected);
    }
    return false;
  }

  parseWebhookEvent(payload: unknown): SignatureEnvelope {
    const parsed = webhookEventSchema.parse(payload);
    return this.mapResponse(parsed);
  }
}

const signatureProvider = new SignatureProvider();

export { SignatureProvider };
export default signatureProvider;
