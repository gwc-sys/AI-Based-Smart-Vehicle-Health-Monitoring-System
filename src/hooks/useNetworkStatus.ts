// simple network status hook stub
import { useEffect, useState } from 'react';

export function useNetworkStatus() {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // placeholder: in real app use NetInfo or similar
    setIsConnected(true);
  }, []);

  return { isConnected };
}

export default useNetworkStatus;