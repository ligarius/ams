import { Router } from 'express';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';
import signatureProvider from '@/services/signatureProvider';

const router = Router();

router.post('/webhook', async (req, res) => {
  const isValid = signatureProvider.validateWebhook(req.headers as Record<string, unknown>, req.body);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid signature' });
  }

  try {
    const event = signatureProvider.parseWebhookEvent(req.body);
    const approval = await prisma.approval.findUnique({ where: { signatureEnvelopeId: event.envelopeId } });
    if (!approval) {
      logger.warn({ envelopeId: event.envelopeId }, 'Signature webhook received for unknown approval');
      return res.status(202).json({ message: 'Approval not found' });
    }

    await prisma.approval.update({
      where: { id: approval.id },
      data: {
        signatureEnvelopeId: event.envelopeId,
        signatureDocumentId: event.documentId ?? approval.signatureDocumentId,
        signatureUrl: event.signingUrl ?? approval.signatureUrl,
        signatureStatus: event.status,
        signatureSentAt: event.sentAt ?? approval.signatureSentAt,
        signatureCompletedAt: event.completedAt ?? approval.signatureCompletedAt,
        signatureDeclinedAt: event.declinedAt ?? approval.signatureDeclinedAt,
      },
    });

    return res.status(200).json({ message: 'Acknowledged' });
  } catch (error) {
    logger.error({ err: error }, 'Failed to process signature webhook');
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(400).json({ message: 'Invalid payload' });
  }
});

export default router;
