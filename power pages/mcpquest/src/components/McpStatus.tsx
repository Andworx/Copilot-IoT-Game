import type { McpServerInfo } from "@mcpquest/types";

interface Props {
  server?: McpServerInfo;
  kind: "preview" | "mcp" | "live";
}

function hostAndPath(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.host}${parsed.pathname}`;
  } catch {
    return url;
  }
}

export function McpStatus({ server, kind }: Props) {
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
