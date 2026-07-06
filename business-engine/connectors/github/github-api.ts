import { ConnectorManager } from '../connector-manager';
import { GitHubConnector } from './github-connector';

export const getGitHubConnector = () => {
  const manager = ConnectorManager.getInstance();
  const connector = manager.getConnector('GitHub');
  if (!(connector instanceof GitHubConnector)) {
    throw new Error('GitHub Connector not properly initialized');
  }
  return connector;
};

/**
 * GitHub API for Business Engine
 */
export const fetchGitHubRepos = async () => {
  try {
    const connector = getGitHubConnector();
    const repos = await connector.listRepositories();
    return { ok: true, data: repos };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
};

export const createGitHubIssueAction = async (owner: string, repo: string, title: string, body: string) => {
  try {
    const connector = getGitHubConnector();
    const issue = await connector.createIssue(owner, repo, title, body);
    return { ok: true, data: issue };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
};
