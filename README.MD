

Use the MCP tools create and MCP Server
https://github.com/f/mcptools


1. create a new MCP server
```bash
mcp new tool:demo
```

2. list the tools
```bash
mcp tools node build/index.js
```

3. call the tool
```bash
mcp call dust node build/index.js --params '{"aNumber": 42, "aString": "hello", "someEnum": "option1"}'
```

4. add the tool to the alias and list the aliases
```bash
mcp alias add dust node build/index.js
mcp alias list
```
5. call the tool using alias
```bash
mcp call dust --params '{"aNumber": 42, "aString": "hello", "someEnum": "option1"}'
```
6. scan all MCP configs on your system
```bash
mcp configs scan
```
7. Setup  Claude Desktop config with the mcp server
```bash
mcp configs set claude-desktop demo /Users/ma3u/.nvm/versions/node/v22.14.0/bin/node /Users/ma3u/projects/mcp-server-new/build/index.js
```

8. Call the tool from Claude Desktop
