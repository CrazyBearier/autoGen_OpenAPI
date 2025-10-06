const fs = require('fs');
const path = require('path');

class UniversalSwaggerGenerator {
  constructor(projectPath = './') {
    this.originalCwd = process.cwd();
    this.projectPath = path.resolve(projectPath);
    process.chdir(this.projectPath);
    
    console.log(`🎯 Analyzing project: ${this.projectPath}`);
    
    this.projectType = this.detectProjectType();
    this.config = this.loadConfig();
  }

  detectProjectType() {
    // Check for unsupported project types first
    if (this.isUnsupportedProject()) {
      return 'unsupported';
    }
    
    if (this.hasStrapiProject()) return 'strapi';
    if (this.hasPlayFrameworkProject()) return 'play-framework';
    if (this.hasDjangoProject()) return 'django';
    if (fs.existsSync('./app/api')) return 'nextjs-app';
    if (fs.existsSync('./pages/api')) return 'nextjs-pages';
    if (fs.existsSync('./routes')) return 'express';
    if (fs.existsSync('./src/routes')) return 'express-src';
    if (fs.existsSync('./src/modules') && this.hasRouterFiles('./src/modules')) return 'express-modules';
    if (fs.existsSync('./backend/src/modules') && this.hasRouterFiles('./backend/src/modules')) return 'express-backend-modules';
    
    const patterns = this.scanForRoutePatterns();
    if (patterns.length > 0) {
      this.customPatterns = patterns;
      return 'auto-detected';
    }
    
    return 'unknown';
  }

  hasStrapiProject() {
    // Check for Strapi monorepo structure
    if (fs.existsSync('./packages/core') && fs.existsSync('./lerna.json')) {
      return true;
    }
    
    // Check for Strapi app structure
    if (fs.existsSync('./config/server.js') || fs.existsSync('./config/server.ts')) {
      return true;
    }
    
    // Check package.json for Strapi dependencies
    if (fs.existsSync('./package.json')) {
      try {
        const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
        if (pkg.dependencies && (pkg.dependencies['@strapi/strapi'] || pkg.dependencies['strapi'])) {
          return true;
        }
      } catch (e) {
        // Skip invalid package.json
      }
    }
    
    return false;
  }

  isUnsupportedProject() {
    // Check for PHP projects
    const phpFiles = this.findJSFiles('.').filter(f => f.endsWith('.php'));
    if (phpFiles.length > 5) {
      this.unsupportedType = 'PHP';
      return true;
    }
    
    // Check for other unsupported types
    if (fs.existsSync('./composer.json')) {
      this.unsupportedType = 'PHP/Composer';
      return true;
    }
    
    if (fs.existsSync('./Gemfile')) {
      this.unsupportedType = 'Ruby/Rails';
      return true;
    }
    
    if (fs.existsSync('./pom.xml') || fs.existsSync('./build.gradle')) {
      this.unsupportedType = 'Java/Spring';
      return true;
    }
    
    if (fs.existsSync('./Cargo.toml')) {
      this.unsupportedType = 'Rust';
      return true;
    }
    
    if (fs.existsSync('./go.mod')) {
      this.unsupportedType = 'Go';
      return true;
    }
    
    return false;
  }

  scanForRoutePatterns() {
    const patterns = [];
    const commonPaths = [
      'src/api', 'api', 'lib/api', 'lib/routes', 'server/routes', 'server/routers',
      'src/handlers', 'handlers', 'controllers', 'src/controllers',
      'app/controllers', 'src/endpoints', 'endpoints'
    ];
    
    const singleFiles = ['server.js', 'app.js', 'index.js', 'main.js'];
    for (const file of singleFiles) {
      if (fs.existsSync(`./${file}`)) {
        try {
          const content = fs.readFileSync(`./${file}`, 'utf8');
          if (content.includes('app.get') || content.includes('app.post') || 
              content.includes('router.get') || content.includes('router.post')) {
            patterns.push(file);
          }
        } catch (e) {
          // Skip files we can't read
        }
      }
    }
    
    for (const basePath of commonPaths) {
      if (fs.existsSync(`./${basePath}`)) {
        const files = this.findJSFiles(`./${basePath}`);
        if (files.length > 0) {
          const routerFiles = files.filter(file => {
            try {
              const content = fs.readFileSync(file, 'utf8');
              return content.includes('router.') || content.includes('app.') || 
                     content.includes('Router()') || file.includes('router');
            } catch (e) {
              return false;
            }
          });
          if (routerFiles.length > 0) {
            patterns.push(...routerFiles);
          }
        }
      }
    }
    
    return patterns;
  }

  hasPlayFrameworkProject() {
    if (fs.existsSync('./build.sbt')) {
      const findRouters = (dir) => {
        try {
          const items = fs.readdirSync(dir, { withFileTypes: true });
          for (const item of items) {
            const fullPath = path.join(dir, item.name);
            if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
              if (findRouters(fullPath)) return true;
            } else if (item.name.endsWith('Router.scala')) {
              return true;
            }
          }
        } catch (e) {
          // Skip directories we can't read
        }
        return false;
      };
      
      return findRouters('.');
    }
    return false;
  }

  findJSFiles(dir) {
    const files = [];
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
          files.push(...this.findJSFiles(fullPath));
        } else if (item.name.endsWith('.js') || item.name.endsWith('.ts') || item.name.endsWith('.php')) {
          files.push(fullPath);
        }
      }
    } catch (e) {
      // Skip directories we can't read
    }
    return files;
  }

  hasDjangoProject() {
    if (fs.existsSync('./manage.py')) return true;
    
    try {
      const items = fs.readdirSync('.', { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          const managePath = path.join(item.name, 'manage.py');
          if (fs.existsSync(managePath)) {
            this.djangoRoot = item.name;
            return true;
          }
        }
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  hasRouterFiles(dir) {
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
          const subDir = path.join(dir, item.name);
          const files = fs.readdirSync(subDir);
          if (files.some(f => f.includes('.router.') && (f.endsWith('.ts') || f.endsWith('.js')))) {
            return true;
          }
        }
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  loadConfig() {
    const packageJson = fs.existsSync('./package.json') 
      ? JSON.parse(fs.readFileSync('./package.json', 'utf8'))
      : {};

    return {
      info: {
        title: process.env.API_TITLE || packageJson.name || 'API Documentation',
        description: process.env.API_DESCRIPTION || packageJson.description || 'Auto-generated API documentation',
        version: process.env.API_VERSION || packageJson.version || '1.0.0'
      },
      host: process.env.API_HOST || 'localhost:3000',
      schemes: ['http'],
      basePath: '/api'
    };
  }

  getRouteFiles() {
    if (this.projectType === 'express-modules') {
      return this.findRouterFiles('./src/modules');
    }
    if (this.projectType === 'express-backend-modules') {
      return this.findRouterFiles('./backend/src/modules');
    }
    if (this.projectType === 'django') {
      return this.findDjangoUrls();
    }
    if (this.projectType === 'play-framework') {
      return this.findPlayFrameworkRouters();
    }
    if (this.projectType === 'strapi') {
      return this.findStrapiRoutes();
    }
    if (this.projectType === 'auto-detected') {
      let allFiles = [];
      for (const pattern of this.customPatterns) {
        if (pattern.endsWith('.js') || pattern.endsWith('.ts')) {
          if (pattern.startsWith('./')) {
            allFiles.push(pattern);
          } else {
            allFiles.push(`./${pattern}`);
          }
        } else {
          allFiles.push(...this.glob(`./${pattern}`));
        }
      }
      return allFiles;
    }
    
    const patterns = {
      'nextjs-app': './app/api/**/route.{ts,js}',
      'nextjs-pages': './pages/api/**/*.{ts,js}',
      'express': './routes/**/*.{ts,js}',
      'express-src': './src/routes/**/*.{ts,js}',
      'express-server-routers': './server/routers/**/*.{ts,js}',
      'strapi': './packages/**/server/routes/**/*.{ts,js}'
    };

    const pattern = patterns[this.projectType];
    if (!pattern) {
      console.log('❌ Unsupported project type');
      return [];
    }

    return this.glob(pattern);
  }

  glob(pattern) {
    const files = [];
    const basePath = pattern.split('*')[0];
    
    if (!fs.existsSync(basePath)) {
      return files;
    }

    const traverse = (dir) => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            traverse(fullPath);
          } else if (this.matchesPattern(fullPath, pattern)) {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    };

    traverse(basePath);
    return files;
  }

  matchesPattern(filePath, pattern) {
    // Simple approach for Next.js routes
    if (pattern.includes('route.{ts,js}')) {
      const isInAppApi = filePath.includes('app/api') || filePath.includes('app\\api');
      const isRouteFile = filePath.endsWith('route.ts') || filePath.endsWith('route.js');
      return isInAppApi && isRouteFile;
    }
    
    // Handle other patterns
    let regex = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\{([^}]+)\}/g, (match, group) => `(${group.replace(/,/g, '|')})`)
      .replace(/\./g, '\\.');
    
    return new RegExp(`^${regex}$`).test(filePath);
  }

  generate() {
    console.log(`🔍 Detected: ${this.projectType}`);
    
    if (this.projectType === 'unsupported') {
      console.log(`❌ Unsupported project type: ${this.unsupportedType}`);
      console.log('💡 This generator supports: Node.js, Next.js, Express.js, Django REST API, Scala Play Framework');
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

    if (files.length === 0 && this.projectType === 'unknown') {
      console.log('💡 No API routes found. Ensure your project follows supported patterns:');
      console.log('   - Next.js: app/api/**/route.{js,ts} or pages/api/**/*.{js,ts}');
      console.log('   - Express: routes/**/*.{js,ts} or src/routes/**/*.{js,ts}');
      console.log('   - Django: */urls.py files with manage.py');
      console.log('   - Play Framework: **/Router.scala files');
    }

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

  parseFile(filePath) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.warn(`⚠️  Could not read ${filePath}: ${error.message}`);
      return {};
    }
    
    const basePath = this.getRoutePath(filePath);
    const allPaths = {};

    const httpMethods = ['get', 'post', 'put', 'delete', 'patch'];
    
    // Next.js API routes
    httpMethods.forEach(method => {
      const regex = new RegExp(`export\\s+async\\s+function\\s+${method.toUpperCase()}`, 'i');
      if (regex.test(content)) {
        if (!allPaths[basePath]) allPaths[basePath] = {};
        allPaths[basePath][method] = this.parseMethod(content, method);
      }
    });

    // Express router methods
    httpMethods.forEach(method => {
      const routerRegex = new RegExp(`\\.${method}\\s*\\(['"]([^'"]*)['"]`, 'g');
      let match;
      while ((match = routerRegex.exec(content)) !== null) {
        const endpoint = match[1];
        const fullPath = this.combineRouterPath(basePath, endpoint);
        if (!allPaths[fullPath]) allPaths[fullPath] = {};
        allPaths[fullPath][method] = this.parseExpressMethod(content, method, endpoint);
      }
    });
    
    // Express app methods
    httpMethods.forEach(method => {
      const appRegex = new RegExp(`app\\.${method}\\s*\\(['"]([^'"]*)['"]`, 'g');
      let match;
      while ((match = appRegex.exec(content)) !== null) {
        const endpoint = match[1];
        if (!allPaths[endpoint]) allPaths[endpoint] = {};
        allPaths[endpoint][method] = this.parseExpressMethod(content, method, endpoint);
      }
    });
    
    // Django URL patterns
    if (filePath.endsWith('urls.py')) {
      const djangoPaths = this.parseDjangoUrls(content, filePath);
      Object.assign(allPaths, djangoPaths);
    }
    
    // Scala Play Framework routes
    if (filePath.endsWith('Router.scala')) {
      const playPaths = this.parsePlayFrameworkRoutes(content, filePath);
      Object.assign(allPaths, playPaths);
    }
    
    // Strapi routes
    if (filePath.includes('/routes/') && (filePath.endsWith('.js') || filePath.endsWith('.ts'))) {
      const strapiPaths = this.parseStrapiRoutes(content, filePath);
      Object.assign(allPaths, strapiPaths);
    }

    return allPaths;
  }

  getRoutePath(filePath) {
    let routePath = filePath;
    
    routePath = routePath.replace(/^\.\/app\/api/, '');
    routePath = routePath.replace(/^\.\/pages\/api/, '');
    routePath = routePath.replace(/^\.\/routes/, '');
    routePath = routePath.replace(/^\.\/src\/routes/, '');
    routePath = routePath.replace(/^\.\/src\/modules/, '');
    routePath = routePath.replace(/^\.\/backend\/src\/modules/, '');
    
    routePath = routePath.replace(/\/route\.(ts|js)$/, '');
    routePath = routePath.replace(/\.router\.(ts|js)$/, '');
    routePath = routePath.replace(/\.(ts|js)$/, '');
    
    routePath = routePath.replace(/\[([^\]]+)\]/g, '{$1}');
    
    return routePath || '/';
  }

  parseMethod(content, method) {
    const parameters = [];
    
    const queryParams = content.match(/searchParams\.get\(['"`]([^'"`]+)['"`]\)/g) || [];
    queryParams.forEach(param => {
      const name = param.match(/['"`]([^'"`]+)['"`]/)[1];
      parameters.push({
        name,
        in: 'query',
        required: content.includes(`!${name}`),
        schema: { type: 'string' }
      });
    });

    if (content.includes('request.json()') || content.includes('req.body')) {
      parameters.push({
        name: 'body',
        in: 'body',
        required: true,
        schema: { type: 'object' }
      });
    }

    return {
      summary: `${method.toUpperCase()} operation`,
      parameters,
      responses: {
        '200': { description: 'Success' },
        '400': { description: 'Bad Request' },
        '500': { description: 'Internal Server Error' }
      }
    };
  }

  findRouterFiles(baseDir) {
    const files = [];
    
    if (!fs.existsSync(baseDir)) {
      return files;
    }

    const traverse = (dir) => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            traverse(fullPath);
          } else if (item.name.includes('.router.') && (item.name.endsWith('.ts') || item.name.endsWith('.js'))) {
            files.push(fullPath);
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    };

    traverse(baseDir);
    return files;
  }

  findDjangoUrls() {
    const urlFiles = [];
    const searchDir = this.djangoRoot || '.';
    
    const traverse = (dir) => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory() && !item.name.startsWith('.') && item.name !== '__pycache__') {
            traverse(fullPath);
          } else if (item.name === 'urls.py') {
            urlFiles.push(fullPath);
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    };
    
    traverse(searchDir);
    return urlFiles;
  }

  combineRouterPath(basePath, endpoint) {
    let cleanBase = basePath.replace(/^\/$/, '');
    
    const pathParts = cleanBase.split('/');
    if (pathParts.length >= 2 && pathParts[pathParts.length - 1] === pathParts[pathParts.length - 2]) {
      pathParts.pop();
      cleanBase = pathParts.join('/');
    }
    
    const cleanEndpoint = endpoint.replace(/^\/$/, '');
    const result = `${cleanBase}${cleanEndpoint ? '/' + cleanEndpoint : ''}`;
    
    return result.replace(/\/+/g, '/').replace(/^\/$/, '') || '/';
  }

  parseExpressMethod(content, method, endpoint) {
    const parameters = [];
    
    const pathParams = endpoint.match(/:([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
    pathParams.forEach(param => {
      const name = param.substring(1);
      parameters.push({
        name,
        in: 'path',
        required: true,
        schema: { type: 'string' }
      });
    });

    const queryParams = content.match(/req\.query\.([a-zA-Z_][a-zA-Z0-9_]*)/g) || [];
    queryParams.forEach(param => {
      const name = param.split('.')[2];
      if (!parameters.find(p => p.name === name)) {
        parameters.push({
          name,
          in: 'query',
          required: false,
          schema: { type: 'string' }
        });
      }
    });

    if (content.includes('req.body') && ['post', 'put', 'patch'].includes(method)) {
      parameters.push({
        name: 'body',
        in: 'body',
        required: true,
        schema: { type: 'object' }
      });
    }

    return {
      summary: `${method.toUpperCase()} ${endpoint || '/'}`,
      parameters,
      responses: {
        '200': { description: 'Success' },
        '400': { description: 'Bad Request' },
        '401': { description: 'Unauthorized' },
        '404': { description: 'Not Found' },
        '500': { description: 'Internal Server Error' }
      }
    };
  }

  parseDjangoUrls(content, filePath) {
    const paths = {};
    
    const pathRegex = /path\s*\(\s*['"]([^'"]*)['"]\s*,\s*([^,)]+)/g;
    let match;
    
    while ((match = pathRegex.exec(content)) !== null) {
      const urlPattern = match[1];
      const viewName = match[2].trim();
      
      let cleanPath = '/' + urlPattern.replace(/\/$/, '');
      if (cleanPath === '/') cleanPath = '/';
      
      cleanPath = cleanPath.replace(/<str:([^>]+)>/g, '{$1}');
      cleanPath = cleanPath.replace(/<int:([^>]+)>/g, '{$1}');
      cleanPath = cleanPath.replace(/<slug:([^>]+)>/g, '{$1}');
      cleanPath = cleanPath.replace(/<uuid:([^>]+)>/g, '{$1}');
      
      if (!paths[cleanPath]) {
        paths[cleanPath] = {};
      }
      
      const methods = ['get', 'post', 'put', 'patch', 'delete'];
      methods.forEach(method => {
        paths[cleanPath][method] = {
          summary: `${method.toUpperCase()} ${cleanPath}`,
          parameters: this.extractDjangoParameters(cleanPath),
          responses: {
            '200': { description: 'Success' },
            '400': { description: 'Bad Request' },
            '401': { description: 'Unauthorized' },
            '403': { description: 'Forbidden' },
            '404': { description: 'Not Found' },
            '500': { description: 'Internal Server Error' }
          }
        };
      });
    }
    
    return paths;
  }
  
  extractDjangoParameters(cleanPath) {
    const parameters = [];
    
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

  findPlayFrameworkRouters() {
    const routerFiles = [];
    
    const findRouters = (dir) => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
            findRouters(fullPath);
          } else if (item.name.endsWith('Router.scala')) {
            routerFiles.push(fullPath);
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    };
    
    findRouters('.');
    return routerFiles;
  }

  parsePlayFrameworkRoutes(content, filePath) {
    const paths = {};
    
    const routeRegex = /case\s+(GET|POST|PUT|DELETE|PATCH)\s*\(\s*p"([^"]+)"\s*\)\s*=>\s*([^\n]+)/g;
    let match;
    
    while ((match = routeRegex.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      const pathPattern = match[2];
      const controller = match[3].trim();
      
      let cleanPath = pathPattern
        .replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}')
        .replace(/\/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, '/{$1}');
      
      if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath;
      }
      
      if (!paths[cleanPath]) {
        paths[cleanPath] = {};
      }
      
      paths[cleanPath][method] = {
        summary: `${method.toUpperCase()} ${cleanPath}`,
        parameters: this.extractPlayFrameworkParameters(cleanPath, pathPattern),
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not Found' },
          '500': { description: 'Internal Server Error' }
        }
      };
    }
    
    return paths;
  }
  
  extractPlayFrameworkParameters(cleanPath, originalPattern) {
    const parameters = [];
    
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
    
    const queryParams = originalPattern.match(/\?\s*q_o"([^"]+)=\$([^"]+)"/g) || [];
    queryParams.forEach(param => {
      const matches = param.match(/q_o"([^"]+)=\$([^"]+)"/);
      if (matches) {
        const name = matches[1];
        parameters.push({
          name,
          in: 'query',
          required: false,
          schema: { type: 'string' }
        });
      }
    });
    
    return parameters;
  }

  findStrapiRoutes() {
    const routeFiles = [];
    
    // Search in packages for server/routes directories
    const searchPaths = [
      './packages',
      './src/api',
      './api',
      './server/routes',
      './src/routes'
    ];
    
    const findRoutes = (dir) => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fullPath = path.join(dir, item.name);
          if (item.isDirectory()) {
            // Look for server/routes directories
            if (item.name === 'routes' && dir.includes('server')) {
              const routeItems = fs.readdirSync(fullPath, { withFileTypes: true });
              for (const routeItem of routeItems) {
                if (routeItem.name.endsWith('.js') || routeItem.name.endsWith('.ts')) {
                  routeFiles.push(path.join(fullPath, routeItem.name));
                }
              }
            } else if (!item.name.startsWith('.') && item.name !== 'node_modules') {
              findRoutes(fullPath);
            }
          }
        }
      } catch (e) {
        // Skip directories we can't read
      }
    };
    
    for (const searchPath of searchPaths) {
      if (fs.existsSync(searchPath)) {
        findRoutes(searchPath);
      }
    }
    
    return routeFiles;
  }

  parseStrapiRoutes(content, filePath) {
    const paths = {};
    
    // Strapi route object patterns
    const routeObjectRegex = /\{\s*method:\s*['"]([^'"]*)['"]\s*,\s*path:\s*['"]([^'"]*)['"]\s*,\s*handler:\s*['"]([^'"]*)['"][^}]*\}/g;
    let match;
    
    while ((match = routeObjectRegex.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      const routePath = match[2];
      const handler = match[3];
      
      let cleanPath = routePath;
      if (!cleanPath.startsWith('/')) {
        cleanPath = '/' + cleanPath;
      }
      
      // Convert Strapi parameters :provider to OpenAPI {provider}
      cleanPath = cleanPath.replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, '{$1}');
      // Handle regex patterns like /(.*)
      cleanPath = cleanPath.replace(/\(\.[*+]\)/g, '{path}');
      
      if (!paths[cleanPath]) {
        paths[cleanPath] = {};
      }
      
      paths[cleanPath][method] = {
        summary: `${method.toUpperCase()} ${cleanPath}`,
        description: `Handler: ${handler}`,
        parameters: this.extractStrapiParameters(cleanPath, routePath),
        responses: {
          '200': { description: 'Success' },
          '400': { description: 'Bad Request' },
          '401': { description: 'Unauthorized' },
          '403': { description: 'Forbidden' },
          '404': { description: 'Not Found' },
          '500': { description: 'Internal Server Error' }
        }
      };
    }
    
    return paths;
  }
  
  extractStrapiParameters(cleanPath, originalPath) {
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
  
  console.log('🚀 Universal OpenAPI Generator');
  console.log('Usage: node universal-swagger-generator.js [project-path] [output-file]');
  console.log('');
  
  try {
    const generator = new UniversalSwaggerGenerator(projectPath);
    
    if (!outputPath) {
      const projectName = path.basename(path.resolve(projectPath));
      let folderType = '';
      
      if (generator.projectType === 'express-backend-modules') {
        folderType = 'backend';
      } else if (generator.projectType === 'nextjs-app' || generator.projectType === 'nextjs-pages') {
        folderType = 'frontend';
      } else if (generator.projectType === 'express' || generator.projectType === 'express-src' || generator.projectType === 'express-server-routers') {
        folderType = 'api';
      } else if (generator.projectType === 'django') {
        folderType = 'api';
      } else if (generator.projectType === 'play-framework') {
        folderType = 'api';
      } else {
        folderType = 'unknown';
      }
      
      const today = new Date().toISOString().split('T')[0];
      outputPath = `./swagger-output-${projectName}-${folderType}-${today}.json`;
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

module.exports = UniversalSwaggerGenerator;