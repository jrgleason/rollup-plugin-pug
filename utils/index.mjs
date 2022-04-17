import { createFilter } from '@rollup/pluginutils';
import {extname} from "path";

/**
 * Creates a filter for the options `include`, `exclude`, and `extensions`.
 * It filter out names starting with `\0`.
 * Since `extensions` is not a rollup option, I think is widely used.
 *
 * @param opts - User options
 * @param exts - Default extensions
 * @return Filter function that returns true if a given file matches the filter.
 */
const makeFilter = (opts, exts) => {
  opts = opts || {};

  // Create the rollup default filter
  const filter = createFilter(opts.include, opts.exclude);

  exts = opts.extensions || exts;
  if (!exts || exts === "*") {
    return filter;
  }

  if (!Array.isArray(exts)) {
    exts = [exts];
  }

  // Create the normalized extension list
  const extensions = exts.map((e) => (e[0] !== "." ? `.${e}` : e));

  return (id ) => (filter(id) && extensions.indexOf(extname(id)) > -1);
};
const clone = (obj) => {
  if (obj == null || typeof obj != "object") {
    return obj;
  }
  const copy = obj.constructor();
  for (const attr in obj) {
    // istanbul ignore else
    if (Object.hasOwnProperty.call(obj, attr)) {
      copy[attr] = clone(obj[attr]);
    }
  }
  return copy;
};
const arrIfDeps = (inArr) => {
  if (inArr && inArr.length) {
    const outArr = [];
    inArr.forEach((str) => {
      if (outArr.indexOf(str) < 0) outArr.push(str);
    });
    return outArr;
  }
};

export {arrIfDeps, clone, makeFilter};
