import type { Loader } from "astro/loaders";
import {
  DatasourceEntrySchema,
  type StoryblokLoaderCommonConfig,
  type StoryblokLoaderDatasourceParameters,
  type StoryblokLoaderStoriesParameters,
} from "./types";
import { createStoryblokClient, fetchSpaceCacheVersionValue } from "./utils";
import { storyblokLoaderDatasourceImplem } from "./StoryblokLoaderDatasource";
import type { StoryblokClient } from "@storyblok/js";
import { storyblokLoaderStoriesImplem } from "./StoryblokLoaderStories";

export class StoryblokLoader {
  private commonConfig: StoryblokLoaderCommonConfig;
  private storyblokApi: StoryblokClient;

  /** Cache version announced by API */
  private cv?: number;

  constructor(config: StoryblokLoaderCommonConfig) {
    this.commonConfig = config;
    this.storyblokApi = createStoryblokClient(config);

    this.cv = undefined;
  }

  public getDatasourceLoader(config: StoryblokLoaderDatasourceParameters): Loader {
    // Return an instance of the Datasource loader
    return {
      name: "loader-storyblok-datasource",
      load: async (context) => {
        if (!this.cv) {
          this.cv = await fetchSpaceCacheVersionValue(this.storyblokApi, context.logger);
        }

        return storyblokLoaderDatasourceImplem(
          { ...this.commonConfig, ...config },
          this.storyblokApi,
          context,
          this.cv
        );
      },
      schema: DatasourceEntrySchema,
    };
  }

  public getStoriesLoader(config: StoryblokLoaderStoriesParameters): Loader {
    // Return an instance of the Stories loader
    return {
      name: "loader-storyblok-stories",
      load: async (context) => {
        if (!this.cv) {
          this.cv = await fetchSpaceCacheVersionValue(this.storyblokApi, context.logger);
        }

        return storyblokLoaderStoriesImplem({ ...this.commonConfig, ...config }, this.storyblokApi, context, this.cv);
      },
    };
  }
}
