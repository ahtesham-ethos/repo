# Figma MCP Server Setup Guide

## Your Figma File Details
- **File URL**: https://www.figma.com/design/r5lrlefDkmH9QbgqA4xWOr/Untitled?node-id=0-1&p=f
- **File Key**: `r5lrlefDkmH9QbgqA4xWOr`
- **Node ID**: `0-1`

## Setup Steps

### 1. Get Your Figma Personal Access Token

1. Go to https://www.figma.com/
2. Click on your profile icon (top right)
3. Select **Settings**
4. Scroll down to **Personal access tokens**
5. Click **Generate new token**
6. Give it a name (e.g., "Kiro MCP Server")
7. Copy the token (you won't be able to see it again!)

### 2. Token Already Configured ✅

Your token has been added to `.kiro/settings/mcp.json` (this file is gitignored for security).

### 3. Restart Kiro or Reconnect MCP Server

After updating the configuration:
- Restart Kiro completely
- Or use the MCP Server view in Kiro to reconnect the Figma server

### 4. Using the Figma MCP Server

Once connected, you can use the Figma MCP tools through me!

#### Get Design Intent
```
Get the design intent from my Figma file: r5lrlefDkmH9QbgqA4xWOr
```

#### Get Specific Node Content
```
Get the content of node 0-1 from Figma file r5lrlefDkmH9QbgqA4xWOr
```

#### Get Full File Structure
```
Get the full Figma file structure for r5lrlefDkmH9QbgqA4xWOr
```

## Available MCP Tools

The Figma MCP server provides these tools:

1. **get_figma_file** - Get the complete file structure and metadata
2. **get_figma_design_intent** - Extract design intent and specifications
3. **get_figma_node_content** - Get specific node content by ID

## Example Usage

After setup, you can ask Kiro:

> "Analyze the design intent from my Figma file and help me implement the UI components"

> "Compare the current VisualDashboard component with the Figma design and suggest improvements"

> "Extract color palette and typography from the Figma design"

## Troubleshooting

### Server Not Connecting
- Verify your token is correct and hasn't expired
- Check that Node.js is installed (required for npx)
- Try manually running: `npx -y @modelcontextprotocol/server-figma`

### Permission Errors
- Make sure your Figma token has access to the file
- Verify the file is not private or you have proper permissions

### Token Issues
- Tokens start with `figd_`
- Don't share your token publicly
- Regenerate if compromised

## Security Note

⚠️ **Never commit your Figma token to version control!**

Consider adding `.kiro/settings/mcp.json` to your `.gitignore` if it contains sensitive tokens.
