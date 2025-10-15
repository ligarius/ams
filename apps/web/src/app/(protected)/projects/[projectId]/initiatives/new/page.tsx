import { cookies, headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Stack } from '@mui/material';
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
    throw new Error('Unable to determine host for initiative creation');
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

interface NewInitiativePageProps {
  params: { projectId: string };
}

export default async function NewInitiativePage({ params }: NewInitiativePageProps) {
  const projectId = Number(params.projectId);
  if (Number.isNaN(projectId)) {
    notFound();
  }

  const baseUrl = buildBaseUrl();
  const response = await fetch(`${baseUrl}/api/projects/${projectId}/initiatives`, {
    headers: {
      Cookie: buildCookieHeader() ?? '',
    },
    cache: 'no-store',
  });

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error('No fue posible validar el acceso al proyecto');
  }

  return (
    <Stack sx={{ p: { xs: 2, md: 4 } }}>
      <InitiativeForm projectId={projectId} />
    </Stack>
  );
}
