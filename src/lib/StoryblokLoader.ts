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
import type { AstroIntegrationLogger } from "astro";

export class StoryblokLoader {
  private commonConfig: StoryblokLoaderCommonConfig;
  private storyblokApi: StoryblokClient;

  /** Cache version announced by API */
  private cv?: number;

  /** Last time we checked the cache version */
  private lastCvCheckDate?: Date;

  constructor(config: StoryblokLoaderCommonConfig) {
    this.commonConfig = config;
    this.storyblokApi = createStoryblokClient(config);

    this.cv = undefined;
    this.lastCvCheckDate = undefined;
  }

  public getDatasourceLoader(config: StoryblokLoaderDatasourceParameters): Loader {
    // Return an instance of the Datasource loader
    return {
      name: "loader-storyblok-datasource",
      load: async (context) => {
        await this.updateCacheVersionValue(context.logger);

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
        await this.updateCacheVersionValue(context.logger);

        return storyblokLoaderStoriesImplem({ ...this.commonConfig, ...config }, this.storyblokApi, context, this.cv);
      },
    };
  }

  private async updateCacheVersionValue(logger: AstroIntegrationLogger): Promise<void> {
    const timeNow = new Date();

    // Only fetch the CV if we haven't done so in the last five seconds:
    if (this.lastCvCheckDate && timeNow.getTime() - this.lastCvCheckDate.getTime() < 5000) {
      return;
    }

    this.cv = await fetchSpaceCacheVersionValue(this.storyblokApi, logger);

    // Set the last CV check time to now
    this.lastCvCheckDate = timeNow;
  }
}
