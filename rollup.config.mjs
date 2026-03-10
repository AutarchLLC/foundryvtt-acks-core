import terser from "@rollup/plugin-terser";

export default {
  input: "src/acks.js",
  output: {
    //file: "dist/acks.min.mjs",
    file: "dist/acks.js",
    format: "es",
  },
  plugins: [terser({ ecma: 2022, module: true })],
};
