import terser from "@rollup/plugin-terser";

export default {
  input: "src/acks.mjs",
  output: {
    //file: "dist/acks.min.mjs",
    file: "dist/acks.mjs",
    format: "es",
  },
  plugins: [terser({ ecma: 2022, module: true })],
};
