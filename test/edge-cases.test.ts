import { describe, it, expect } from "vitest";
import { createMockStory, MockDataStore, createLoaderContext } from "./mocks";
import { processStoriesResponse } from "../src/lib/utils";
import type { StoryblokLoaderStoriesConfig, StoryblokLoaderDatasourceConfig } from "../src/lib/types";

describe("Edge Cases and Coverage Tests", () => {
  describe("processStoriesResponse edge cases", () => {
    it("should handle empty stories array", () => {
      const store = new MockDataStore();
      const context = createLoaderContext();
      context.collection = "empty-collection";
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
      };

      const result = processStoriesResponse([], store, context, undefined, null, config);

      expect(result).toBeNull();
      expect(store.size()).toBe(0);
    });

    it("should handle stories with mixed published_at values", () => {
      const store = new MockDataStore();
      const context = createLoaderContext();
      context.collection = "mixed-collection";
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
      };

      const stories = [
        createMockStory({ published_at: "2024-01-10T10:00:00.000Z", full_slug: "story1" }),
        createMockStory({ published_at: null, full_slug: "story2" }),
        createMockStory({ published_at: "2024-01-20T10:00:00.000Z", full_slug: "story3" }),
        createMockStory({ published_at: undefined, full_slug: "story4" }),
      ];

      const existingLatest = new Date("2024-01-01T10:00:00.000Z");

      const result = processStoriesResponse(stories, store, context, "page", existingLatest, config);

      expect(result).toEqual(new Date("2024-01-20T10:00:00.000Z"));
      expect(store.size()).toBe(4); // All stories stored regardless of published_at
    });

    it("should maintain existing latest date when no newer stories", () => {
      const store = new MockDataStore();
      const context = createLoaderContext();
      context.collection = "maintain-collection";
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
      };

      const stories = [
        createMockStory({ published_at: "2023-12-15T10:00:00.000Z" }),
        createMockStory({ published_at: null }),
      ];

      const existingLatest = new Date("2024-01-15T10:00:00.000Z");
      const result = processStoriesResponse(stories, store, context, undefined, existingLatest, config);

      expect(result).toEqual(existingLatest);
    });
  });

  describe("Configuration edge cases", () => {
    it("should handle config with all optional fields", () => {
      const storiesConfig: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        useUuids: false,
        contentTypes: undefined,
        apiOptions: {
          region: "us",
          https: true,
          timeout: 5000,
        },
      };

      const datasourceConfig: StoryblokLoaderDatasourceConfig = {
        accessToken: "test-token",
        datasource: "test-datasource",
        dimension: undefined,
        switchNamesAndValues: false,
        apiOptions: {
          region: "eu",
        },
      };

      // These should not throw errors
      expect(storiesConfig.accessToken).toBe("test-token");
      expect(datasourceConfig.datasource).toBe("test-datasource");
    });
  });
});
