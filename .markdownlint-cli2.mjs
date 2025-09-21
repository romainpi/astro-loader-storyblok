import markdownIt from "markdown-it";
import configOptions, { init } from "@github/markdownlint-github";

const overriddenOptions = init({
  "ul-style": "dash",
  "line-length": {
    "line_length": 120,
    "code_block_line_length": 120,
    "heading_line_length": 120,
  }
});

const markdownItFactory = () => markdownIt({ html: true });

const options = {
  config: overriddenOptions,
  customRules: ["@github/markdownlint-github"],
  markdownItFactory,
  outputFormatters: [
    ["markdownlint-cli2-formatter-pretty", { appendLink: true }], // ensures the error message includes a link to the rule documentation
  ],
};
export default options;
