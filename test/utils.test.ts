import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  StoryblokLoaderCommonConfig,
  StoryblokLoaderDatasourceConfig,
  StoryblokLoaderStoriesConfig,
} from "../src/lib/types";
import {
  MockDataStore,
  mockLogger,
  createMockStory,
  createMockStories,
  createMockDatasourceResponse,
  resetAllMocks,
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

// Import after mocking
import {
  createStoryblokClient,
  fetchDatasourceEntries,
  fetchStories,
  processStoriesResponse,
  setStoryInStore,
  shouldUseDateFilter,
} from "../src/lib/utils";
import { storyblokInit } from "@storyblok/js";

const mockStoryblokInit = vi.mocked(storyblokInit);
const mockClient = {
  get: vi.fn(),
  getAll: vi.fn(),
};

describe("utils", () => {
  beforeEach(() => {
    resetAllMocks();
    mockClient.get.mockReset();
    mockClient.getAll.mockReset();
    mockStoryblokInit.mockReturnValue({
      storyblokApi: mockClient as any,
    });
  });

  describe("createStoryblokClient", () => {
    it("should create a Storyblok client with valid configuration", () => {
      const config: StoryblokLoaderCommonConfig = {
        accessToken: "test-token",
        apiOptions: { region: "us" },
      };

      const client = createStoryblokClient(config);

      expect(mockStoryblokInit).toHaveBeenCalledWith({
        accessToken: "test-token",
        apiOptions: { region: "us" },
        use: [{}], // apiPlugin mock
      });
      expect(client).toBe(mockClient);
    });

    it("should throw error when access token is missing", () => {
      const config: StoryblokLoaderCommonConfig = {
        accessToken: "",
      };

      expect(() => createStoryblokClient(config)).toThrow(
        "Storyblok access token is required. Please provide a valid access token in the configuration."
      );
    });

    it("should throw error when client initialization fails", () => {
      const config: StoryblokLoaderCommonConfig = {
        accessToken: "test-token",
      };

      mockStoryblokInit.mockReturnValue({ storyblokApi: undefined });

      expect(() => createStoryblokClient(config)).toThrow(
        "Failed to initialize Storyblok API client. Please check your access token and configuration."
      );
    });
  });

  describe("fetchDatasourceEntries", () => {
    it("should fetch datasource entries successfully", async () => {
      const config: StoryblokLoaderDatasourceConfig = {
        accessToken: "test-token",
        datasource: "test-datasource",
        dimension: "test-dimension",
      };

      const mockResponse = createMockDatasourceResponse();
      mockClient.get.mockResolvedValue({ data: mockResponse });

      const result = await fetchDatasourceEntries(mockClient, config);

      expect(mockClient.get).toHaveBeenCalledWith("cdn/datasource_entries/", {
        datasource: "test-datasource",
        dimension: "test-dimension",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should handle API errors gracefully", async () => {
      const config: StoryblokLoaderDatasourceConfig = {
        accessToken: "test-token",
        datasource: "test-datasource",
      };

      const apiError = new Error("API Error");
      mockClient.get.mockRejectedValue(apiError);

      await expect(fetchDatasourceEntries(mockClient, config)).rejects.toThrow(
        'Failed to fetch datasource entries for "test-datasource": API Error'
      );
    });
  });

  describe("fetchStories", () => {
    it("should fetch stories successfully", async () => {
      const mockStories = createMockStories(2);
      mockClient.getAll.mockResolvedValue(mockStories);

      const result = await fetchStories(mockClient, { published_at_gt: "2024-01-01" }, "page", {
        version: "published",
      });

      expect(mockClient.getAll).toHaveBeenCalledWith("cdn/stories", {
        content_type: "page",
        version: "published",
        published_at_gt: "2024-01-01",
      });
      expect(result).toEqual(mockStories);
    });

    it("should handle API errors with content type context", async () => {
      const apiError = new Error("Network Error");
      mockClient.getAll.mockRejectedValue(apiError);

      await expect(fetchStories(mockClient, {}, "page")).rejects.toThrow(
        'Failed to fetch stories for content type "page": Network Error'
      );
    });

    it("should handle API errors without content type", async () => {
      const apiError = new Error("Network Error");
      mockClient.getAll.mockRejectedValue(apiError);

      await expect(fetchStories(mockClient, {})).rejects.toThrow("Failed to fetch stories: Network Error");
    });
  });

  describe("processStoriesResponse", () => {
    it("should process stories and update latest published date", () => {
      const store = new MockDataStore();
      const stories = createMockStories(2);
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
      };

      // Set different published dates
      stories[0].published_at = "2024-01-15T10:00:00.000Z";
      stories[1].published_at = "2024-01-20T10:00:00.000Z";

      const result = processStoriesResponse(stories, store, mockLogger, "test-collection", "page", null, config);

      expect(store.size()).toBe(2);
      expect(result).toEqual(new Date("2024-01-20T10:00:00.000Z"));

      // Verify stories are stored with correct IDs
      expect(store.has("test/test-story-1")).toBe(true);
      expect(store.has("test/test-story-2")).toBe(true);
    });

    it("should use UUIDs when useUuids is true", () => {
      const store = new MockDataStore();
      const stories = createMockStories(1);
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        useUuids: true,
      };

      processStoriesResponse(stories, store, mockLogger, "test-collection", undefined, null, config);

      expect(store.has("test-uuid-123")).toBe(true);
      expect(store.has("test/test-story-1")).toBe(false);
    });

    it("should handle stories without published_at", () => {
      const store = new MockDataStore();
      const stories = [createMockStory({ published_at: null })];
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
      };

      const result = processStoriesResponse(stories, store, mockLogger, "test-collection", undefined, null, config);

      expect(result).toBeNull();
      expect(store.size()).toBe(1);
    });
  });

  describe("setStoryInStore", () => {
    it("should set story using full_slug by default", () => {
      const store = new MockDataStore();
      const story = createMockStory();
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
      };

      setStoryInStore(store, story, config, mockLogger, "test-collection");

      const storedEntry = store.get("test/test-story");
      expect(storedEntry).toEqual({
        data: story,
        id: "test/test-story",
      });
    });

    it("should set story using uuid when useUuids is true", () => {
      const store = new MockDataStore();
      const story = createMockStory();
      const config: StoryblokLoaderStoriesConfig = {
        accessToken: "test-token",
        useUuids: true,
      };

      setStoryInStore(store, story, config, mockLogger, "test-collection");

      const storedEntry = store.get("test-uuid-123");
      expect(storedEntry).toEqual({
        data: story,
        id: "test-uuid-123",
      });
    });
  });

  describe("shouldUseDateFilter", () => {
    it("should return true when lastPublishedAt exists and version is not draft", () => {
      expect(shouldUseDateFilter("2024-01-01T00:00:00.000Z", "published")).toBe(true);
      expect(shouldUseDateFilter("2024-01-01T00:00:00.000Z", undefined)).toBe(true);
    });

    it("should return false when version is draft", () => {
      expect(shouldUseDateFilter("2024-01-01T00:00:00.000Z", "draft")).toBe(false);
    });

    it("should return false when lastPublishedAt is missing", () => {
      expect(shouldUseDateFilter(undefined, "published")).toBe(false);
      expect(shouldUseDateFilter("", "published")).toBe(false);
    });
  });
});
