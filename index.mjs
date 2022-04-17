import pug from 'pug'
import { resolve, dirname } from 'path'
import { makeFilter, arrIfDeps, clone } from './utils/index.mjs'
import {fileURLToPath} from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compile = pug.compile;
const compileClientWithDependenciesTracked = pug.compileClientWithDependenciesTracked;

// used pug options, note this list does not include 'cache' and 'name'
const PUGPROPS = [
  'basedir',
  'compileDebug',
  'debug',
  'doctype',
  'filters',
  'globals',
  'inlineRuntimeFunctions',
  'pretty',
  'self',
]

/**
 * Retuns a deep copy of the properties filtered by an allowed keywords list
 */
const clonePugOpts = (opts, filename)=>{
  return PUGPROPS.reduce((o, p) => {
    if (p in opts) {
      o[p] = clone(opts[p])
      o[p] = Object.assign(opts[p])
    }
    return o
  }, { filename })
}
const RE_IMPORTS = /^([ \t]*-)[ \t]*(import[ \t*{'"].*)/gm
/**
 * Adds an import directive to the collected imports.
 *
 * @param code Procesing code
 * @param imports Collected imports
 */
const moveImports = (code, imports)=>{
  return code.replace(RE_IMPORTS, function (_, indent, imprt) {
    imprt = imprt.trim()
    if (imprt.slice(-1) !== ';') {
      imprt += ';'
    }
    imports.push(imprt)
    return indent   // keep only the indentation
  })
}
const parseOptions = (options)=>{
  options = options || {}

  // Get runtimeImport & pugRuntime values
  let runtimeImport
  let pugRuntime = options.inlineRuntimeFunctions ? false : options.pugRuntime

  if (pugRuntime === false) {
    runtimeImport = ''
    pugRuntime = ''

  } else if (typeof pugRuntime != 'string') {
    runtimeImport = '\0pug-runtime'
    pugRuntime = resolve(__dirname, 'runtime.es.js')

  } else {
    runtimeImport = pugRuntime
    pugRuntime = ''
  }

  // v1.0.3 add default globals to the user defined set
  const globals = [
    'Array',
    'Boolean',
    'Date',
    'Function',
    'Math',
    'Number',
    'Object',
    'Promise',
    'RegExp',
    'String',
    'Symbol',
  ]

  // Merge the user globals with the predefined ones
  if (options.globals && Array.isArray(options.globals)) {
    options.globals.forEach((g) => {
      if (globals.indexOf(g) < 0) {
        globals.push(g)
      }
    })
  }

  let basedir = options.basedir
  if (basedir) {
    basedir = resolve(basedir)
  }

  // Shallow copy of user options & defaults
  return {
    doctype: 'html',
    compileDebug: false,
    staticPattern: /\.static\.(?:pug|jade)$/,
    inlineRuntimeFunctions: false,
    locals: {},
    ...options,
    basedir,
    globals,
    _runtimeImport: runtimeImport,
    pugRuntime,
    sourceMap: options.sourceMap !== false,
  }
}


//#region Plugin -------------------------------------------------------------

const pugPlugin = (options)=>{

  // prepare extensions to match with the extname() result
  const filter = makeFilter(options, ['.pug', '.jade'])

  // Shallow copy of user options & defaults
  const config = parseOptions(options)

  /** Is this a static file? */
  function matchStaticPattern (file) {
    return config.staticPattern && config.staticPattern.test(file)
  }

  return {

    name: 'rollup-plugin-jg-pug',

    options (opts) {
      if (!config.basedir) {
        const basedir = opts.input

        // istanbul ignore else
        if (basedir && typeof basedir == 'string') {
          config.basedir = dirname(resolve(basedir))
        } else {
          config.basedir = resolve('.')
        }
      }
    },

    /**
     * Avoid the inclusion of the runtime
     * @param id
     */
    resolveId (id) {
      return id === config._runtimeImport && config.pugRuntime || null
    },

    transform (code, id) {
      if (!filter(id)) {
        return null
      }

      const isStatic = matchStaticPattern(id)
      const pugOpts = clonePugOpts(config, id)

      let body, map, fn;

      if (isStatic) {
        /*
          This template is executed now and, at runtime, will be loaded through
          `import` so it will not have access to runtime variables or methods.
          Instead, we use here the `local` variables and the compile-time options.
        */
        const staticOpts = { ...config.locals, ...config, filename: id }

        fn = compile(code, pugOpts)
        body = fn(staticOpts)
        body = `export default ${JSON.stringify(body)};\n`

      } else {
        /*
          This template will generate a module with a function to be executed at
          runtime. It will be user responsibility to pass the correct parameters
          to the function, here we only take care of the `imports`, incluiding the
          pug runtime.
        */
        const imports = []

        if (config.sourceMap) {
          // TODO: Fix Sourcemaps
          // pugOpts.compileDebug = map = true
        }

        // move the imports from the template to the top of the output queue
        code = moveImports(code, imports)

        // get function body and dependencies
        fn = compileClientWithDependenciesTracked(code, pugOpts)
        body = fn.body.replace('function template(', '\nexport default function(')

        // put the pung-runtime import as the first of the queue, if neccesary
        if (config._runtimeImport && /\bpug\./.test(body)) {
          imports.unshift(`import pug from '${config._runtimeImport}';`)
        }

        // convert imports into string and add the template function
        body = imports.join('\n') + `${body};\n`
      }

      const dependencies = arrIfDeps(fn.dependencies)

      if (map) {
        console.error("Map is out of date and needs reimplemented");
      }

      return { code, map, dependencies }
    },
  }
}


export default pugPlugin;
//#endregion
