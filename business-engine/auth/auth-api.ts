import { AuthManager } from './auth-manager';
import { CredentialStore } from './credential-store';

/**
 * Authentication Management API (for Business Engine Integration)
 */
export const getServiceConnectionStatus = async (serviceId: string) => {
  const manager = AuthManager.getInstance();
  const status = await manager.getConnectionStatus(serviceId);
  return {
    ok: true,
    serviceId,
    status
  };
};

export const listConnectedServices = async () => {
  const store = CredentialStore.getInstance();
  const manager = AuthManager.getInstance();
  const services = store.listServices();
  
  const results = await Promise.all(services.map(async s => ({
    serviceId: s,
    status: await manager.getConnectionStatus(s)
  })));

  return {
    ok: true,
    data: results
  };
};
