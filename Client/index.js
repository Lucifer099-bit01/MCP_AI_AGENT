import readline from "readline/promises";
import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
config();

//gemini setup
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
let tools = [];

//mcp setup
const mcpClient = new Client({
  name: "First-Mcp-deploy",
  version: "1.0.0",
});

//chathistory for ai
const chatHistory = [];
//read instructions from user by the command line
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

//connect to mcp server
mcpClient
  .connect(new SSEClientTransport(new URL("http://localhost:3001/sse")))
  .then(async () => {
    console.log("connected to mcp server");
    chatLoop();
    // listing tools from mcp server
    tools = (await mcpClient.listTools()).tools.map((tool) => {
      return {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: tool.inputSchema.type,
          properties: tool.inputSchema.properties,
          required: tool.inputSchema.required,
        },
      };
    });
  });

  // Function to call the AI model and handle tool calls (main function)
async function chatLoop(toolcall) {
  if (toolcall) {
    chatHistory.push({
      role: "model",
      parts: [
        {
          type: "text",
          text: `Calling your tool ${toolcall.name}`,
        },
      ],
    });
    const toolResult = await mcpClient.callTool({
      name: toolcall.name,
      arguments: toolcall.args,
    });
    chatHistory.push({
      role: "user",
      parts: [
        {
          type: "text",
          text: toolResult.content[0].text,
        },
      ],
    });
  } else {
    const question = await rl.question("You: ");
    chatHistory.push({
      role: "user",
      parts: [
        {
          text: question,
          type: "text",
        },
      ],
    });
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: chatHistory,
    config: {
      tools: [
        {
          functionDeclarations: tools, // function declarations from mcp server
        },
      ],
    },
  });
  const responseText = response.candidates[0].content.parts[0].text;
  const functioncall = response.candidates[0].content.parts[0].functionCall;
  if (functioncall) {
    return chatLoop(functioncall);
  }

  chatHistory.push({
    role: "model",
    parts: [
      {
        text: responseText,
        type: "text",
      },
    ],
  });
  console.log("AI: ", responseText);
  chatLoop();
}
