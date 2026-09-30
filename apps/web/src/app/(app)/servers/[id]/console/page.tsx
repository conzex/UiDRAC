/** Console tab — auto-launch when server has saved iDRAC credentials. */
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';
import { ServerConsolePanel } from '@/components/servers/server-console-panel';

export default function ConsolePage() {
  const { id } = useParams() as { id: string };
  const [server, setServer] = useState<{ name?: string; ip?: string; generation?: string; credentialsMode?: string } | null>(
    null,
  );

  useEffect(() => {
    if (!id) return;
    api.get(`/servers/${id}`).then((r) => setServer(r.data)).catch(() => {});
  }, [id]);

  return <ServerConsolePanel serverId={id} server={server ?? undefined} />;
}
