import { defineCollection } from "astro:content";
import { SortByEnum, StoryblokLoader, type StoryblokLoaderCommonConfig } from "astro-loader-storyblok";

const accessToken = process.env.STORYBLOK_DELIVERY_PREVIEW_API_TOKEN;
if (!accessToken) {
  throw new Error("STORYBLOK_DELIVERY_PREVIEW_API_TOKEN environment variable is not set");
}

const sbContentLoaderConfig: StoryblokLoaderCommonConfig = {
  accessToken,
};

const storyblokLoader = new StoryblokLoader(sbContentLoaderConfig);

const stories = defineCollection({
  loader: storyblokLoader.getStoriesLoader({
    storyblokParams: {
      version: "draft",
    },
  }),
});

export const collections = { stories };
