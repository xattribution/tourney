import { useEffect, useState } from 'react';

export interface ToastMsg { text: string; key: number }

export function Toast({ toast }: { toast: ToastMsg | null }) {
  const [shown, setShown] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    setShown(toast.text);
    const t = setTimeout(() => setShown(null), 2200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.key]);
  return <div className={'toast' + (shown ? ' show' : '')}>{shown}</div>;
}
