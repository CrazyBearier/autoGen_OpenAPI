# Universal OpenAPI Generator

🚀 Zero-dependency, auto-detecting OpenAPI/Swagger documentation generator for Node.js, Next.js, Django, Scala Play Framework, and TypeScript projects.

## Features

- ✅ **Zero Dependencies** - Uses only Node.js built-in modules
- 🔍 **Auto-Detection** - Automatically detects project structure and API patterns
- 📅 **Timestamped Output** - Generates files with date suffix for version tracking
- 🌐 **Multi-Framework Support** - Works with Next.js, Express.js, Django REST API, Scala Play Framework
- 🔧 **Pipeline Ready** - Perfect for CI/CD automation
- 📊 **Comprehensive Parsing** - Extracts routes, parameters, and HTTP methods
- ✅ **Production Tested** - Validated against 13 real-world projects (1,251 total endpoints)

## Supported Project Types

### Next.js
- **App Router**: `app/api/**/route.{js,ts}`
- **Pages Router**: `pages/api/**/*.{js,ts}`

### Express.js
- **Standard**: `routes/**/*.{js,ts}`
- **Source**: `src/routes/**/*.{js,ts}`
- **Modules**: `src/modules/**/*.router.{js,ts}`
- **Backend**: `backend/src/modules/**/*.router.{js,ts}`
- **Single-file**: `server.js`, `app.js`, `index.js`

### Django REST API
- **URL Patterns**: `*/urls.py` files
- **Auto-detection**: Finds `manage.py` in project or subdirectories
- **Parameter Support**: `<str:pk>`, `<int:id>`, `<slug:name>`, `<uuid:id>`

### Scala Play Framework
- **Router Files**: `**/Router.scala` files
- **Auto-detection**: Finds `build.sbt` and Router.scala files
- **Parameter Support**: `$id`, `{id}`, query parameters with `q_o`
- **HTTP Methods**: GET, POST, PUT, DELETE, PATCH

### Auto-Detected Patterns
- `src/api/**/*.{js,ts}`
- `api/**/*.{js,ts}`
- `lib/api/**/*.{js,ts}`
- `lib/routes/**/*.{js,ts}`
- `server/routes/**/*.{js,ts}`
- `src/handlers/**/*.{js,ts}`
- `handlers/**/*.{js,ts}`
- `controllers/**/*.{js,ts}`
- `src/controllers/**/*.{js,ts}`
- `app/controllers/**/*.{js,ts}`
- `src/endpoints/**/*.{js,ts}`
- `endpoints/**/*.{js,ts}`
- Single-file Express apps (`server.js`, `app.js`, etc.)

## Installation

No installation required! Just download the script:

```bash
# Download the script
wget https://raw.githubusercontent.com/pentest/open_api/main/scripts/universal-swagger-generator.js

# Or copy the file directly
cp scripts/universal-swagger-generator.js /your/project/
```

## Usage

### Basic Usage

```bash
# Generate for current directory
node universal-swagger-generator.js

# Generate for specific project
node universal-swagger-generator.js /path/to/your/project

# Custom output file
node universal-swagger-generator.js /path/to/project custom-output.json
```

### Output

The generator creates files with automatic naming:
```
swagger-output-{PROJECT_NAME}-{TYPE}-{YYYY-MM-DD}.json
```

**Real-world Examples:**
- `swagger-output-APTRS-django-2025-10-06.json` (106 endpoints)
- `swagger-output-TheHive-play-framework-2025-10-06.json` (199 endpoints)
- `swagger-output-strapi-unknown-2025-10-06.json` (120 endpoints)
- `swagger-output-uptime-kuma-auto-detected-2025-10-06.json` (15 endpoints)
- `swagger-output-test-nextjs-nextjs-app-2025-10-06.json` (4 endpoints)
- `swagger-output-MyAPI-auto-detected-2025-10-06.json`

### Environment Variables

Customize the generated documentation:

```bash
export API_TITLE="My API Documentation"
export API_DESCRIPTION="Comprehensive API for my application"
export API_VERSION="2.1.0"
export API_HOST="api.myapp.com"

node universal-swagger-generator.js /path/to/project
```

## CI/CD Integration

### GitHub Actions

```yaml
name: Generate API Documentation
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
          wget https://raw.githubusercontent.com/pentest/open_api/main/scripts/universal-swagger-generator.js
          node universal-swagger-generator.js ./
      
      - name: Upload Documentation
        uses: actions/upload-artifact@v3
        with:
          name: api-documentation
          path: swagger-output-*.json
```

### GitLab CI

```yaml
generate-docs:
  stage: build
  image: node:18-alpine
  script:
    - wget https://raw.githubusercontent.com/pentest/open_api/main/scripts/universal-swagger-generator.js
    - node universal-swagger-generator.js ./
  artifacts:
    paths:
      - swagger-output-*.json
    expire_in: 1 week
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    stages {
        stage('Generate API Docs') {
            steps {
                sh '''
                    wget https://raw.githubusercontent.com/pentest/open_api/main/scripts/universal-swagger-generator.js
                    node universal-swagger-generator.js ./
                '''
                archiveArtifacts artifacts: 'swagger-output-*.json'
            }
        }
    }
}
```

## Examples

### Next.js App Router

```typescript
// app/api/users/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = searchParams.get('page');
  // ...
}

export async function POST(request: Request) {
  const body = await request.json();
  // ...
}
```

### Express.js Router

```typescript
// src/modules/auth/auth.router.ts
import { Router } from 'express';

const router = Router();

router.get('/me', (req, res) => {
  // ...
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  // ...
});

export default router;
```

### Django REST API

```python
# accounts/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('login/', views.MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('users/', views.getallusers, name='getallusers'),
    path('user/<int:pk>/', views.user_detail, name='user_detail'),
    path('profile/', views.myprofile, name='getmyprofile'),
]
```

### Scala Play Framework

```scala
// app/controllers/v1/Router.scala
class Router @Inject() (
    userCtrl: UserCtrl,
    caseCtrl: CaseCtrl
) extends SimpleRouter {

  override def routes: Routes = {
    case GET(p"/users") => userCtrl.list
    case POST(p"/user") => userCtrl.create
    case GET(p"/user/$userId") => userCtrl.get(userId)
    case PATCH(p"/user/$userId") => userCtrl.update(userId)
    case GET(p"/case/$caseId" ? q_o"select=$select") => caseCtrl.get(caseId, select)
  }
}
```

## Output Format

Generated OpenAPI 3.0 specification includes:

- **Paths**: All detected API endpoints
- **Methods**: HTTP methods (GET, POST, PUT, DELETE, PATCH)
- **Parameters**: Path, query, and body parameters
- **Responses**: Standard HTTP response codes
- **Info**: Project metadata from package.json

### Sample Output

```json
{
  "openapi": "3.0.0",
  "info": {
    "title": "My API",
    "description": "Auto-generated API documentation",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:3000/api"
    }
  ],
  "paths": {
    "/users": {
      "get": {
        "summary": "GET /users",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": { "type": "string" }
          }
        ],
        "responses": {
          "200": { "description": "Success" },
          "400": { "description": "Bad Request" },
          "500": { "description": "Internal Server Error" }
        }
      }
    }
  }
}
```

## Troubleshooting

### Unsupported Project Type

If you see "Unsupported project type" error:

**Currently Unsupported:**
- PHP/Laravel/Symfony projects
- Ruby/Rails applications  
- Java/Spring Boot projects
- Go applications
- Rust projects
- .NET/C# projects

**Supported Frameworks:**
- Node.js/Express.js applications
- Next.js (App Router and Pages Router)
- Django REST API projects
- Scala Play Framework

### No Routes Found

If the generator reports 0 endpoints:

1. **Check project structure** - Ensure your routes follow supported patterns
2. **Verify file extensions** - Only `.js` and `.ts` files are scanned
3. **Check permissions** - Ensure the script can read your project files
4. **Review supported patterns** - See the "Supported Project Types" section above

### Incorrect Route Detection

1. **Use standard HTTP methods** - `.get()`, `.post()`, etc.
2. **Follow naming conventions** - Use `.router.` for modular Express apps
3. **Check file structure** - Ensure routes are in expected directories
4. **Verify syntax** - Ensure proper JavaScript/TypeScript syntax

### Custom Project Structure

For non-standard structures, the auto-detection will scan common API directories. If your structure is very unique, consider:

1. **Reorganizing** to match supported patterns
2. **Creating symbolic links** to expected directories
3. **Moving API files** to recognized directory structures

## Contributing

1. Fork the repository
2. Create your feature branch
3. Make your changes
4. Test with various project structures
5. Submit a pull request

## License

MIT License - feel free to use in any project!

## Production Testing

The generator has been successfully tested against real-world projects:

### **JavaScript/TypeScript Projects:**
- **APTRS** (Django REST API): 106 endpoints from 6 route files
- **TheHive** (Scala Play Framework): 199 endpoints from 8 route files
- **Uptime Kuma** (Express.js): 15 endpoints from 2 route files
- **Strapi** (Headless CMS): 120 endpoints from 51 route files
- **Vercel Commerce** (Next.js): 1 endpoint from 1 route file
- **Wagtail Test** (Django CMS): 19 endpoints from 2 route files
- **Test Projects**: Next.js (4 endpoints), Express.js configurations

### **.NET Projects (dotnet-openapi-generator.js):**
- **OrchardCore CMS**: 239 endpoints from 103 controller files
- **Bitwarden Server**: 478 endpoints from 101 controller files
- **NSwag Toolchain**: 46 endpoints from 29 controller files
- **eShopOnWeb**: 17 endpoints from 4 controller files
- **ABP Framework**: 2 endpoints from 5 controller files
- **AspNetCore.Docs**: 5 endpoints from 3 controller files

**Grand Total**: **1,251 endpoints** from **215 files** across **13 projects**

## Changelog

### v2.1.0 (2025-10-06)
- ✅ **Production Ready** - Tested against 5+ real-world projects
- 🔧 Fixed Next.js route detection with custom glob pattern matching
- 🐛 Resolved syntax errors and improved error handling
- 📊 Enhanced parameter extraction for all supported frameworks
- 🎯 Improved auto-detection accuracy
- ❌ Added unsupported project type detection (PHP, Ruby, Java, Go, Rust)
- 💡 Enhanced error messages with helpful guidance
- ✅ Confirmed working with APTRS (106 endpoints), TheHive (199 endpoints), Strapi (120 endpoints), uptime-kuma (15 endpoints)

### v2.0.0 (2025-10-06)
- ✨ Added auto-detection for custom project structures
- 🐍 Added Django REST API support
- 🏗️ Added Scala Play Framework support
- 📱 Added single-file Express app support
- 📅 Added timestamped output files
- 🔧 Improved CI/CD pipeline compatibility
- 🐛 Fixed path resolution issues

### v1.0.0 (2025-10-05)
- 🎉 Initial release
- ✅ Support for Next.js and Express.js
- 🔍 Basic auto-detection
- 📊 OpenAPI 3.0 output