import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage, unwrapData } from '../utils/apiData.js';

export function useApi(loader, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      requestId.current += 1;
    };
  }, []);

  const reload = useCallback(async ({ background = false } = {}) => {
    const currentRequest = ++requestId.current;
    if (!background) setLoading(true);
    setError('');
    try {
      const response = await loader();
      if (mounted.current && requestId.current === currentRequest) setData(unwrapData(response));
    } catch (requestError) {
      if (mounted.current && requestId.current === currentRequest) setError(getErrorMessage(requestError));
    } finally {
      if (mounted.current && requestId.current === currentRequest) setLoading(false);
    }
  // Callers pass a stable loader and explicit dependencies.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload, setData };
}
