import pkgjson from "../package.json" assert { type: 'json' };
import { nodeResolve } from '@rollup/plugin-node-resolve';

console.log(pkgjson)

const banner =
`/**
 * rollup-plugin-jrg-pug v${pkgjson.version}
 * @author jrg'
 * @license MIT'
 */`;
console.log("This si s" +process.cwd());
export default {
  input: pkgjson.src,
  output: {
    file: pkgjson.main,
    format: "esm"
  },
  plugins: [nodeResolve()]
};
