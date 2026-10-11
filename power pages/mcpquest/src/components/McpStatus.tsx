import type { McpServerInfo } from "@mcpquest/types";

interface Props {
  server?: McpServerInfo;
  kind: "preview" | "mcp" | "live";
  /** A generated mission: built from a system, then played against its saved tool list. */
  generatedFrom?: { serverName: string; toolCount: number };
}

function hostAndPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export function McpStatus({ server, kind, generatedFrom }: Props) {
  if (!server && generatedFrom) {
    return (
      <div className="mcp-status" role="status">
        <span className="dot" aria-hidden="true" />
        <span>
          <strong>Built from {generatedFrom.serverName}</strong> · {generatedFrom.toolCount} tools · your designs are
          checked against its saved tool list, so nothing is changed on the real system.
        </span>
      </div>
    );
  }

  if (!server) {
    return (
      <div className="mcp-status mcp-off" role="status">
        <span className="dot" aria-hidden="true" />
        <span>
          <strong>Offline preview.</strong> Simulated tools; no MCP server is involved.
        </span>
      </div>
    );
  }

  return (
    <div className="mcp-status" role="status">
      <span className="dot" aria-hidden="true" />
      <span>
        <strong>MCP connected</strong> · {server.name} · <code>{hostAndPath(server.url)}</code> · protocol{" "}
        {server.protocolVersion} · {server.toolCount} read-only tools of {server.totalToolCount} advertised
        {kind === "mcp" ? " · calls go straight from this page" : ""}
      </span>
    </div>
  );
}
