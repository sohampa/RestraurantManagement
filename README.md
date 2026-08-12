# ForkFlow Restaurant Management (Frontend + Backend)

This project is now split into two separate applications:

- frontend: React + Vite user interface
- backend: Node.js + Express REST API

The backend currently uses a static file-based data layer and is structured to be replaced by a database later.

## Project Structure

- frontend/
- backend/
- backend/data/seed.json
- backend/data/state.json (created automatically on first run)

## Frontend Stack

- React 18
- Vite 5
- Bootstrap 5
- Bootstrap Icons

## Backend Stack

- Node.js
- Express
- CORS

## API Conventions

- Base URL: /api/v1
- JSON response shape:
  - success: boolean
  - message: string
  - data: object or array
- Versioned endpoints for forward compatibility
- Resource-oriented routes with clear mutation actions

## Main Backend Endpoints

- GET /api/v1/health
- GET /api/v1/state
- POST /api/v1/state/reset
- POST /api/v1/orders
- PATCH /api/v1/orders/:orderId/advance
- DELETE /api/v1/orders/:orderId
- POST /api/v1/menu
- PATCH /api/v1/menu/:dishId/toggle-availability
- PATCH /api/v1/menu/:dishId/decrement-stock
- DELETE /api/v1/menu/:dishId
- PATCH /api/v1/tables/:tableId/toggle-occupancy
- PUT /api/v1/settings

## Run Locally

1. Install frontend dependencies:

	cd frontend
	npm install

2. Install backend dependencies:

	cd ../backend
	npm install

3. Start backend:

	npm run dev

4. Start frontend in another terminal:

	cd ../frontend
	npm run dev

Default ports:

- frontend: http://localhost:5173
- backend: http://localhost:30000

## Environment Variables

Frontend supports:

- VITE_API_BASE_URL (default: http://localhost:30000/api/v1)

Example file:

- frontend/.env.example

## Future Database Migration Path

The backend data access is isolated in backend/src/data/store.js. For DB migration later:

1. Keep API contracts unchanged.
2. Replace file read/write logic in store.js with repository methods.
3. Keep route handlers and frontend API calls unchanged.

## GitHub MCP Server

This workspace includes MCP configuration at `.vscode/mcp.json` for GitHub access.

Configured server:

- github -> `npx -y @modelcontextprotocol/server-github`

### Required authentication

Set a GitHub personal access token in your environment as `GITHUB_PERSONAL_ACCESS_TOKEN`.

Windows PowerShell (current session):

```powershell
$env:GITHUB_PERSONAL_ACCESS_TOKEN = "<your-token>"
```

Windows PowerShell (persist for user):

```powershell
setx GITHUB_PERSONAL_ACCESS_TOKEN "<your-token>"
```

After `setx`, restart VS Code so the new variable is visible to MCP processes.

### Token scopes

Use least privilege. Start with minimal repo read scopes, then add write scopes only if required by your workflow.
