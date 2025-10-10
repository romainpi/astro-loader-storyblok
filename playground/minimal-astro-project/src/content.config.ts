import { defineCollection } from "astro:content";
import {
  SortByEnum,
  StoryblokLoader,
  type StoryblokLoaderCommonConfig,
  type StoryblokLoaderStoriesParameters,
} from "astro-loader-storyblok";

const accessToken = process.env.STORYBLOK_DELIVERY_PREVIEW_API_TOKEN;
if (!accessToken) {
  throw new Error("STORYBLOK_DELIVERY_PREVIEW_API_TOKEN environment variable is not set");
}

const sbContentLoaderConfig: StoryblokLoaderCommonConfig = {
  accessToken,
};

const storyblokLoader = new StoryblokLoader(sbContentLoaderConfig);

const draftStoriesConfig: StoryblokLoaderStoriesParameters = {
  storyblokParams: {
    version: "draft",
  },
};

// Draft collection: contains all your stories, including drafts
const draftStories = defineCollection({
  loader: storyblokLoader.getStoriesLoader(draftStoriesConfig),
});

const publishedStoriesConfig: StoryblokLoaderStoriesParameters = {
  storyblokParams: {
    version: "published",
  },
  sortBy: SortByEnum.FIRST_PUBLISHED_AT_DESC,
};

// Published collection: only published stories, sorted by first_published_at descending
const publishedStories = defineCollection({
  loader: storyblokLoader.getStoriesLoader(publishedStoriesConfig),
});

export const collections = { draftStories, publishedStories };

// Exporting parameters for demonstration purposes (see: ./pages/index.astro)
export const storyblokLoaderStoriesParameters = {
  draftStoriesConfig,
  publishedStoriesConfig,
};
