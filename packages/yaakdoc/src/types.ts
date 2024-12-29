import type {
  Environment,
  EnvironmentVariable,
  Folder,
  HttpRequest,
  Workspace as _Workspace,
} from "@yaakapp/api";

type Workspace = _Workspace & {
  variables: EnvironmentVariable[];
}

export type RawYaakResources = {
  workspaces: Workspace[];
  environments: Environment[];
  folders: Folder[];
  httpRequests: HttpRequest[];
}

export type RawYaakExport = {
  yaakVersion: string;
  yaakSchema: number;
  timestamp: string;
  resources: RawYaakResources;
}

export type YaakTree = Array<YaakTreeNode>;

export type YaakTreeNode = {
  id: string;
  type: "folder" | "httpRequest";
  nodes?: YaakTree;
}

export type {
  Environment,
  Folder,
  HttpRequest,
  Workspace,
}
