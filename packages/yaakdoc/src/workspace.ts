import type {
  Environment,
  Folder,
  HttpRequest,
  RawYaakExport,
  Workspace,
  YaakTree,
} from "./types";

export class YaakExport {
  yaakVersion: string;
  yaakSchema: number;
  exportedAt: Date;

  workspaceMap: Map<string, Workspace> = new Map();
  environmentMap: Map<string, Environment> = new Map();
  folderMap: Map<string, Folder> = new Map();
  httpRequestMap: Map<string, HttpRequest> = new Map();

  tree: YaakTree = [];

  activeWorkspaceId?: string;
  activeEnvironmentId?: string;

  variableMap: Map<string, string> = new Map();

  constructor(rawData: RawYaakExport) {
    this.yaakVersion = rawData.yaakVersion;
    this.yaakSchema = rawData.yaakSchema;
    this.exportedAt = new Date(rawData.timestamp);

    rawData.resources.workspaces.forEach((workspace) => {
      this.workspaceMap.set(workspace.id, workspace);
    });

    rawData.resources.environments.forEach((environment) => {
      this.environmentMap.set(environment.id, environment);
    });

    rawData.resources.folders.forEach((folder) => {
      this.folderMap.set(folder.id, folder);
    });

    rawData.resources.httpRequests.forEach((httpRequest) => {
      this.httpRequestMap.set(httpRequest.id, httpRequest);
    });

    if (!this.activeEnvironmentId) {
      const id = this.environmentMap.keys().next().value;

      if (id) {
        this.setActiveEnvironment(id);
      }
    }

    if (!this.activeWorkspaceId) {
      const id = this.workspaceMap.keys().next().value;

      if (id) {
        this.setActiveWorkspace(id);
      }
    }
  }

  get activeWorkspace(): Workspace | null {
    if (this.activeWorkspaceId) {
      return this.workspaceMap.get(this.activeWorkspaceId) || null;
    }

    return null;
  }

  get activeEnvironment(): Environment | null {
    if (this.activeEnvironmentId) {
      return this.environmentMap.get(this.activeEnvironmentId) || null;
    }

    return null;
  }

  setActiveWorkspace(workspaceId: string, throwError = false) {
    if (throwError && !this.activeWorkspace) {
      throw new Error(`Workspace with id ${workspaceId} not found`);
    }

    this.activeWorkspaceId = workspaceId;
    this.buildTree();
    this.buildVariableMap();
  }

  setActiveEnvironment(environmentId: string, throwError = false) {
    if (throwError && !this.activeEnvironment) {
      throw new Error(`Environment with id ${environmentId} not found`);
    }

    this.activeEnvironmentId = environmentId;
    this.buildVariableMap();
  }

  toJSON() {
    return {
      yaakVersion: this.yaakVersion,
      yaakSchema: this.yaakSchema,
      exportedAt: this.exportedAt,
      activeWorkspaceId: this.activeWorkspaceId,
      activeEnvironmentId: this.activeEnvironmentId,
      workspaceMap: Array.from(this.workspaceMap.entries()),
      environmentMap: Array.from(this.environmentMap.entries()),
      folderMap: Array.from(this.folderMap.entries()),
      httpRequestMap: Array.from(this.httpRequestMap.entries()),
      tree: this.tree,
      variableMap: Array.from(this.variableMap.entries()),
    };
  }

  private buildTree() {
    if (!this.activeWorkspace) {
      return;
    }

    const workspace = this.activeWorkspace;

    const workspaceFolders = Array.from(this.folderMap.values())
      .filter((folder) => folder.workspaceId === workspace.id);

    const workspaceRequests = Array.from(this.httpRequestMap.values())
      .filter((httpRequest) => httpRequest.workspaceId === workspace.id);

    const tree: YaakTree = [];

    const rootNodes = workspaceFolders.filter((folder) => !folder.folderId);

    rootNodes.forEach((folder) => {
      tree.push({
        id: folder.id,
        type: "folder",
        nodes: this.buildFolderTree(folder, workspaceFolders, workspaceRequests),
      });
    });

    this.tree = tree;
  }

  private buildFolderTree(folder: Folder, folders: Folder[], requests: HttpRequest[]): YaakTree {
    const folderNodes: YaakTree = [];

    const childFolders = folders.filter((f) => f.folderId === folder.id);
    const childRequests = requests.filter((r) => r.folderId === folder.id);

    childFolders.forEach((childFolder) => {
      folderNodes.push({
        id: childFolder.id,
        type: "folder",
        nodes: this.buildFolderTree(childFolder, folders, requests),
      });
    });

    childRequests.forEach((request) => {
      folderNodes.push({
        id: request.id,
        type: "httpRequest",
      });
    });

    return folderNodes;
  }

  private buildVariableMap() {
    const workspace = this.activeWorkspace;

    if (!workspace) {
      return;
    }

    const variableMap = new Map<string, string>();

    workspace.variables
      .filter(variable => variable.enabled)
      .forEach(variable => {
        variableMap.set(variable.name, variable.value);
      });

    const environment = this.activeEnvironment;

    if (environment) {
      environment.variables
        .filter(variable => variable.enabled)
        .forEach(variable => {
          variableMap.set(variable.name, variable.value);
        });
    }

    this.variableMap = variableMap;
  }
}
