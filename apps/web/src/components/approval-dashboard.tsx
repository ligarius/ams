'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import LaunchIcon from '@mui/icons-material/Launch';
import ThumbDownAltOutlinedIcon from '@mui/icons-material/ThumbDownAltOutlined';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import type { ApprovalStatus, SignatureStatus } from '@backend/lib/prisma';
import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

const approvalStatusLabels: Record<ApprovalStatus, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  PENDING: { label: 'Pendiente', color: 'warning' },
  APPROVED: { label: 'Aprobada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
};

const signatureStatusLabels: Record<SignatureStatus, { label: string; color: 'default' | 'success' | 'error' | 'warning' }> = {
  PENDING: { label: 'Borrador', color: 'default' },
  SENT: { label: 'En firma', color: 'warning' },
  SIGNED: { label: 'Firmada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
};

const dateFormatter = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export interface ApprovalRecord {
  id: number;
  projectId: number;
  projectName: string;
  title: string;
  description: string | null;
  status: ApprovalStatus;
  createdAt: string;
  decidedAt: string | null;
  signatureUrl: string | null;
  signatureStatus: SignatureStatus;
  signatureSentAt: string | null;
  signatureCompletedAt: string | null;
  signatureDeclinedAt: string | null;
}

interface ApprovalDashboardProps {
  pending: ApprovalRecord[];
  recent: ApprovalRecord[];
  canMutate: boolean;
  pendingCount: number;
}

const formatDate = (value: string | null) => {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return dateFormatter.format(parsed);
};

const resolveSignatureTooltip = (approval: ApprovalRecord): string | null => {
  if (approval.signatureStatus === 'SIGNED' && approval.signatureCompletedAt) {
    return `Firmada el ${formatDate(approval.signatureCompletedAt)}`;
  }
  if (approval.signatureStatus === 'SENT' && approval.signatureSentAt) {
    return `Enviada el ${formatDate(approval.signatureSentAt)}`;
  }
  if (approval.signatureStatus === 'REJECTED' && approval.signatureDeclinedAt) {
    return `Rechazada el ${formatDate(approval.signatureDeclinedAt)}`;
  }
  return null;
};

export function ApprovalDashboard({ pending, recent, canMutate, pendingCount }: ApprovalDashboardProps) {
  const router = useRouter();
  const [actionState, setActionState] = useState<Record<number, 'APPROVING' | 'REJECTING' | undefined>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const summaryText = useMemo(() => {
    if (pendingCount === 0) {
      return 'No tienes aprobaciones pendientes. ¡Excelente trabajo!';
    }
    if (pendingCount === 1) {
      return 'Tienes 1 aprobación a la espera de revisión.';
    }
    return `Tienes ${pendingCount} aprobaciones pendientes de resolución.`;
  }, [pendingCount]);

  const handleTransition = async (approval: ApprovalRecord, status: ApprovalStatus) => {
    if (!canMutate) {
      return;
    }
    setFeedback(null);
    const currentState = status === 'APPROVED' ? 'APPROVING' : 'REJECTING';
    setActionState((state) => ({ ...state, [approval.id]: currentState }));
    try {
      const response = await fetch(`/api/projects/${approval.projectId}/approvals/${approval.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        setFeedback({ type: 'error', message: errorBody?.message ?? 'No fue posible actualizar la aprobación.' });
        return;
      }
      setFeedback({
        type: 'success',
        message: status === 'APPROVED' ? 'Aprobación marcada como aprobada.' : 'Aprobación rechazada correctamente.',
      });
      router.refresh();
    } catch (error) {
      console.error('Failed to transition approval', error);
      setFeedback({ type: 'error', message: 'Ocurrió un error inesperado.' });
    } finally {
      setActionState((state) => ({ ...state, [approval.id]: undefined }));
    }
  };

  return (
    <Stack spacing={3} flex={1} component={Paper} variant="outlined" sx={{ p: { xs: 3, md: 4 }, borderRadius: 4 }}>
      <Stack spacing={1}>
        <Typography variant="h6">Seguimiento de aprobaciones</Typography>
        <Typography variant="body2" color="text.secondary">
          {summaryText}
        </Typography>
      </Stack>

      {feedback && (
        <Alert
          severity={feedback.type}
          onClose={() => setFeedback(null)}
          data-testid={`approval-feedback-${feedback.type}`}
        >
          {feedback.message}
        </Alert>
      )}

      <Stack spacing={2} data-testid="pending-approvals">
        <Typography variant="subtitle1">Pendientes</Typography>
        {pending.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, borderStyle: 'dashed' }}>
            <Typography variant="body2" color="text.secondary">
              No hay aprobaciones pendientes. Cuando registres nuevas solicitudes aparecerán aquí para su revisión.
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Proyecto</TableCell>
                  <TableCell>Detalle</TableCell>
                  <TableCell>Firma</TableCell>
                  <TableCell align="right">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pending.map((approval) => {
                  const statusConfig = approvalStatusLabels[approval.status];
                  const signatureConfig = signatureStatusLabels[approval.signatureStatus];
                  const signatureTooltip = resolveSignatureTooltip(approval);
                  const state = actionState[approval.id];
                  return (
                    <TableRow key={approval.id} hover>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="body2" fontWeight={600}>
                            {approval.projectName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Registrada el {formatDate(approval.createdAt)}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2">{approval.title}</Typography>
                          {approval.description && (
                            <Typography variant="caption" color="text.secondary">
                              {approval.description}
                            </Typography>
                          )}
                          <Stack direction="row" spacing={1}>
                            <Chip size="small" label={statusConfig.label} color={statusConfig.color} variant="filled" />
                            <Chip
                              size="small"
                              label={signatureConfig.label}
                              color={signatureConfig.color}
                              variant="outlined"
                              title={signatureTooltip ?? undefined}
                            />
                          </Stack>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        {approval.signatureUrl ? (
                          <Button
                            size="small"
                            variant="text"
                            endIcon={<LaunchIcon fontSize="small" />}
                            href={approval.signatureUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Ver firma
                          </Button>
                        ) : (
                          <Typography variant="caption" color="text.secondary">
                            Sin enlace disponible
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<ThumbUpAltOutlinedIcon fontSize="small" />}
                            disabled={!canMutate || state !== undefined}
                            onClick={() => handleTransition(approval, 'APPROVED')}
                          >
                            {state === 'APPROVING' ? 'Aprobando…' : 'Aprobar'}
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<ThumbDownAltOutlinedIcon fontSize="small" />}
                            disabled={!canMutate || state !== undefined}
                            onClick={() => handleTransition(approval, 'REJECTED')}
                          >
                            {state === 'REJECTING' ? 'Rechazando…' : 'Rechazar'}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>

      <Stack spacing={2} data-testid="recent-approvals">
        <Typography variant="subtitle1">Historial reciente</Typography>
        {recent.length === 0 ? (
          <Paper variant="outlined" sx={{ p: 3, borderStyle: 'dashed' }}>
            <Typography variant="body2" color="text.secondary">
              Aún no tienes movimientos registrados. Las aprobaciones resueltas aparecerán aquí para que mantengas trazabilidad.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {recent.map((approval) => {
              const statusConfig = approvalStatusLabels[approval.status];
              const signatureConfig = signatureStatusLabels[approval.signatureStatus];
              return (
                <Paper key={approval.id} variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
                  <Stack spacing={1.5}>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                      <Stack spacing={0.5}>
                        <Typography variant="subtitle2">{approval.title}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {approval.projectName} • Registrada el {formatDate(approval.createdAt)}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={statusConfig.label} color={statusConfig.color} variant="filled" />
                        <Chip size="small" label={signatureConfig.label} color={signatureConfig.color} variant="outlined" />
                      </Stack>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Resuelta el {formatDate(approval.decidedAt)}
                        </Typography>
                        {approval.description && (
                          <Typography variant="body2" color="text.secondary">
                            {approval.description}
                          </Typography>
                        )}
                      </Box>
                      {approval.signatureUrl && (
                        <Button
                          size="small"
                          variant="text"
                          endIcon={<LaunchIcon fontSize="small" />}
                          href={approval.signatureUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Consultar documento
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Stack>
  );
}
