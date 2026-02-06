# Figma MCP Quick Start

## ✅ Configuration Fixed!

The issue was using the wrong package name. The correct package is `figma-mcp` (not `@modelcontextprotocol/server-figma`).

## Current Configuration

Your `.kiro/settings/mcp.json` is now configured with:
- **Package**: `figma-mcp` 
- **Token**: Already added ✅
- **File Key**: `r5lrlefDkmH9QbgqA4xWOr`

## Next Steps

1. **Restart Kiro** to load the new configuration
2. **Test the connection** by asking me to access your Figma file

## How to Use

Once Kiro restarts, you can ask me things like:

### View Figma File
```
Show me the structure of my Figma file r5lrlefDkmH9QbgqA4xWOr
```

### Add Comments
```
Add a comment to node 0-1 in my Figma file saying "Review this design"
```

### Read Comments
```
Get all comments from my Figma file
```

### View Specific Node
```
Show me the details of node 0-1 from my Figma file
```

## Available Tools

The `figma-mcp` server provides these MCP tools:
- `add_figma_file` - Add a Figma file to context
- `view_node` - Get thumbnail for a specific node
- `read_comments` - Get all comments on a file
- `post_comment` - Post a comment on a node
- `reply_to_comment` - Reply to an existing comment

## Troubleshooting

If it still doesn't work after restart:
1. Check that your Figma token is valid
2. Verify you have access to the Figma file
3. Try manually: `npx -y figma-mcp` (should show "Figma MCP Server running on stdio")

## Your Figma File

- **URL**: https://www.figma.com/design/r5lrlefDkmH9QbgqA4xWOr/Untitled?node-id=0-1&p=f
- **File Key**: `r5lrlefDkmH9QbgqA4xWOr`
- **Node ID**: `0-1`
