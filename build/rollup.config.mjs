import pkgjson from "../package.json" assert { type: 'json' };
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const banner =
`/**
 * rollup-plugin-jrg-pug v${pkgjson.version}
 * @author jrg'
 * @license GPL'
 */`;

export default {
  input: pkgjson.src,
  output: {
    file: pkgjson.main,
    format: "esm"
  },
  plugins: [nodeResolve({
    browser: false,
    preferBuiltins: true
  }), commonjs(), json()]
};
