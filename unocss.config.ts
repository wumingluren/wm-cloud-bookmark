import { defineConfig } from "unocss/vite";
import {
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives,
} from "unocss";

export default defineConfig({
  presets: [presetUno(), presetAttributify(), presetIcons()],
  transformers: [transformerDirectives()],
  // 添加自定义主题配置
  theme: {
    colors: {
      // 添加主题色
      primary: {
        DEFAULT: "#409EFF",
        light: "#66b1ff", // 浅色版本，用于hover效果
        dark: "#337ecc", // 深色版本，可用于active效果
      },
      // 明确设置 ring 颜色
      ringColor: {
        DEFAULT: "rgb(147 197 253 / 0.5)", // 默认 ring 颜色
        primary: "#409EFF", // 主题色 ring
      },
    },
  },
  // 可以添加一些规则来覆盖默认行为
  rules: [["ring-primary", { "--un-ring-color": "rgb(64 158 255 / 1)" }]],
});
