import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import {createPost} from "./mcp.tool.js";// tool for twitter post

const server = new McpServer({
  name: "backwards-compatible-server",
  version: "1.0.0",
});

const app = express();
server.tool(
  "AddNumbers",
  "Adds two Number",
  {
    a: z.number(),
    b: z.number(),
  },
  async (args) => {
    const { a, b } = args;
    return {
      content: [
        {
          type: "text",
          text: `the Sum of a and b: ${a + b}`,
        },
      ],
    };
  }
);

//tool definition for the mcp tool
server.tool(
  "tweet_automation",
  "Automate Twitter Post",
  {
    status: z.string(),
  },
  async (args) => {
    const { status} = args;
    return createPost(status)
  }
)

const transports = {
  streamable: {},
  sse: {},
};

//this is the endpoint for the client to connect to the server
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  transports.sse[transport.sessionId] = transport;

  res.on("close", () => {
    delete transports.sse[transport.sessionId];
  });

  await server.connect(transport);
});

// This is the endpoint for the client to send messages to the server
app.post("/messages", async (req, res) => { 
  const sessionId = req.query.sessionId;
  const transport = transports.sse[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send("No transport found for sessionId");
  }
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
