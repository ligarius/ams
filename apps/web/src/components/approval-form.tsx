'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import DescriptionIcon from '@mui/icons-material/Description';
import SendIcon from '@mui/icons-material/Send';
import {
  Alert,
  Button,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

interface ProjectOption {
  id: number;
  name: string;
}

interface ApprovalFormProps {
  projects: ProjectOption[];
  canCreate: boolean;
}

export function ApprovalForm({ projects, canCreate }: ApprovalFormProps) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(projects[0]?.id ? String(projects[0].id) : '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const canSubmit = useMemo(() => {
    return (
      projectId.length > 0 &&
      title.trim().length >= 3 &&
      templateId.trim().length > 0 &&
      signerName.trim().length > 0 &&
      signerEmail.trim().length > 0
    );
  }, [projectId, title, templateId, signerName, signerEmail]);

  const handleSubmit = async () => {
    if (!canCreate || submitting || !canSubmit) {
      return;
    }
    setSubmitting(true);
    setFeedback(null);

    const payload = {
      title: title.trim(),
      description: description.trim().length ? description.trim() : undefined,
      documentTemplateId: templateId.trim(),
      signer: {
        name: signerName.trim(),
        email: signerEmail.trim(),
      },
      redirectUrl: redirectUrl.trim().length ? redirectUrl.trim() : undefined,
    };

    try {
      const response = await fetch(`/api/projects/${projectId}/approvals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        setFeedback({ type: 'error', message: errorBody?.message ?? 'No fue posible registrar la aprobación.' });
        return;
      }

      setFeedback({ type: 'success', message: 'Aprobación registrada correctamente.' });
      setTitle('');
      setDescription('');
      setTemplateId('');
      setSignerName('');
      setSignerEmail('');
      setRedirectUrl('');
      router.refresh();
    } catch (error) {
      console.error('Failed to create approval', error);
      setFeedback({ type: 'error', message: 'Ocurrió un error inesperado.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack spacing={3} flex={1} justifyContent="space-between">
      {projects.length === 0 ? (
        <Alert severity="info" icon={<DescriptionIcon fontSize="small" />}>
          Aún no tienes proyectos disponibles. Crea un proyecto para comenzar a solicitar aprobaciones.
        </Alert>
      ) : (
        <>
          {feedback && (
            <Alert
              severity={feedback.type}
              onClose={() => setFeedback(null)}
              data-testid={`approval-form-feedback-${feedback.type}`}
            >
              {feedback.message}
            </Alert>
          )}

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                id="approval-project"
                label="Proyecto"
                select
                size="small"
                fullWidth
                value={projectId}
                onChange={(event) => setProjectId(event.target.value)}
                disabled={!canCreate || projects.length === 0}
              >
                {projects.map((project) => (
                  <MenuItem key={project.id} value={project.id}>
                    {project.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="approval-title"
                label="Título"
                placeholder="Ej. Ajuste de alcance fase 2"
                fullWidth
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                disabled={!canCreate}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="approval-description"
                label="Descripción"
                placeholder="Describe el contexto o entregable asociado"
                fullWidth
                multiline
                minRows={2}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={!canCreate}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="approval-template"
                label="Plantilla de documento"
                placeholder="Identificador de la plantilla en el proveedor de firmas"
                fullWidth
                value={templateId}
                onChange={(event) => setTemplateId(event.target.value)}
                disabled={!canCreate}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                id="approval-signer-name"
                label="Nombre del firmante"
                fullWidth
                value={signerName}
                onChange={(event) => setSignerName(event.target.value)}
                disabled={!canCreate}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                id="approval-signer-email"
                label="Correo del firmante"
                type="email"
                fullWidth
                value={signerEmail}
                onChange={(event) => setSignerEmail(event.target.value)}
                disabled={!canCreate}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                id="approval-redirect"
                label="URL de redirección"
                type="url"
                placeholder="https://miempresa.com/agradecimiento"
                fullWidth
                value={redirectUrl}
                onChange={(event) => setRedirectUrl(event.target.value)}
                disabled={!canCreate}
              />
            </Grid>
          </Grid>

          <Stack spacing={1}>
            <Button
              variant="contained"
              endIcon={<SendIcon />}
              onClick={handleSubmit}
              disabled={!canCreate || !canSubmit || submitting}
            >
              {submitting ? 'Enviando…' : 'Enviar aprobación'}
            </Button>
            {!canCreate && (
              <Typography variant="caption" color="text.secondary">
                Tu rol actual no permite registrar aprobaciones. Contacta al administrador del proyecto para solicitar cambios.
              </Typography>
            )}
          </Stack>
        </>
      )}
    </Stack>
  );
}
