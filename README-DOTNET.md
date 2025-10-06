# .NET OpenAPI Generator

🚀 Zero-dependency OpenAPI/Swagger documentation generator for .NET projects including ASP.NET Core Web API, MVC Controllers, and Minimal APIs.

## Features

- ✅ **Zero Dependencies** - Uses only Node.js built-in modules
- 🔍 **Auto-Detection** - Automatically detects .NET project structure and API patterns
- 📅 **Timestamped Output** - Generates files with date suffix for version tracking
- 🌐 **Multi-Pattern Support** - Works with Web API Controllers, MVC Actions, and Minimal APIs
- 🔧 **Pipeline Ready** - Perfect for CI/CD automation
- 📊 **Comprehensive Parsing** - Extracts routes, parameters, and HTTP methods
- ✅ **Production Tested** - Validated against 6 real-world projects (787 total endpoints)

## Supported .NET Patterns

### ASP.NET Core Web API
- **Controllers**: `*Controller.cs` files with HTTP attributes
- **HTTP Attributes**: `[HttpGet]`, `[HttpPost]`, `[HttpPut]`, `[HttpDelete]`, `[HttpPatch]`
- **Route Attributes**: `[Route]` on controllers and actions
- **Parameter Support**: Path parameters `{id}`, Query parameters `[FromQuery]`

### ASP.NET Core MVC
- **Controllers**: Public ActionResult methods
- **Convention Routing**: `/Controller/Action` patterns
- **Mixed Routing**: Both attributed and convention-based routes

### Minimal APIs (.NET 6+)
- **Map Methods**: `app.MapGet()`, `app.MapPost()`, etc.
- **Route Patterns**: `/api/users/{id}` style routes
- **Parameter Binding**: Automatic parameter detection

### Auto-Detection Patterns
- `src/**/Controllers/**/*Controller.cs`
- `**/Controllers/*Controller.cs`
- `Program.cs` with Minimal API patterns
- `*.csproj` project files
- `appsettings.json` configuration

## Installation

No installation required! Just download the script:

```bash
# Download the script
wget https://raw.githubusercontent.com/CrazyBearier/autoGen_OpenAPI/main/dotnet-openapi-generator.js

# Or copy the file directly
cp dotnet-openapi-generator.js /your/project/
```

## Usage

### Basic Usage

```bash
# Generate for current directory
node dotnet-openapi-generator.js

# Generate for specific .NET project
node dotnet-openapi-generator.js /path/to/your/dotnet/project

# Custom output file
node dotnet-openapi-generator.js /path/to/project custom-output.json
```

### Output

The generator creates files with automatic naming:
```
swagger-output-{PROJECT_NAME}-dotnet-{YYYY-MM-DD}.json
```

**Real-world Examples:**
- `swagger-output-OrchardCore-dotnet-2025-10-06.json` (239 endpoints)
- `swagger-output-server-dotnet-2025-10-06.json` (478 endpoints from Bitwarden)
- `swagger-output-NSwag-dotnet-2025-10-06.json` (46 endpoints)
- `swagger-output-eShopOnWeb-dotnet-2025-10-06.json` (17 endpoints)
- `swagger-output-MyWebAPI-dotnet-2025-10-06.json`

### Environment Variables

Customize the generated documentation:

```bash
export API_TITLE="My .NET API Documentation"
export API_DESCRIPTION="Comprehensive API for my .NET application"
export API_VERSION="2.1.0"
export API_HOST="api.myapp.com"

node dotnet-openapi-generator.js /path/to/project
```

## Examples

### ASP.NET Core Web API Controller

```csharp
[ApiController]
[Route("api/[controller]")]
public class UsersController : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IEnumerable<User>>> GetUsers()
    {
        // Implementation
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<User>> GetUser(int id)
    {
        // Implementation
    }

    [HttpPost]
    public async Task<ActionResult<User>> CreateUser([FromBody] User user)
    {
        // Implementation
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] User user)
    {
        // Implementation
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        // Implementation
    }
}
```

### Minimal APIs (.NET 6+)

```csharp
// Program.cs
var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

app.MapGet("/api/users", async () =>
{
    // Get all users
});

app.MapGet("/api/users/{id}", async (int id) =>
{
    // Get user by id
});

app.MapPost("/api/users", async (User user) =>
{
    // Create user
});

app.MapPut("/api/users/{id}", async (int id, User user) =>
{
    // Update user
});

app.MapDelete("/api/users/{id}", async (int id) =>
{
    // Delete user
});

app.Run();
```

### MVC Controller

```csharp
public class HomeController : Controller
{
    public IActionResult Index()
    {
        return View();
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromForm] CreateModel model)
    {
        // Implementation
        return RedirectToAction(nameof(Index));
    }

    public async Task<IActionResult> Details(int id)
    {
        // Implementation
        return View();
    }
}
```

## Output Format

Generated OpenAPI 3.0 specification includes:

- **Paths**: All detected API endpoints
- **Methods**: HTTP methods (GET, POST, PUT, DELETE, PATCH)
- **Parameters**: Path, query, and body parameters
- **Responses**: Standard HTTP response codes
- **Info**: Project metadata from appsettings.json or defaults

### Sample Output

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "ASP.NET Core API",
    "description": "Auto-generated API documentation",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "https://localhost:5000/api"
    }
  ],
  "paths": {
    "/api/users": {
      "get": {
        "summary": "GET /api/users",
        "description": "Action: GetUsers",
        "responses": {
          "200": { "description": "Success" },
          "400": { "description": "Bad Request" },
          "401": { "description": "Unauthorized" },
          "500": { "description": "Internal Server Error" }
        }
      },
      "post": {
        "summary": "POST /api/users",
        "description": "Action: CreateUser",
        "responses": {
          "200": { "description": "Success" },
          "400": { "description": "Bad Request" },
          "401": { "description": "Unauthorized" },
          "500": { "description": "Internal Server Error" }
        }
      }
    },
    "/api/users/{id}": {
      "get": {
        "summary": "GET /api/users/{id}",
        "description": "Action: GetUser",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": { "description": "Success" },
          "400": { "description": "Bad Request" },
          "404": { "description": "Not Found" },
          "500": { "description": "Internal Server Error" }
        }
      }
    }
  }
}
```

## Configuration

### appsettings.json Integration

The generator can read configuration from `appsettings.json`:

```json
{
  "Swagger": {
    "Title": "My Custom API",
    "Description": "API for my awesome application",
    "Version": "2.0.0"
  }
}
```

## Troubleshooting

### No .NET Project Detected

If you see "No .NET project detected" error:

1. **Check for .csproj files** - Ensure your project has `*.csproj` files
2. **Verify Controllers** - Look for `*Controller.cs` files in your project
3. **Check Program.cs** - For Minimal APIs, ensure `Program.cs` contains `app.Map*` calls
4. **Project Structure** - Make sure you're running from the correct directory

### No Controllers Found

If the generator reports 0 controllers:

1. **File Naming** - Ensure controller files end with `Controller.cs`
2. **Directory Structure** - Controllers can be in any subdirectory (recursive search)
3. **File Permissions** - Ensure the script can read your project files
4. **Excluded Directories** - The generator skips `bin/`, `obj/`, and `.git/` directories

### Low Endpoint Count

If you expected more endpoints:

1. **HTTP Attributes** - Use `[HttpGet]`, `[HttpPost]`, etc. for explicit detection
2. **Public Methods** - Only public methods are detected for MVC actions
3. **Method Signatures** - Ensure methods return `ActionResult`, `IActionResult`, or similar
4. **Route Attributes** - Use `[Route]` attributes for custom routing

## Production Testing

The generator has been successfully tested against real-world .NET projects:

- **OrchardCore CMS** (ASP.NET Core CMS): 239 endpoints from 103 controller files
- **Bitwarden Server** (Password Manager API): 478 endpoints from 101 controller files
- **NSwag** (OpenAPI Toolchain): 46 endpoints from 29 controller files
- **eShopOnWeb** (E-commerce Reference): 17 endpoints from 4 controller files
- **ABP Framework** (Application Framework): 2 endpoints from 5 controller files
- **AspNetCore.Docs** (Documentation Samples): 5 endpoints from 3 controller files

**Total Results**: **787 endpoints** from **245 controller files** across **6 projects**

## CI/CD Integration

### GitHub Actions

```yaml
name: Generate .NET API Documentation
on: [push, pull_request]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Generate OpenAPI Spec
        run: |
          wget https://raw.githubusercontent.com/CrazyBearier/autoGen_OpenAPI/main/dotnet-openapi-generator.js
          node dotnet-openapi-generator.js ./
      
      - name: Upload Documentation
        uses: actions/upload-artifact@v3
        with:
          name: dotnet-api-documentation
          path: swagger-output-*.json
```

### Azure DevOps

```yaml
trigger:
- main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: NodeTool@0
  inputs:
    versionSpec: '18.x'
  displayName: 'Install Node.js'

- script: |
    wget https://raw.githubusercontent.com/CrazyBearier/autoGen_OpenAPI/main/dotnet-openapi-generator.js
    node dotnet-openapi-generator.js ./
  displayName: 'Generate OpenAPI Documentation'

- task: PublishBuildArtifacts@1
  inputs:
    pathToPublish: 'swagger-output-*.json'
    artifactName: 'api-documentation'
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test with various .NET project structures
5. Submit a pull request

## License

MIT License - feel free to use in any project!

## Changelog

### v1.0.0 (2025-10-06)
- 🎉 Initial release
- ✅ Support for ASP.NET Core Web API Controllers
- ✅ Support for ASP.NET Core MVC Actions
- ✅ Support for .NET 6+ Minimal APIs
- 🔍 Recursive controller discovery
- 📊 HTTP attribute parsing
- 🎯 Route combination and parameter extraction
- ✅ Production tested with OrchardCore (239 endpoints) and Bitwarden (478 endpoints)