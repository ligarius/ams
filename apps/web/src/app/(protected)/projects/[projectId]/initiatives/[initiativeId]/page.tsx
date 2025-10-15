import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Stack } from '@mui/material';
import type { InitiativeWithAssignments } from '@backend/services/initiativeService';
import { InitiativeForm } from '@/components/initiative-form';

const buildBaseUrl = () => {
  const headerList = headers();
  const host = headerList.get('x-forwarded-host') ?? headerList.get('host');
  if (host) {
    const protocol = headerList.get('x-forwarded-proto') ?? 'http';
    return `${protocol}://${host}`;
  }
  const fallback = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL;
  if (!fallback) {
    throw new Error('Unable to determine host for initiative details');
  }
  return fallback.replace(/\/$/, '');
};

const buildCookieHeader = () => {
  const store = cookies();
  const entries = store.getAll();
  if (entries.length === 0) {
    return undefined;
  }
  return entries.map(({ name, value }) => `${name}=${value}`).join('; ');
};

interface InitiativeDetailPageProps {
  params: { projectId: string; initiativeId: string };
}

export default async function InitiativeDetailPage({ params }: InitiativeDetailPageProps) {
  const projectId = Number(params.projectId);
  const initiativeId = Number(params.initiativeId);

  if (Number.isNaN(projectId) || Number.isNaN(initiativeId)) {
    notFound();
  }

  const baseUrl = buildBaseUrl();
  const response = await fetch(`${baseUrl}/api/projects/${projectId}/initiatives/${initiativeId}`, {
    headers: {
      Cookie: buildCookieHeader() ?? '',
    },
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error('No fue posible obtener la iniciativa solicitada');
  }

  const initiative = (await response.json()) as InitiativeWithAssignments;

  return (
    <Stack sx={{ p: { xs: 2, md: 4 } }}>
      <InitiativeForm projectId={projectId} initiative={initiative} />
    </Stack>
  );
}
