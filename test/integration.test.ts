import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StoryblokLoaderStoriesConfig, StoryblokLoaderDatasourceConfig } from "../src/lib/types";
import { StoryblokLoaderStories } from "../src/lib/StoryblokLoaderStories";
import { StoryblokLoaderDatasource } from "../src/lib/StoryblokLoaderDatasource";
import { SortByEnum } from "../src/lib/enums";
import {
  mockLogger,
  createMockStory,
  createMockStories,
  createMockDatasourceEntries,
  resetAllMocks,
  createLoaderContext,
} from "./mocks";

// Mock @storyblok/js completely
vi.mock("@storyblok/js", () => {
  const mockClient = {
    get: vi.fn(),
    getAll: vi.fn(),
  };

  return {
    storyblokInit: vi.fn(() => ({ storyblokApi: mockClient })),
    apiPlugin: {},
  };
});

import { storyblokInit } from "@storyblok/js";

const mockStoryblokInit = vi.mocked(storyblokInit);
const mockClient = {
  get: vi.fn(),
  getAll: vi.fn(),
};

describe("Integration Tests", () => {
  beforeEach(() => {
    resetAllMocks();
    mockClient.get.mockReset();
    mockClient.getAll.mockReset();
    mockStoryblokInit.mockReturnValue({
      storyblokApi: mockClient as any,
    });
  });

  describe("StoryblokLoaderStories - End-to-End", () => {
    it("should complete full story loading workflow", async () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-access-token",
        contentTypes: ["page", "post"],
        useUuids: false,
        storyblokParams: {
          version: "published",
          sort_by: SortByEnum.CREATED_AT_DESC,
        },
      };

      const loader = StoryblokLoaderStories(config);

      const context = createLoaderContext();
      context.collection = "my-stories";

      // Mock API responses
      const pageStories = createMockStories(2, { full_slug: "pages/story" });
      const postStories = createMockStories(3, { full_slug: "posts/story" });

      mockClient.getAll.mockResolvedValueOnce(pageStories).mockResolvedValueOnce(postStories);

      // Execute the loader
      await loader.load(context);

      // Verify API calls
      expect(mockClient.getAll).toHaveBeenCalledTimes(2);
      expect(mockClient.getAll).toHaveBeenNthCalledWith(1, "cdn/stories", {
        content_type: "page",
        version: "published",
        sort_by: SortByEnum.CREATED_AT_DESC,
      });
      expect(mockClient.getAll).toHaveBeenNthCalledWith(2, "cdn/stories", {
        content_type: "post",
        version: "published",
        sort_by: SortByEnum.CREATED_AT_DESC,
      });

      // Verify data store updates
      expect(context.store.set).toHaveBeenCalledTimes(5); // 2 pages + 3 posts

      // Verify metadata updates
      expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", expect.any(String));

      // Verify logging - check for both content type specific logs
      expect(mockLogger.info).toHaveBeenCalledWith('[my-stories] Processed 2 stories for content type "page"');
      expect(mockLogger.info).toHaveBeenCalledWith('[my-stories] Processed 3 stories for content type "post"');
    });

    it("should handle webhook updates during incremental sync", async () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-access-token",
        useUuids: true,
      };

      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      context.logger = mockLogger;
      context.collection = "webhook-collection";

      // Simulate webhook story update
      const updatedStory = createMockStory({
        name: "Updated Story",
        uuid: "webhook-story-uuid",
      });

      context.refreshContextData = { story: updatedStory };

      await loader.load(context);

      // Should not call API for full sync
      expect(mockClient.getAll).not.toHaveBeenCalled();

      // Should update the story in store using UUID
      expect(context.store.set).toHaveBeenCalledWith({
        data: updatedStory,
        id: "webhook-story-uuid",
      });

      expect(mockLogger.info).toHaveBeenCalledWith("[webhook-collection] Syncing... story updated in Storyblok");
    });

    it("should handle draft mode with store clearing", async () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-access-token",
        storyblokParams: { version: "draft" },
      };

      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      context.logger = mockLogger;
      context.collection = "draft-collection";
      context.refreshContextData = undefined as any;

      // Pre-populate metadata to simulate previous sync
      context.meta.set("lastPublishedAt", "2024-01-01T10:00:00.000Z");

      const draftStories = createMockStories(2);
      mockClient.getAll.mockResolvedValue(draftStories);

      await loader.load(context);

      // Should clear store first
      expect(context.store.clear).toHaveBeenCalled();

      // Should not use date filtering for draft mode
      expect(mockClient.getAll).toHaveBeenCalledWith("cdn/stories", {
        content_type: undefined,
        version: "draft",
      });

      expect(mockLogger.info).toHaveBeenCalledWith("[draft-collection] Clearing store (draft mode)");
    });

    it("should handle first_published_at sorting across multiple content types", async () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-access-token",
        contentTypes: ["blog-post", "news"],
        storyblokParams: {
          version: "published",
          sort_by: SortByEnum.FIRST_PUBLISHED_AT_DESC,
        },
      };

      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      context.collection = "sorted-stories";

      // Mock blog posts with different first_published_at dates
      const blogPosts = [
        createMockStory({
          id: 1,
          name: "Recent Blog Post",
          full_slug: "blog/recent-post",
          content: { component: "blog-post", title: "Recent Blog Post" },
          created_at: "2024-01-20T10:00:00.000Z",
          published_at: "2024-01-25T10:00:00.000Z",
          first_published_at: "2024-01-22T10:00:00.000Z",
        }),
        createMockStory({
          id: 2,
          name: "Older Blog Post",
          full_slug: "blog/older-post",
          content: { component: "blog-post", title: "Older Blog Post" },
          created_at: "2024-01-10T10:00:00.000Z",
          published_at: "2024-01-15T10:00:00.000Z",
          first_published_at: "2024-01-12T10:00:00.000Z",
        }),
      ];

      // Mock news articles
      const newsArticles = [
        createMockStory({
          id: 3,
          name: "Breaking News",
          full_slug: "news/breaking-news",
          content: { component: "news", title: "Breaking News" },
          created_at: "2024-01-30T10:00:00.000Z",
          published_at: "2024-02-01T10:00:00.000Z",
          first_published_at: "2024-01-31T10:00:00.000Z",
        }),
      ];

      // Mock API responses
      mockClient.getAll
        .mockResolvedValueOnce(blogPosts) // First call for blog-post content type
        .mockResolvedValueOnce(newsArticles); // Second call for news content type

      await loader.load(context);

      // Verify API was called with correct parameters for each content type
      expect(mockClient.getAll).toHaveBeenCalledTimes(2);

      // First call should be for blog-post with sorting
      expect(mockClient.getAll).toHaveBeenNthCalledWith(1, "cdn/stories", {
        content_type: "blog-post",
        version: "published",
        sort_by: "first_published_at:desc",
      });

      // Second call should be for news with sorting
      expect(mockClient.getAll).toHaveBeenNthCalledWith(2, "cdn/stories", {
        content_type: "news",
        version: "published",
        sort_by: "first_published_at:desc",
      });

      // Verify stories were stored with correct IDs
      expect(context.store.set).toHaveBeenCalledTimes(3);
      expect(context.store.set).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Recent Blog Post",
          first_published_at: "2024-01-22T10:00:00.000Z",
        }),
        id: "blog/recent-post",
      });
      expect(context.store.set).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "Breaking News",
          first_published_at: "2024-01-31T10:00:00.000Z",
        }),
        id: "news/breaking-news",
      });

      expect(mockLogger.info).toHaveBeenCalledWith('[sorted-stories] Processed 2 stories for content type "blog-post"');
      expect(mockLogger.info).toHaveBeenCalledWith('[sorted-stories] Processed 1 stories for content type "news"');
    });
  });

  describe("StoryblokLoaderDatasource - End-to-End", () => {
    it("should complete full datasource loading workflow", async () => {
      const config: StoryblokLoaderDatasourceConfig = {
        accessToken: "test-access-token",
        datasource: "categories",
        dimension: "en",
        switchNamesAndValues: false,
      };

      const loader = StoryblokLoaderDatasource(config);
      const context = createLoaderContext();
      context.logger = mockLogger;
      context.collection = "category-datasource";
      context.refreshContextData = undefined as any;

      // Mock datasource response
      const datasourceEntries = createMockDatasourceEntries(3);
      const mockResponse = {
        datasource_entries: datasourceEntries,
        cv: 1640995200,
      };

      mockClient.get.mockResolvedValue({ data: mockResponse });

      await loader.load(context);

      // Verify API call
      expect(mockClient.get).toHaveBeenCalledWith("cdn/datasource_entries/", {
        datasource: "categories",
        dimension: "en",
      });

      // Verify data store updates (3 entries)
      expect(context.store.set).toHaveBeenCalledTimes(3);

      // Check the format of stored entries
      expect(context.store.set).toHaveBeenNthCalledWith(1, {
        id: "entry-1",
        body: "Entry 1 Value",
        data: expect.objectContaining({
          name: "entry-1",
          value: "Entry 1 Value",
        }),
      });

      expect(mockLogger.info).toHaveBeenCalledWith("[category-datasource] Loaded 3 entries (updated 45 months ago)");
    });

    it("should handle switched names and values configuration", async () => {
      const config: StoryblokLoaderDatasourceConfig = {
        accessToken: "test-access-token",
        datasource: "options",
        switchNamesAndValues: true,
      };

      const loader = StoryblokLoaderDatasource(config);
      const context = createLoaderContext();
      context.logger = mockLogger;
      context.collection = "switched-datasource";
      context.refreshContextData = undefined as any;

      const datasourceEntries = createMockDatasourceEntries(2);
      const mockResponse = {
        datasource_entries: datasourceEntries,
        cv: 1640995200,
      };

      mockClient.get.mockResolvedValue({ data: mockResponse });

      await loader.load(context);

      // Should store entries with switched names and values
      expect(context.store.set).toHaveBeenNthCalledWith(1, {
        id: "Entry 1 Value", // value becomes id
        body: "entry-1", // name becomes body
        data: {
          id: 12345,
          name: "entry-1",
          value: "Entry 1 Value",
          dimension_value: undefined,
          datasource_id: 1,
        },
      });

      expect(context.store.set).toHaveBeenNthCalledWith(2, {
        id: "Entry 2 Value", // value becomes id
        body: "entry-2", // name becomes body
        data: {
          id: 12346,
          name: "entry-2",
          value: "Entry 2 Value",
          dimension_value: undefined,
          datasource_id: 1,
        },
      });
    });
  });

  describe("Error Handling and Recovery", () => {
    it("should handle network failures gracefully", async () => {
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-access-token",
      };

      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      context.logger = mockLogger;
      context.collection = "network-test";
      context.refreshContextData = undefined as any;

      // Simulate network error
      mockClient.getAll.mockRejectedValue(new Error("Network timeout"));

      await expect(loader.load(context)).rejects.toThrow("Network timeout");

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[network-test] Failed to load stories for "network-test": Failed to fetch stories: Network timeout'
      );
    });

    it("should handle invalid datasource responses", async () => {
      const config: StoryblokLoaderDatasourceConfig = {
        accessToken: "test-access-token",
        datasource: "invalid-datasource",
      };

      const loader = StoryblokLoaderDatasource(config);
      const context = createLoaderContext();
      context.logger = mockLogger;
      context.collection = "invalid-test";
      context.refreshContextData = undefined as any;

      mockClient.get.mockRejectedValue(new Error("Datasource not found"));

      await expect(loader.load(context)).rejects.toThrow("Datasource not found");

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load datasource entries for "invalid-test": Failed to fetch datasource entries for "invalid-datasource": Datasource not found'
      );
    });

    it("should handle malformed data gracefully", async () => {
      const config: StoryblokLoaderDatasourceConfig = {
        accessToken: "test-access-token",
        datasource: "malformed",
      };

      const loader = StoryblokLoaderDatasource(config);
      const context = createLoaderContext();
      context.logger = mockLogger;
      context.collection = "malformed-test";
      context.refreshContextData = undefined as any;

      // Mock response with some invalid entries
      const mockResponse = {
        datasource_entries: [
          { id: 1, name: "valid", value: "Valid Entry" },
          { id: 2, name: "", value: "No Name" },
          { id: 3, name: "No Value", value: "" },
          { id: 4, name: null, value: "Null Name" },
          { id: 5, name: "another-valid", value: "Another Valid Entry" },
        ] as any,
        cv: 1640995200,
      };

      mockClient.get.mockResolvedValue({ data: mockResponse });

      await loader.load(context);

      // Should store valid entries (id 1, 3, and 5 - empty body is tolerated)
      expect(context.store.set).toHaveBeenCalledTimes(3);

      // Should log warnings for invalid entries (id 2 and 4)
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
    });
  });
});
