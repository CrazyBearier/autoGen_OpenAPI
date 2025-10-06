const fs = require('fs');
const path = require('path');

class DotNetOpenAPIGenerator {
  constructor(projectPath = './') {
    this.originalCwd = process.cwd();
    this.projectPath = path.resolve(projectPath);
    process.chdir(this.projectPath);
    
    console.log(`🎯 Analyzing .NET project: ${this.projectPath}`);
    
    this.projectType = this.detectProjectType();
    this.config = this.loadConfig();
  }

  detectProjectType() {
    const controllers = this.findControllers();
    const csprojFiles = this.findCsprojFiles();
    
    // Check for .NET project files
    if (fs.existsSync('./Program.cs') && this.hasMinimalAPIs('./Program.cs')) {
      return 'minimal-api';
    }
    
    if (controllers.length > 0) {
      return 'web-api';
    }
    
    if (csprojFiles.length > 0) {
      return 'dotnet-project';
    }
    
    return 'unknown';
  }

  hasMinimalAPIs(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return content.includes('app.Map') && 
             (content.includes('MapGet') || content.includes('MapPost') || 
              content.includes('MapPut') || content.includes('MapDelete'));
    } catch (e) {
      return false;
    }
  }

  findCsprojFiles() {
    const files = [];
    try {
      const items = fs.readdirSync('.', { withFileTypes: true });
      for (const item of items) {
        if (item.name.endsWith('.csproj')) {
          files.push(item.name);
        }
      }
    } catch (e) {
      // Skip
    }
    return files;
  }

  findControllers() {
    const controllers = [];
    
    const findControllersRecursive = (dir, maxDepth = 4, currentDepth = 0) => {
      if (currentDepth > maxDepth) return;
      
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory() && !item.name.startsWith('.') && 
              item.name !== 'node_modules' && item.name !== 'bin' && item.name !== 'obj') {
            findControllersRecursive(fullPath, maxDepth, currentDepth + 1);
          } else if (item.name.endsWith('Controller.cs')) {
            controllers.push(fullPath);
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    };
    
    findControllersRecursive('.');
    return controllers;
  }

  loadConfig() {
    // Try to load from appsettings.json
    let config = {
      info: {
        title: 'ASP.NET Core API',
        description: 'Auto-generated API documentation',
        version: '1.0.0'
      },
      host: 'localhost:5000',
      schemes: ['https', 'http'],
      basePath: '/api'
    };

    if (fs.existsSync('./appsettings.json')) {
      try {
        const appSettings = JSON.parse(fs.readFileSync('./appsettings.json', 'utf8'));
        if (appSettings.Swagger) {
          config.info.title = appSettings.Swagger.Title || config.info.title;
          config.info.description = appSettings.Swagger.Description || config.info.description;
          config.info.version = appSettings.Swagger.Version || config.info.version;
        }
      } catch (e) {
        // Use defaults
      }
    }

    return config;
  }

  generate() {
    console.log(`🔍 Detected: ${this.projectType}`);
    
    if (this.projectType === 'unknown') {
      console.log('❌ No .NET project detected');
      console.log('💡 Ensure your project has .csproj files, Controllers/, or Program.cs with Minimal APIs');
      return null;
    }
    
    const spec = {
      openapi: '3.0.0',
      info: this.config.info,
      servers: [{ url: `${this.config.schemes[0]}://${this.config.host}${this.config.basePath}` }],
      paths: {},
      components: { schemas: {} }
    };

    const files = this.getRouteFiles();
    console.log(`📁 Found ${files.length} route files`);

    files.forEach(file => {
      try {
        const routes = this.parseFile(file);
        Object.assign(spec.paths, routes);
      } catch (error) {
        console.warn(`⚠️  Could not parse ${file}: ${error.message}`);
      }
    });

    return spec;
  }

  getRouteFiles() {
    if (this.projectType === 'minimal-api') {
      return ['./Program.cs'];
    }
    
    if (this.projectType === 'web-api') {
      return this.findControllers();
    }
    
    if (this.projectType === 'dotnet-project') {
      const files = [];
      if (fs.existsSync('./Program.cs')) files.push('./Program.cs');
      files.push(...this.findControllers());
      return files;
    }
    
    return [];
  }

  parseFile(filePath) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.warn(`⚠️  Could not read ${filePath}: ${error.message}`);
      return {};
    }
    
    if (filePath.endsWith('Program.cs')) {
      return this.parseMinimalAPIs(content, filePath);
    } else if (filePath.endsWith('Controller.cs')) {
      return this.parseController(content, filePath);
    }
    
    return {};
  }

  parseMinimalAPIs(content, filePath) {
    const paths = {};
    
    // Minimal API patterns: app.MapGet("/api/users", ...)
    const apiRegex = /app\.Map(Get|Post|Put|Delete|Patch)\s*\(\s*["']([^"']*)["']\s*,/g;
    let match;
    
    while ((match = apiRegex.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      const routePath = match[2];
      
      let cleanPath = routePath;
      if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath;
      }
      
      // Convert {id} parameters
      cleanPath = cleanPath.replace(/\{([^}]+)\}/g, '{$1}');
      
      if (!paths[cleanPath]) {
        paths[cleanPath] = {};
      }
      
      paths[cleanPath][method] = {
        summary: `${method.toUpperCase()} ${cleanPath}`,
        parameters: this.extractParameters(cleanPath, content, match.index),
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Bad Request' },
          '404': { description: 'Not Found' },
          '500': { description: 'Internal Server Error' }
        }
      };
    }
    
    return paths;
  }

  parseController(content, filePath) {
    const paths = {};
    
    // Extract controller route prefix
    const routeMatch = content.match(/\[Route\s*\(\s*["']([^"']*)["']\s*\)\]/);
    const controllerRoute = routeMatch ? routeMatch[1] : '';
    
    // Extract HTTP attributed actions
    const httpActionRegex = /\[Http(Get|Post|Put|Delete|Patch)(?:\s*\(\s*["']([^"']*)["']\s*\))?\]\s*(?:.*\n)*?\s*public\s+.*?\s+(\w+)\s*\(/g;
    let match;
    
    while ((match = httpActionRegex.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      const actionRoute = match[2] || '';
      const actionName = match[3];
      
      this.addControllerRoute(paths, filePath, controllerRoute, actionRoute, actionName, method);
    }
    
    // Extract regular public actions (assume GET for MVC actions)
    const publicActionRegex = /public\s+(?:async\s+Task<)?(?:I?ActionResult|ViewResult|JsonResult|string)>?\s+(\w+)\s*\([^)]*\)/g;
    while ((match = publicActionRegex.exec(content)) !== null) {
      const actionName = match[1];
      
      // Skip if already processed with HTTP attribute
      const alreadyProcessed = Object.values(paths).some(pathMethods => 
        Object.values(pathMethods).some(methodInfo => 
          methodInfo.description && methodInfo.description.includes(`Action: ${actionName}`)
        )
      );
      
      if (!alreadyProcessed && !actionName.startsWith('_') && actionName !== 'Dispose') {
        this.addControllerRoute(paths, filePath, controllerRoute, actionName.toLowerCase(), actionName, 'get');
      }
    }
    
    return paths;
  }
  
  addControllerRoute(paths, filePath, controllerRoute, actionRoute, actionName, method) {
    // Combine controller and action routes
    let fullPath = this.combineRoutes(controllerRoute, actionRoute);
    
    // Replace [controller] placeholder
    const controllerName = path.basename(filePath, '.cs').replace('Controller', '').toLowerCase();
    fullPath = fullPath.replace('[controller]', controllerName);
    
    // If no explicit route, use controller/action pattern
    if (!fullPath || fullPath === '/') {
      fullPath = `/${controllerName}/${actionRoute || actionName.toLowerCase()}`;
    }
    
    // Convert {id} parameters
    fullPath = fullPath.replace(/\{([^}]+)\}/g, '{$1}');
    
    if (!fullPath.startsWith('/')) {
      fullPath = '/' + fullPath;
    }
    
    if (!paths[fullPath]) {
      paths[fullPath] = {};
    }
    
    paths[fullPath][method] = {
      summary: `${method.toUpperCase()} ${fullPath}`,
      description: `Action: ${actionName}`,
      parameters: this.extractControllerParameters(fullPath, '', 0),
      responses: {
        '200': { description: 'Success' },
        '400': { description: 'Bad Request' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Not Found' },
        '500': { description: 'Internal Server Error' }
      }
    };
  }

  combineRoutes(controllerRoute, actionRoute) {
    if (!controllerRoute && !actionRoute) return '/';
    if (!controllerRoute) return actionRoute;
    if (!actionRoute) return controllerRoute;
    
    const cleanController = controllerRoute.replace(/^\/+|\/+$/g, '');
    const cleanAction = actionRoute.replace(/^\/+|\/+$/g, '');
    
    return `/${cleanController}/${cleanAction}`;
  }

  extractParameters(cleanPath, content, matchIndex) {
    const parameters = [];
    
    // Path parameters
    const pathParams = cleanPath.match(/\{([^}]+)\}/g) || [];
    pathParams.forEach(param => {
      const name = param.slice(1, -1);
      parameters.push({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' }
      });
    });
    
    return parameters;
  }

  extractControllerParameters(cleanPath, content, matchIndex) {
    const parameters = [];
    
    // Path parameters
    const pathParams = cleanPath.match(/\{([^}]+)\}/g) || [];
    pathParams.forEach(param => {
      const name = param.slice(1, -1);
      parameters.push({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' }
      });
    });
    
    // Look for [FromQuery] parameters in method signature
    const methodSection = content.substring(matchIndex, matchIndex + 500);
    const queryParams = methodSection.match(/\[FromQuery\]\s*\w+\s+(\w+)/g) || [];
    queryParams.forEach(param => {
      const name = param.match(/(\w+)$/)[1];
      parameters.push({
        name,
        in: 'query',
        required: false,
        schema: { type: 'string' }
      });
    });
    
    return parameters;
  }

  save(outputPath = './swagger-output.json') {
    const spec = this.generate();
    
    process.chdir(this.originalCwd);
    
    if (!spec) {
      return null;
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2));
    console.log(`✅ OpenAPI spec generated: ${outputPath}`);
    console.log(`📊 Found ${Object.keys(spec.paths).length} endpoints`);
    return spec;
  }
}

// Run if called directly
if (require.main === module) {
  const projectPath = process.argv[2] || './';
  let outputPath = process.argv[3];
  
  console.log('🚀 .NET OpenAPI Generator');
  console.log('Usage: node dotnet-openapi-generator.js [project-path] [output-file]');
  console.log('');
  
  try {
    const generator = new DotNetOpenAPIGenerator(projectPath);
    
    if (!outputPath) {
      const projectName = path.basename(path.resolve(projectPath));
      const today = new Date().toISOString().split('T')[0];
      outputPath = `./swagger-output-${projectName}-dotnet-${today}.json`;
    }
    
    const result = generator.save(outputPath);
    if (!result) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = DotNetOpenAPIGenerator;