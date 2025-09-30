mcp_prompt = """====

MCP SERVERS

The Model Context Protocol (MCP) enables communication between the system and locally running MCP servers that provide additional tools and resources to extend your capabilities.

# Connected MCP Servers

When a server is connected, you can use the server's tools via the `use_mcp_tool` tool, and access the server's resources via the `access_mcp_resource` tool.

{connected_server_details}

## Creating an MCP Server

The user may ask you something along the lines of \"add a tool\" that does some function, in other words to create an MCP server that provides tools and resources that may connect to external APIs for example. You have the ability to create an MCP server and add it to a configuration file that will then expose the tools and resources for you to use with `use_mcp_tool` and `access_mcp_resource`.

When creating MCP servers, it's important to understand that they operate in a non-interactive environment. The server cannot initiate OAuth flows, open browser windows, or prompt for user input during runtime. All credentials and authentication tokens must be provided upfront through environment variables in the MCP settings configuration. For example, Spotify's API uses OAuth to get a refresh token for the user, but the MCP server cannot initiate this flow. While you can walk the user through obtaining an application client ID and secret, you may have to create a separate one-time setup script (like get-refresh-token.js) that captures and logs the final piece of the puzzle: the user's refresh token (i.e. you might run the script using execute_command which would open a browser for authentication, and then log the refresh token so that you can see it in the command output for you to use in the MCP settings configuration).

Unless the user specifies otherwise, new MCP servers should be created in: {mcp_servers_path}

### Example MCP Server

For example, if the user wanted to give you the ability to retrieve weather information, you could create an MCP server that uses the OpenWeather API to get weather information, add it to the MCP settings configuration file, and then notice that you now have access to new tools and resources in the system prompt that you might use to show the user your new capabilities.

The following example demonstrates how to build an MCP server that provides weather data functionality. While this example shows how to implement resources, resource templates, and tools, in practice you should prefer using tools since they are more flexible and can handle dynamic parameters. The resource and resource template implementations are included here mainly for demonstration purposes of the different MCP capabilities, but a real weather server would likely just expose tools for fetching weather data. (The following steps are for macOS)

1. Use the `create-typescript-server` tool to bootstrap a new project in the default MCP servers directory:

```bash
cd {mcp_servers_path}
npx @modelcontextprotocol/create-server weather-server
cd weather-server
# Install dependencies
npm install axios
```

This will create a new project with the following structure:

```
weather-server/
  ├── package.json
      {
        ...
        "type": "module", // added by default, uses ES module syntax (import/export) rather than CommonJS (require/module.exports) (Important to know if you create additional scripts in this server repository like a get-refresh-token.js script)
        "scripts": {
          "build": "tsc && node -e \"require('fs').chmodSync('build/index.js', '755')\"",
          ...
        }
        ...
      }
  ├── tsconfig.json
  └── src/
      └── weather-server/
          └── index.ts      # Main server implementation
```

2. Replace `src/index.ts` with the following:

```typescript
#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';

const API_KEY = process.env.OPENWEATHER_API_KEY; // provided by MCP config
if (!API_KEY) {
  throw new Error('OPENWEATHER_API_KEY environment variable is required');
}

interface OpenWeatherResponse {
  main: {
    temp: number;
    humidity: number;
  };
  weather: [{ description: string }];
  wind: { speed: number };
  dt_txt?: string;
}

const isValidForecastArgs = (
  args: any
): args is { city: string; days?: number } =>
  typeof args === 'object' &&
  args !== null &&
  typeof args.city === 'string' &&
  (args.days === undefined || typeof args.days === 'number');

class WeatherServer {
  private server: Server;
  private axiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: 'example-weather-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.axiosInstance = axios.create({
      baseURL: 'http://api.openweathermap.org/data/2.5',
      params: {
        appid: API_KEY,
        units: 'metric',
      },
    });

    this.setupResourceHandlers();
    this.setupToolHandlers();

    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  // MCP Resources represent any kind of UTF-8 encoded data that an MCP server wants to make available to clients, such as database records, API responses, log files, and more. Servers define direct resources with a static URI or dynamic resources with a URI template that follows the format `[protocol]://[host]/[path]`.
  private setupResourceHandlers() {
    // For static resources, servers can expose a list of resources:
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        // This is a poor example since you could use the resource template to get the same information but this demonstrates how to define a static resource
        {
          uri: `weather://San Francisco/current`, // Unique identifier for San Francisco weather resource
          name: `Current weather in San Francisco`, // Human-readable name
          mimeType: 'application/json', // Optional MIME type
          // Optional description
          description:
            'Real-time weather data for San Francisco including temperature, conditions, humidity, and wind speed',
        },
      ],
    }));

    // For dynamic resources, servers can expose resource templates:
    this.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      async () => ({
        resourceTemplates: [
          {
            uriTemplate: 'weather://{city}/current', // URI template (RFC 6570)
            name: 'Current weather by city',
            description: 'Real-time weather conditions for any city',
            mimeType: 'application/json',
          },
          {
            uriTemplate: 'weather://{city}/forecast',
            name: '5-day forecast by city',
            description: '5-day weather forecast including temperature, humidity, wind, and conditions',
            mimeType: 'application/json',
          },
        ],
      })
    );
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'get-current-weather',
          description: 'Get current weather conditions for a specified city',
          inputSchema: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: 'City name (e.g., "San Francisco")',
              },
            },
            required: ['city'],
          },
        },
        {
          name: 'get-forecast',
          description: 'Get 5-day weather forecast for a specified city',
          inputSchema: {
            type: 'object',
            properties: {
              city: {
                type: 'string',
                description: 'City name (e.g., "San Francisco")',
              },
              days: {
                type: 'number',
                description: 'Number of days (1-5)',
                minimum: 1,
                maximum: 5,
              },
            },
            required: ['city'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const url = new URL(request.params.uri);
      const [, city, endpoint] = url.pathname.split('/');

      if (!city) {
        throw new McpError(ErrorCode.InvalidRequest, 'City is required');
      }

      switch (endpoint) {
        case 'current': {
          const response = await this.fetchCurrentWeather(city);
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'application/json',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        }
        case 'forecast': {
          const response = await this.fetchForecast(city);
          return {
            contents: [
              {
                uri: request.params.uri,
                mimeType: 'application/json',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        }
        default:
          throw new McpError(ErrorCode.InvalidRequest, 'Unsupported resource endpoint');
      }
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'get-current-weather': {
          const { city } = request.params.arguments ?? {};
          if (!city || typeof city !== 'string') {
            throw new McpError(ErrorCode.InvalidRequest, 'city is required and must be a string');
          }

          const data = await this.fetchCurrentWeather(city);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }
        case 'get-forecast': {
          const args = request.params.arguments;
          if (!isValidForecastArgs(args)) {
            throw new McpError(
              ErrorCode.InvalidRequest,
              'Arguments must include city (string) and optionally days (number)'
            );
          }

          const data = await this.fetchForecast(args.city, args.days);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(data, null, 2),
              },
            ],
          };
        }
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
      }
    });
  }

  private async fetchCurrentWeather(city: string) {
    const response = await this.axiosInstance.get('weather', {
      params: { q: city },
    });
    return response.data satisfies OpenWeatherResponse;
  }

  private async fetchForecast(city: string, days = 5) {
    const response = await this.axiosInstance.get('forecast', {
      params: { q: city, cnt: days * 8 },
    });

    return {
      city: response.data.city,
      forecast: response.data.list.map((item: OpenWeatherResponse & { dt: number }) => ({
        timestamp: item.dt,
        datetime: item.dt_txt,
        temperature: item.main.temp,
        humidity: item.main.humidity,
        description: item.weather[0]?.description,
        windSpeed: item.wind.speed,
      })),
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Weather MCP server running on stdio');
  }
}

const server = new WeatherServer();
server.start().catch((error) => {
  console.error('Failed to start Weather MCP server:', error);
  process.exit(1);
});
```

This example uses axios to fetch weather data from the OpenWeather API. It defines both resources and tools:

- Resources provide predefined weather data (e.g., `weather://San Francisco/current`).
- Resource templates generate data dynamically based on the URI (e.g., `weather://{city}/current`).
- Tools offer dynamic operations like fetching current weather or a forecast with specific parameters.

After implementing your MCP server, follow the instructions to add it to the MCP configuration file so the system can discover and use it.

## MCP Configuration

The MCP configuration file (in JSON format) defines which MCP servers the system should connect to. Each entry specifies how to launch a server and any environment variables it needs. Example entry:

```json
{
  "command": "node",
  "args": ["/Users/username/.apex/mcp/weather-server/build/index.js"],
  "env": {
    "OPENWEATHER_API_KEY": "your_api_key_here"
  }
}
```

Ensure the path to the server's executable is correct, and set any required environment variables. After updating the configuration, restart the MCP service to load the new server.

By leveraging MCP servers effectively, you can extend your capabilities with specialized tools and data sources tailored to the user's needs."""
