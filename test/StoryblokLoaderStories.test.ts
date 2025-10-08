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

    expect(loader.name).toBe("loader-storyblok-stories");
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
      storyblokParams: { version: "published" },
    };
    const loader = StoryblokLoaderStories(config);
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
      storyblokParams: { version: "draft" },
    };
    const loader = StoryblokLoaderStories(config);
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

  it("should handle refetching with newer stories and updated older stories", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
    };
    const loader = StoryblokLoaderStories(config, { version: "published" });
    const context = createLoaderContext();

    // Set up initial collection with stories from January 2024
    const initialStories = [
      createMockStory({
        id: 1001,
        name: "Old Story 1",
        full_slug: "old/story-1",
        published_at: "2024-01-10T10:00:00.000Z",
      }),
      createMockStory({
        id: 1002,
        name: "Old Story 2",
        full_slug: "old/story-2",
        published_at: "2024-01-15T10:00:00.000Z",
      }),
      createMockStory({
        id: 1003,
        name: "Old Story 3",
        full_slug: "old/story-3",
        published_at: "2024-01-20T10:00:00.000Z",
      }),
    ];

    // Set up the initial load - simulate first time loading
    mockShouldUseDateFilter.mockReturnValue(false); // First load, no date filtering
    mockFetchStories.mockResolvedValueOnce(initialStories);
    mockProcessStoriesResponse.mockReturnValueOnce(new Date("2024-01-20T10:00:00.000Z"));

    // Initial load
    await loader.load(context);

    expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, undefined, { version: "published" });
    expect(mockProcessStoriesResponse).toHaveBeenCalledWith(
      initialStories,
      context.store,
      mockLogger,
      "test-collection",
      undefined,
      null,
      expect.objectContaining({
        accessToken: "test-token",
        storyblokParams: { version: "published" },
      })
    );
    expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", "2024-01-20T10:00:00.000Z");

    // Reset mocks for the refetch scenario
    vi.clearAllMocks();
    mockShouldUseDateFilter.mockReturnValue(true); // Now we have a stored date, should use filtering

    // Set up refetch scenario with:
    // 1. Updated older story (Old Story 2 was updated on Feb 5th but originally from Jan 15th)
    // 2. New stories published after the last fetch date
    const refetchStories = [
      // Updated older story - same ID but newer published_at
      createMockStory({
        id: 1002, // Same ID as Old Story 2
        name: "Old Story 2 - Updated",
        full_slug: "old/story-2",
        published_at: "2024-02-05T14:30:00.000Z", // Updated date
      }),
      // Brand new story
      createMockStory({
        id: 1004,
        name: "New Story 1",
        full_slug: "new/story-1",
        published_at: "2024-02-01T09:00:00.000Z",
      }),
      // Another new story
      createMockStory({
        id: 1005,
        name: "New Story 2",
        full_slug: "new/story-2",
        published_at: "2024-02-10T16:45:00.000Z",
      }),
    ];

    // Mock the refetch - should use date filtering
    context.meta.set("lastPublishedAt", "2024-01-20T10:00:00.000Z");
    mockFetchStories.mockResolvedValueOnce(refetchStories);
    mockProcessStoriesResponse.mockReturnValueOnce(new Date("2024-02-10T16:45:00.000Z"));

    // Trigger refetch
    await loader.load(context);

    // Verify date filtering was applied
    expect(mockShouldUseDateFilter).toHaveBeenCalledWith("2024-01-20T10:00:00.000Z", "published");
    expect(mockFetchStories).toHaveBeenCalledWith(
      mockClient,
      { published_at_gt: "2024-01-20T10:00:00.000Z" }, // Should include date filter
      undefined,
      { version: "published" }
    );

    // Verify processing of the refetched stories
    expect(mockProcessStoriesResponse).toHaveBeenCalledWith(
      refetchStories,
      context.store,
      mockLogger,
      "test-collection",
      undefined,
      new Date("2024-01-20T10:00:00.000Z"), // Previous latest date
      expect.objectContaining({
        accessToken: "test-token",
        storyblokParams: { version: "published" },
      })
    );

    // Verify metadata was updated with the latest published date
    expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", "2024-02-10T16:45:00.000Z");

    // Verify that the store was not cleared (not draft mode)
    expect(context.store.clear).not.toHaveBeenCalled();
  });

  it("should correctly identify and process both updated existing stories and new stories in a single refetch", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
    };
    const loader = StoryblokLoaderStories(config, { version: "published" });
    const context = createLoaderContext();

    // Simulate that we already have some stories loaded from a previous fetch
    // with lastPublishedAt set to January 25th, 2024
    context.meta.set("lastPublishedAt", "2024-01-25T12:00:00.000Z");
    mockShouldUseDateFilter.mockReturnValue(true);

    // Set up a refetch scenario where Storyblok returns:
    // 1. An existing story that was updated after our last fetch date
    // 2. Brand new stories published after our last fetch date
    // 3. Mix of different published_at dates to test latest date tracking
    const mixedRefetchStories = [
      // Existing story updated in February (originally from January 20th, updated Feb 3rd)
      createMockStory({
        id: 2001,
        name: "Existing Article - Updated Content",
        full_slug: "blog/existing-article",
        published_at: "2024-02-03T15:30:00.000Z", // Updated after our last fetch
      }),
      // Brand new story published in late January (after our cutoff)
      createMockStory({
        id: 2002,
        name: "Breaking News Story",
        full_slug: "news/breaking-news",
        published_at: "2024-01-28T08:15:00.000Z", // New story after cutoff
      }),
      // Another existing story updated recently (originally from January 15th, updated Feb 5th)
      createMockStory({
        id: 2003,
        name: "Product Launch - Final Details",
        full_slug: "products/launch-details",
        published_at: "2024-02-05T10:45:00.000Z", // Most recent update
      }),
      // A new story from early February
      createMockStory({
        id: 2004,
        name: "February Newsletter",
        full_slug: "newsletter/february-2024",
        published_at: "2024-02-01T09:00:00.000Z", // Newer story
      }),
    ];

    // Mock the API response and processing
    mockFetchStories.mockResolvedValue(mixedRefetchStories);
    mockProcessStoriesResponse.mockReturnValue(new Date("2024-02-05T10:45:00.000Z"));

    // Execute the refetch
    await loader.load(context);

    // Verify that the correct date filter was applied based on our last fetch
    expect(mockShouldUseDateFilter).toHaveBeenCalledWith("2024-01-25T12:00:00.000Z", "published");
    expect(mockFetchStories).toHaveBeenCalledWith(
      mockClient,
      { published_at_gt: "2024-01-25T12:00:00.000Z" }, // Only stories after our last fetch
      undefined,
      { version: "published" }
    );

    // Verify all mixed stories were processed together
    expect(mockProcessStoriesResponse).toHaveBeenCalledWith(
      mixedRefetchStories,
      context.store,
      mockLogger,
      "test-collection",
      undefined,
      new Date("2024-01-25T12:00:00.000Z"), // Our previous latest date
      expect.objectContaining({
        accessToken: "test-token",
        storyblokParams: { version: "published" },
      })
    );

    // Verify the metadata was updated with the latest published date from the mixed batch
    expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", "2024-02-05T10:45:00.000Z");

    // Verify store was not cleared (we're not in draft mode)
    expect(context.store.clear).not.toHaveBeenCalled();
  });

  it("should handle cache invalidation scenario - full reload after missed updates", async () => {
    const config: StoryblokLoaderStoriesConfig = {
      accessToken: "test-token",
      contentTypes: ["page", "post"],
    };
    const loader = StoryblokLoaderStories(config, { version: "published" });
    const context = createLoaderContext();

    // Simulate a scenario where our cache is outdated and we get a mix of
    // updated stories and new stories when we do a full refresh
    context.meta.set("lastPublishedAt", "2024-01-01T00:00:00.000Z");
    mockShouldUseDateFilter.mockReturnValue(true);

    // Mock responses for different content types
    const pageStories = [
      createMockStory({
        id: 3001,
        name: "Updated Homepage",
        full_slug: "homepage",
        published_at: "2024-02-15T10:00:00.000Z",
        content: { component: "page" },
      }),
      createMockStory({
        id: 3002,
        name: "New About Page",
        full_slug: "about",
        published_at: "2024-02-20T14:30:00.000Z",
        content: { component: "page" },
      }),
    ];

    const postStories = [
      createMockStory({
        id: 3003,
        name: "Updated Blog Post",
        full_slug: "blog/updated-post",
        published_at: "2024-02-10T09:15:00.000Z",
        content: { component: "post" },
      }),
      createMockStory({
        id: 3004,
        name: "Fresh Content",
        full_slug: "blog/fresh-content",
        published_at: "2024-02-25T16:45:00.000Z",
        content: { component: "post" },
      }),
    ];

    // Mock sequential API calls for different content types
    mockFetchStories
      .mockResolvedValueOnce(pageStories) // First call for "page"
      .mockResolvedValueOnce(postStories); // Second call for "post"

    mockProcessStoriesResponse
      .mockReturnValueOnce(new Date("2024-02-20T14:30:00.000Z")) // Latest from pages
      .mockReturnValueOnce(new Date("2024-02-25T16:45:00.000Z")); // Latest from posts (overall latest)

    // Execute the loader
    await loader.load(context);

    // Verify both content types were fetched with date filtering
    expect(mockFetchStories).toHaveBeenCalledTimes(2);
    expect(mockFetchStories).toHaveBeenNthCalledWith(
      1,
      mockClient,
      { published_at_gt: "2024-01-01T00:00:00.000Z" },
      "page",
      { version: "published" }
    );
    expect(mockFetchStories).toHaveBeenNthCalledWith(
      2,
      mockClient,
      { published_at_gt: "2024-01-01T00:00:00.000Z" },
      "post",
      { version: "published" }
    );

    // Verify both batches were processed with cumulative latest dates
    expect(mockProcessStoriesResponse).toHaveBeenNthCalledWith(
      1,
      pageStories,
      context.store,
      mockLogger,
      "test-collection",
      "page",
      new Date("2024-01-01T00:00:00.000Z"), // Initial stored date
      expect.objectContaining({ accessToken: "test-token" })
    );

    expect(mockProcessStoriesResponse).toHaveBeenNthCalledWith(
      2,
      postStories,
      context.store,
      mockLogger,
      "test-collection",
      "post",
      new Date("2024-02-20T14:30:00.000Z"), // Updated with latest from pages
      expect.objectContaining({ accessToken: "test-token" })
    );

    // Verify final metadata reflects the absolute latest published date across all content types
    expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", "2024-02-25T16:45:00.000Z");
  });
});
