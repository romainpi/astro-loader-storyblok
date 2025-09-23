import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StoryblokLoaderStoriesConfig } from "../src/lib/types";
import { mockLogger, createMockStory, createMockStories, resetAllMocks, createLoaderContext } from "./mocks";

// Mock the utils module
vi.mock("../src/lib/utils", () => ({
  createStoryblokClient: vi.fn(() => mockClient),
  fetchStories: vi.fn(),
  processStoriesResponse: vi.fn(),
  setStoryInStore: vi.fn(),
  shouldUseDateFilter: vi.fn(),
  checkStoredVersionUpToDate: vi.fn(),
}));

// Mock @storyblok/js
vi.mock("@storyblok/js", () => ({
  storyblokInit: vi.fn(() => ({ storyblokApi: mockClient })),
  apiPlugin: {},
}));

const mockClient = {
  get: vi.fn(),
  getAll: vi.fn(),
};

// Import the mocked functions
import {
  createStoryblokClient,
  fetchStories,
  processStoriesResponse,
  setStoryInStore,
  shouldUseDateFilter,
  checkStoredVersionUpToDate,
} from "../src/lib/utils";

// Import the loader after mocking
import { StoryblokLoaderStories } from "../src/lib/StoryblokLoaderStories";

const mockCreateStoryblokClient = vi.mocked(createStoryblokClient);
const mockFetchStories = vi.mocked(fetchStories);
const mockProcessStoriesResponse = vi.mocked(processStoriesResponse);
const mockSetStoryInStore = vi.mocked(setStoryInStore);
const mockShouldUseDateFilter = vi.mocked(shouldUseDateFilter);
const mockCheckStoredVersionUpToDate = vi.mocked(checkStoredVersionUpToDate);

describe("StoryblokLoaderStories", () => {
  beforeEach(() => {
    resetAllMocks();
    mockCreateStoryblokClient.mockReturnValue(mockClient as any);
    mockShouldUseDateFilter.mockReturnValue(false);
    mockProcessStoriesResponse.mockReturnValue(null);
    mockCheckStoredVersionUpToDate.mockReturnValue(false); // Force loading by default
  });

  it("should create a loader with correct name", () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
    };

    const loader = StoryblokLoaderStories(config);

    expect(loader.name).toBe("astro-loader-storyblok-stories");
    expect(typeof loader.load).toBe("function");
  });

  it("should handle webhook story updates", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
    };
    const loader = StoryblokLoaderStories(config);
    const context = createLoaderContext();
    const updatedStory = createMockStory({ name: "Updated Story" });

    context.refreshContextData = { story: updatedStory };

    await loader.load(context);

    expect(mockSetStoryInStore).toHaveBeenCalledWith(
      context.store,
      updatedStory,
      config,
      mockLogger,
      "test-collection"
    );
    expect(mockLogger.info).toHaveBeenCalledWith("'test-collection': Syncing... story updated in Storyblok");
    expect(mockFetchStories).not.toHaveBeenCalled();
  });

  it("should load stories for single content type", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
      contentTypes: ["page"],
    };
    const loader = StoryblokLoaderStories(config);
    const context = createLoaderContext();
    const mockStories = createMockStories(2);

    mockFetchStories.mockResolvedValue(mockStories);
    mockProcessStoriesResponse.mockReturnValue(new Date("2024-01-15T10:00:00.000Z"));

    await loader.load(context);

    expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, "page", undefined);
    expect(mockProcessStoriesResponse).toHaveBeenCalledWith(
      mockStories,
      context.store,
      mockLogger,
      "test-collection",
      "page",
      null,
      config
    );
    expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", "2024-01-15T10:00:00.000Z");
  });

  it("should load stories for multiple content types", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
      contentTypes: ["page", "post"],
    };
    const loader = StoryblokLoaderStories(config);
    const context = createLoaderContext();
    const mockStories = createMockStories(1);

    mockFetchStories.mockResolvedValue(mockStories);

    await loader.load(context);

    expect(mockFetchStories).toHaveBeenCalledTimes(2);
    expect(mockFetchStories).toHaveBeenNthCalledWith(1, mockClient, {}, "page", undefined);
    expect(mockFetchStories).toHaveBeenNthCalledWith(2, mockClient, {}, "post", undefined);
    expect(mockProcessStoriesResponse).toHaveBeenCalledTimes(2);
  });

  it("should load all stories when no content types specified", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
    };
    const loader = StoryblokLoaderStories(config);
    const context = createLoaderContext();
    const mockStories = createMockStories(3);

    mockFetchStories.mockResolvedValue(mockStories);

    await loader.load(context);

    expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, undefined, undefined);
    expect(mockProcessStoriesResponse).toHaveBeenCalledWith(
      mockStories,
      context.store,
      mockLogger,
      "test-collection",
      undefined,
      null,
      config
    );
  });

  it("should use date filtering when available and not in draft mode", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
    };
    const loader = StoryblokLoaderStories(config, { version: "published" });
    const context = createLoaderContext();
    const mockStories = createMockStories(1);

    context.meta.set("lastPublishedAt", "2024-01-01T10:00:00.000Z");
    mockShouldUseDateFilter.mockReturnValue(true);
    mockFetchStories.mockResolvedValue(mockStories);

    await loader.load(context);

    expect(mockShouldUseDateFilter).toHaveBeenCalledWith("2024-01-01T10:00:00.000Z", "published");
    expect(mockFetchStories).toHaveBeenCalledWith(
      mockClient,
      { published_at_gt: "2024-01-01T10:00:00.000Z" },
      undefined,
      { version: "published" }
    );
  });

  it("should clear store in draft mode", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
    };
    const loader = StoryblokLoaderStories(config, { version: "draft" });
    const context = createLoaderContext();
    const mockStories = createMockStories(1);

    mockFetchStories.mockResolvedValue(mockStories);

    await loader.load(context);

    expect(context.store.clear).toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith("'test-collection': Clearing store (draft mode)");
  });

  it("should handle errors and rethrow them", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
    };
    const loader = StoryblokLoaderStories(config);
    const context = createLoaderContext();
    const error = new Error("API Error");

    mockFetchStories.mockRejectedValue(error);

    await expect(loader.load(context)).rejects.toThrow("API Error");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "'test-collection': Failed to load stories for \"test-collection\": API Error"
    );
  });

  it("should handle non-Error exceptions", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
    };
    const loader = StoryblokLoaderStories(config);
    const context = createLoaderContext();

    mockFetchStories.mockRejectedValue("String error");

    await expect(loader.load(context)).rejects.toThrow("String error");
    expect(mockLogger.error).toHaveBeenCalledWith(
      "'test-collection': Failed to load stories for \"test-collection\": String error"
    );
  });
});
