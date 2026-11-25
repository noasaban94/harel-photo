import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_drive/drive/v3";

export const Route = createFileRoute("/api/drive-image/$fileId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const fileId = params.fileId;
        if (!fileId || !/^[a-zA-Z0-9_-]{5,}$/.test(fileId)) {
          return new Response("Invalid file ID", { status: 400 });
        }

        const lovableApiKey = process.env["LOVABLE_API_KEY"];
        const driveApiKey = process.env["GOOGLE_DRIVE_API_KEY"];
        if (!lovableApiKey || !driveApiKey) {
          return new Response("Google Drive connection unavailable", { status: 503 });
        }

        const upstream = await fetch(
          `${GATEWAY_URL}/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
          {
            headers: {
              Authorization: `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": driveApiKey,
            },
          },
        );

        if (!upstream.ok) {
          const errorBody = await upstream.text();
          console.error(`Drive image proxy failed [${upstream.status}]: ${errorBody}`);
          return new Response(`Failed to fetch image [${upstream.status}]`, {
            status: upstream.status,
          });
        }

        const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=86400",
          },
        });
      },
    },
  },
});