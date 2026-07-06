import { IConnector } from './connector-types';
import { XConnector, NoteConnector } from './social-connectors';
import { GitHubConnector } from './github/github-connector';

export class ConnectorManager {
  private static instance: ConnectorManager;
  private connectors: Map<string, IConnector> = new Map();

  private constructor() {
    this.registerConnector(new GitHubConnector());
    this.registerConnector(new XConnector());
    this.registerConnector(new NoteConnector());
  }

  public static getInstance(): ConnectorManager {
    if (!ConnectorManager.instance) {
      ConnectorManager.instance = new ConnectorManager();
    }
    return ConnectorManager.instance;
  }

  registerConnector(connector: IConnector): void {
    this.connectors.set(connector.serviceId, connector);
  }

  getConnector(serviceId: string): IConnector | undefined {
    return this.connectors.get(serviceId);
  }

  listAvailableConnectors(): string[] {
    return Array.from(this.connectors.keys());
  }
}
