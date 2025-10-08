// @ts-check
import { defineConfig } from "astro/config";
import "dotenv/config";
import process from "node:process";

const storyblokToken = process.env.STORYBLOK_DELIVERY_PREVIEW_API_TOKEN;
if (!storyblokToken) {
  throw new Error("Missing STORYBLOK_ACCESS_TOKEN environment variable");
}

// https://astro.build/config
export default defineConfig({});
