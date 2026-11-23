import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

/** Actor and item type names (`ACTOR_TYPE` / `ITEM_TYPE` in src/module/constants.mjs). */
const TYPE_NAME = "/^(character|monster|item|weapon|armor|spell|ability|language|money|bundle)$/";
/** A `type` variable or a `.type` property. */
const TYPE_REF = (key) => `:matches([${key}.name='type'], [${key}.property.name='type'])`;
const TYPE_LITERAL_MESSAGE = "Compare actor and item types with ACTOR_TYPE / ITEM_TYPE from constants.mjs.";

export default defineConfig([
  {
    plugins: { js },
    extends: ["js/recommended"],
    linterOptions: {
      reportUnusedInlineConfigs: "error",
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["src/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: `BinaryExpression[operator=/^[!=]==?$/]${TYPE_REF("left")}[right.value=${TYPE_NAME}]`,
          message: TYPE_LITERAL_MESSAGE,
        },
        {
          selector: `BinaryExpression[operator=/^[!=]==?$/]${TYPE_REF("right")}[left.value=${TYPE_NAME}]`,
          message: TYPE_LITERAL_MESSAGE,
        },
        {
          selector: `SwitchStatement${TYPE_REF("discriminant")} > SwitchCase[test.value=${TYPE_NAME}]`,
          message: TYPE_LITERAL_MESSAGE,
        },
        {
          selector: "CallExpression[callee.property.name='updateSource'][callee.object.property.name='delta']",
          message:
            "In Foundry v14 a token's `delta` object can be detached from its source (e.g. in _preCreate), so this " +
            "change may be lost. Update the token instead: token.updateSource({ delta: { … } }).",
        },
      ],
    },
  },
  {
    files: ["scripts/**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]);
