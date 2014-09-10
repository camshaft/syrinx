/**
 * Expose the Syrinx contstructor
 */

module.exports = exports = Syrinx;

/**
 * Create a property on function to annotate dependencies
 */

var KEY = exports.DEPENDENCY_PROPERTY = '__syrinx_dependencies';

/**
 * Create a Syrinx container
 *
 * @param {String?} name
 */

function Syrinx(name) {
  if (!(this instanceof Syrinx)) return new Syrinx(name);
  this._name = name;
  this._modules = {};
  this._message = name ?
    ' in container "' + this._name + '"' :
    '';
}

/**
 * Register a module and its dependencies
 *
 * @param {String} name
 * @param {Array|Function} deps
 * @param {Function} fn
 * @return {Container}
 */

Syrinx.prototype.register = function(name, deps, fn) {
  if (typeof name === 'function') {
    fn = name;
    name = fn.name || fn;
    deps = fn[KEY] || [];
  }
  if (typeof deps === 'function') {
    fn = deps;
    deps = fn[KEY] || [];
  }
  if (this._modules[name]) console.warn('overriding "' + name + '"' + this._message);
  this._modules[name] = {
    fn: fn,
    deps: deps || []
  };
  return this;
};

/**
 * Resolve a module or an array of modules
 *
 * @param {String|Array} deps
 * @param {Module}
 */

Syrinx.prototype.get = function(deps) {
  var self = this;
  if (!Array.isArray(deps)) return self._lookup(deps, '', fn);

  return deps.reduce(function(acc, dep) {
    acc[dep] = self._lookup(dep, '', fn);
    return acc;
  }, {});

  function fn(mod, args) {
    var val = mod.value = mod.fn.apply(null, args);
    mod.isLoaded = true;
    return val
  }
};

/**
 * Lazily load a module and its dependencies
 *
 * @param {String} name
 * @param {String} parent
 * @param {Function} fn
 * @return {Module}
 * @api private
 */

Syrinx.prototype._lookup = function(name, parent, fn) {
  var self = this;
  var dep = typeof name === 'function' ?
    self._lookupByReference(name) :
    self._modules[name];
  name = name.name || name;

  if (!dep) {
    var str = 'Missing' +
          (parent ? ' "' + parent + '"\'s' : '') +
          ' dependency "' + name + '"' + self._message;
    var err = new Error(str);
    err.parent = parent;
    err.module = name;
    throw err;
  }

  if (dep.isLoaded || dep.isValid) return dep.value;

  var args = dep.deps.map(function(depName) {
    return self._lookup(depName, name, fn);
  });

  return fn && fn(dep, args);
};

/**
 * Lookup a module by the reference of the function
 *
 * @param {Function} fn
 * @return {Module}
 * @api public
 */

Syrinx.prototype._lookupByReference = function(fn) {
  var mods = this._modules;
  for (var name in mods) {
    var mod = mods[name];
    if (mod.fn === fn) return mod;
  }
};

/**
 * Create an accessor function for read-only access
 *
 * @return {Function}
 */

Syrinx.prototype.accessor = function() {
  var self = this;
  return function() {
    self.get.apply(self, arguments);
  };
};

/**
 * Validates the dependency graph is complete and not cyclical
 */

Syrinx.prototype.validate = function() {
  var self = this;
  var mods = self._modules;
  var circular = [];
  var resolved = {};
  var unresolved = {};
  Object.keys(mods).forEach(function(name) {
    resolve(name, mods, circular, resolved, unresolved);
  });

  var errors = circular.length ?
    circular.map(format) :
    Object.keys(mods).reduce(lookup, []);

  if (errors.length) {
    var err = new Error(errors.map(function(err) {return err.message}).join('\n\t'));
    err.errors = errors;
    throw err;
  }

  return true;

  /**
   * Format a cyclical error
   */

  function format(path) {
    var err = new Error('Cyclical dependencies detected' + self._message + ': ' + path.join(' -> '));
    err.module = path[0];
    err.path = path;
    return err;
  }

  /**
   * Catch a lookup error
   */

  function lookup(acc, name) {
    try {
      self._lookup(name);
    } catch (err) {
      acc.push(err);
    };
    return acc;
  }
};

exports.dependency = function(mod, dep) {
  var deps = mod[KEY] = mod[KEY] || [];
  if (!Array.isArray) dep = [dep];
  deps.push.apply(deps, dep);
  return exports;
};

/**
 * Searches for a packages being used more than once without its
 * dependencies resolved
 *
 * @param {String} name
 * @param {Object} mods
 * @param {Object} circular
 * @param {Object} resolved
 * @param {Object} unresolved
 * @api private
 */

function resolve(name, mods, circular, resolved, unresolved) {
  unresolved[name] = true;

  if (mods[name]) {
    mods[name].deps.forEach(function(dep) {
      if (resolved[dep]) return;
      if (!unresolved[dep]) return resolve(dep, mods, circular, resolved, unresolved);
      circular.push(getPath(dep, unresolved));
    });
  }

  resolved[name] = true;
  unresolved[name] = false;
}

/**
 * Format a circular dependency path
 *
 * @param {String} parent
 * @param {Object} unresolved
 * @return {String}
 */

function getPath(parent, unresolved) {
  var parentVisited = false;
  return Object.keys(unresolved).filter(function(mod) {
    if (mod === parent) parentVisited = true;
    return parentVisited && unresolved[mod];
  });
}
