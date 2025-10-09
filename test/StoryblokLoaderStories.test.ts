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
  getEffectiveSortBy: vi.fn(),
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
  getEffectiveSortBy,
} from "../src/lib/utils";

// Import the loader after mocking
import { StoryblokLoaderStories } from "../src/lib/StoryblokLoaderStories";
import { SortByEnum } from "../src/lib/enums";

const mockCreateStoryblokClient = vi.mocked(createStoryblokClient);
const mockFetchStories = vi.mocked(fetchStories);
const mockProcessStoriesResponse = vi.mocked(processStoriesResponse);
const mockSetStoryInStore = vi.mocked(setStoryInStore);
const mockShouldUseDateFilter = vi.mocked(shouldUseDateFilter);
const mockCheckStoredVersionUpToDate = vi.mocked(checkStoredVersionUpToDate);
const mockGetEffectiveSortBy = vi.mocked(getEffectiveSortBy);

// Test constants
const TEST_DATES = {
  JANUARY_1: "2024-01-01T00:00:00.000Z",
  JANUARY_5: "2024-01-05T08:00:00.000Z",
  JANUARY_10: "2024-01-10T10:00:00.000Z",
  JANUARY_15: "2024-01-15T10:00:00.000Z",
  JANUARY_20: "2024-01-20T10:00:00.000Z",
  JANUARY_25: "2024-01-25T12:00:00.000Z",
  JANUARY_28: "2024-01-28T08:15:00.000Z",
  FEBRUARY_1: "2024-02-01T09:00:00.000Z",
  FEBRUARY_3: "2024-02-03T15:30:00.000Z",
  FEBRUARY_5: "2024-02-05T10:45:00.000Z",
  FEBRUARY_10: "2024-02-10T16:45:00.000Z",
  FEBRUARY_15: "2024-02-15T10:00:00.000Z",
  FEBRUARY_20: "2024-02-20T14:30:00.000Z",
  FEBRUARY_25: "2024-02-25T16:45:00.000Z",
} as const;

const TEST_TOKENS = {
  ACCESS_TOKEN: "test-token",
} as const;

const TEST_COLLECTIONS = {
  DEFAULT: "test-collection",
} as const;

// Helper functions
const createBasicConfig = (overrides?: Partial<StoryblokLoaderStoriesConfig>): StoryblokLoaderStoriesConfig => ({
  accessToken: TEST_TOKENS.ACCESS_TOKEN,
  ...overrides,
});

const setupMockDefaults = () => {
  mockCreateStoryblokClient.mockReturnValue(mockClient as any);
  mockShouldUseDateFilter.mockReturnValue(false);
  mockProcessStoriesResponse.mockReturnValue(null);
  mockCheckStoredVersionUpToDate.mockReturnValue(false);
  mockGetEffectiveSortBy.mockReturnValue(undefined);
};

const expectLoaderStructure = (loader: ReturnType<typeof StoryblokLoaderStories>) => {
  expect(loader.name).toBe("loader-storyblok-stories");
  expect(typeof loader.load).toBe("function");
};

const expectWebhookStoryUpdate = (context: any, updatedStory: any, config: StoryblokLoaderStoriesConfig) => {
  expect(mockSetStoryInStore).toHaveBeenCalledWith(
    context.store,
    updatedStory,
    config,
    mockLogger,
    TEST_COLLECTIONS.DEFAULT
  );
  expect(mockLogger.info).toHaveBeenCalledWith(`[${TEST_COLLECTIONS.DEFAULT}] Syncing... story updated in Storyblok`);
  expect(mockFetchStories).not.toHaveBeenCalled();
};

const expectProcessedStories = (
  stories: any[],
  context: any,
  contentType: string | undefined,
  latestDate: Date | null,
  config: StoryblokLoaderStoriesConfig
) => {
  expect(mockProcessStoriesResponse).toHaveBeenCalledWith(
    stories,
    context.store,
    mockLogger,
    TEST_COLLECTIONS.DEFAULT,
    contentType,
    latestDate,
    config
  );
};

describe("StoryblokLoaderStories", () => {
  beforeEach(() => {
    resetAllMocks();
    setupMockDefaults();
  });

  describe("Loader Initialization", () => {
    it("should create a loader with correct name and structure", () => {
      const config = createBasicConfig();
      const loader = StoryblokLoaderStories(config);
      expectLoaderStructure(loader);
    });
  });

  describe("Webhook Updates", () => {
    it("should handle webhook story updates without fetching all stories", async () => {
      const config = createBasicConfig();
      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      const updatedStory = createMockStory({ name: "Updated Story" });

      context.refreshContextData = { story: updatedStory };

      await loader.load(context);

      expectWebhookStoryUpdate(context, updatedStory, config);
    });
  });

  describe("Content Type Filtering", () => {
    it("should load stories for single content type", async () => {
      const config = createBasicConfig({ contentTypes: ["page"] });
      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      const mockStories = createMockStories(2);
      const expectedDate = new Date(TEST_DATES.JANUARY_15);

      mockFetchStories.mockResolvedValue(mockStories);
      mockProcessStoriesResponse.mockReturnValue(expectedDate);

      await loader.load(context);

      expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, "page", undefined);
      expectProcessedStories(mockStories, context, "page", null, config);
      expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", TEST_DATES.JANUARY_15);
    });

    it("should load stories for multiple content types", async () => {
      const config = createBasicConfig({ contentTypes: ["page", "post"] });
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
      const config = createBasicConfig();
      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      const mockStories = createMockStories(3);

      mockFetchStories.mockResolvedValue(mockStories);

      await loader.load(context);

      expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, undefined, undefined);
      expectProcessedStories(mockStories, context, undefined, null, config);
    });
  });

  describe("Date Filtering", () => {
    it("should use date filtering when available and in published mode", async () => {
      const config = createBasicConfig({ storyblokParams: { version: "published" } });
      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      const mockStories = createMockStories(1);

      context.meta.set("lastPublishedAt", TEST_DATES.JANUARY_1);
      mockShouldUseDateFilter.mockReturnValue(true);
      mockFetchStories.mockResolvedValue(mockStories);

      await loader.load(context);

      expect(mockShouldUseDateFilter).toHaveBeenCalledWith(TEST_DATES.JANUARY_1, "published");
      expect(mockFetchStories).toHaveBeenCalledWith(mockClient, { published_at_gt: TEST_DATES.JANUARY_1 }, undefined, {
        version: "published",
      });
    });
  });

  describe("Sorting Configuration", () => {
    describe("first_published_at sorting", () => {
      it("should pass FIRST_PUBLISHED_AT_ASC sort parameter to API", async () => {
        const config = createBasicConfig({
          storyblokParams: {
            sort_by: SortByEnum.FIRST_PUBLISHED_AT_ASC,
          },
        });
        const loader = StoryblokLoaderStories(config);
        const context = createLoaderContext();
        const mockStories = createMockStories(3);

        mockFetchStories.mockResolvedValue(mockStories);

        await loader.load(context);

        expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, undefined, {
          sort_by: "first_published_at:asc",
        });
      });

      it("should pass FIRST_PUBLISHED_AT_DESC sort parameter to API", async () => {
        const config = createBasicConfig({
          storyblokParams: {
            sort_by: SortByEnum.FIRST_PUBLISHED_AT_DESC,
          },
        });
        const loader = StoryblokLoaderStories(config);
        const context = createLoaderContext();
        const mockStories = createMockStories(3);

        mockFetchStories.mockResolvedValue(mockStories);

        await loader.load(context);

        expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, undefined, {
          sort_by: "first_published_at:desc",
        });
      });

      it("should combine first_published_at sorting with content type filtering", async () => {
        const config = createBasicConfig({
          contentTypes: ["blog-post", "article"],
          storyblokParams: {
            sort_by: SortByEnum.FIRST_PUBLISHED_AT_DESC,
          },
        });
        const loader = StoryblokLoaderStories(config);
        const context = createLoaderContext();
        const mockStories = createMockStories(2);

        mockFetchStories.mockResolvedValue(mockStories);

        await loader.load(context);

        expect(mockFetchStories).toHaveBeenCalledTimes(2);
        expect(mockFetchStories).toHaveBeenNthCalledWith(1, mockClient, {}, "blog-post", {
          sort_by: "first_published_at:desc",
        });
        expect(mockFetchStories).toHaveBeenNthCalledWith(2, mockClient, {}, "article", {
          sort_by: "first_published_at:desc",
        });
      });

      it("should combine first_published_at sorting with date filtering", async () => {
        const config = createBasicConfig({
          storyblokParams: {
            version: "published",
            sort_by: SortByEnum.FIRST_PUBLISHED_AT_ASC,
          },
        });
        const loader = StoryblokLoaderStories(config);
        const context = createLoaderContext();
        const mockStories = createMockStories(2);

        context.meta.set("lastPublishedAt", TEST_DATES.JANUARY_15);
        mockShouldUseDateFilter.mockReturnValue(true);
        mockFetchStories.mockResolvedValue(mockStories);

        await loader.load(context);

        expect(mockShouldUseDateFilter).toHaveBeenCalledWith(TEST_DATES.JANUARY_15, "published");
        expect(mockFetchStories).toHaveBeenCalledWith(
          mockClient,
          { published_at_gt: TEST_DATES.JANUARY_15 },
          undefined,
          {
            version: "published",
            sort_by: "first_published_at:asc",
          }
        );
      });

      it("should work with deprecated second parameter syntax", async () => {
        const config = createBasicConfig({
          storyblokParams: {
            sort_by: SortByEnum.FIRST_PUBLISHED_AT_DESC,
            version: "published",
          },
        });
        const loader = StoryblokLoaderStories(config);
        const context = createLoaderContext();
        const mockStories = createMockStories(1);

        mockFetchStories.mockResolvedValue(mockStories);

        await loader.load(context);

        expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, undefined, {
          sort_by: "first_published_at:desc",
          version: "published",
        });
      });
    });

    describe("Other sorting options", () => {
      it("should support custom sorting string", async () => {
        const config = createBasicConfig({
          storyblokParams: {
            sort_by: "position:asc",
          },
        });
        const loader = StoryblokLoaderStories(config);
        const context = createLoaderContext();
        const mockStories = createMockStories(1);

        mockFetchStories.mockResolvedValue(mockStories);

        await loader.load(context);

        expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, undefined, {
          sort_by: "position:asc",
        });
      });

      it("should support published_at sorting", async () => {
        const config = createBasicConfig({
          storyblokParams: {
            sort_by: SortByEnum.PUBLISHED_AT_DESC,
          },
        });
        const loader = StoryblokLoaderStories(config);
        const context = createLoaderContext();
        const mockStories = createMockStories(1);

        mockFetchStories.mockResolvedValue(mockStories);

        await loader.load(context);

        expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, undefined, {
          sort_by: "published_at:desc",
        });
      });

      it("should work without any sorting parameter", async () => {
        const config = createBasicConfig();
        const loader = StoryblokLoaderStories(config);
        const context = createLoaderContext();
        const mockStories = createMockStories(1);

        mockFetchStories.mockResolvedValue(mockStories);

        await loader.load(context);

        expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, undefined, undefined);
      });
    });

    describe("Realistic sorting scenarios", () => {
      const createStoriesWithFirstPublishedAt = () => [
        createMockStory({
          id: 1,
          name: "Oldest Story",
          full_slug: "blog/oldest-story",
          created_at: TEST_DATES.JANUARY_10,
          published_at: TEST_DATES.JANUARY_15,
          first_published_at: TEST_DATES.JANUARY_5, // First published earlier
        }),
        createMockStory({
          id: 2,
          name: "Middle Story",
          full_slug: "blog/middle-story",
          created_at: TEST_DATES.JANUARY_20,
          published_at: TEST_DATES.FEBRUARY_5,
          first_published_at: TEST_DATES.JANUARY_25, // First published in the middle
        }),
        createMockStory({
          id: 3,
          name: "Newest Story",
          full_slug: "blog/newest-story",
          created_at: TEST_DATES.FEBRUARY_1,
          published_at: TEST_DATES.FEBRUARY_10,
          first_published_at: TEST_DATES.FEBRUARY_3, // First published most recently
        }),
      ];

      it("should fetch stories with first_published_at sorting and process them correctly", async () => {
        const config = createBasicConfig({
          contentTypes: ["blog-post"],
          storyblokParams: {
            version: "published",
            sort_by: SortByEnum.FIRST_PUBLISHED_AT_DESC,
          },
        });
        const loader = StoryblokLoaderStories(config);
        const context = createLoaderContext();
        const mockStories = createStoriesWithFirstPublishedAt();

        mockFetchStories.mockResolvedValue(mockStories);
        mockProcessStoriesResponse.mockReturnValue(new Date(TEST_DATES.FEBRUARY_10));

        await loader.load(context);

        // Verify API was called with correct sorting
        expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, "blog-post", {
          version: "published",
          sort_by: "first_published_at:desc",
        });

        // Verify stories were processed
        expectProcessedStories(mockStories, context, "blog-post", null, config);

        // Verify metadata was updated
        expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", TEST_DATES.FEBRUARY_10);
      });

      it("should handle multiple content types with first_published_at sorting", async () => {
        const config = createBasicConfig({
          contentTypes: ["blog-post", "news"],
          storyblokParams: {
            sort_by: SortByEnum.FIRST_PUBLISHED_AT_ASC,
          },
        });
        const loader = StoryblokLoaderStories(config);
        const context = createLoaderContext();

        const blogStories = createStoriesWithFirstPublishedAt();
        const newsStories = [
          createMockStory({
            id: 4,
            name: "Breaking News",
            full_slug: "news/breaking-news",
            first_published_at: TEST_DATES.JANUARY_1,
            published_at: TEST_DATES.JANUARY_10,
          }),
        ];

        mockFetchStories.mockResolvedValueOnce(blogStories).mockResolvedValueOnce(newsStories);

        await loader.load(context);

        // Verify both content types were fetched with sorting
        expect(mockFetchStories).toHaveBeenCalledTimes(2);
        expect(mockFetchStories).toHaveBeenNthCalledWith(1, mockClient, {}, "blog-post", {
          sort_by: "first_published_at:asc",
        });
        expect(mockFetchStories).toHaveBeenNthCalledWith(2, mockClient, {}, "news", {
          sort_by: "first_published_at:asc",
        });

        // Verify processing was called for both content types
        expect(mockProcessStoriesResponse).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Draft Mode", () => {
    it("should clear store in draft mode", async () => {
      const config = createBasicConfig({ storyblokParams: { version: "draft" } });
      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      const mockStories = createMockStories(1);

      mockFetchStories.mockResolvedValue(mockStories);

      await loader.load(context);

      expect(context.store.clear).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(`[${TEST_COLLECTIONS.DEFAULT}] Clearing store (draft mode)`);
    });
  });

  describe("Error Handling", () => {
    it("should handle and rethrow Error objects", async () => {
      const config = createBasicConfig();
      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      const error = new Error("API Error");

      mockFetchStories.mockRejectedValue(error);

      await expect(loader.load(context)).rejects.toThrow("API Error");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `[${TEST_COLLECTIONS.DEFAULT}] Failed to load stories for "${TEST_COLLECTIONS.DEFAULT}": API Error`
      );
    });

    it("should handle non-Error exceptions", async () => {
      const config = createBasicConfig();
      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();

      mockFetchStories.mockRejectedValue("String error");

      await expect(loader.load(context)).rejects.toThrow("String error");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `[${TEST_COLLECTIONS.DEFAULT}] Failed to load stories for "${TEST_COLLECTIONS.DEFAULT}": String error`
      );
    });
  });

  describe("Incremental Loading Scenarios", () => {
    const createInitialStories = () => [
      createMockStory({
        id: 1001,
        name: "Old Story 1",
        full_slug: "old/story-1",
        published_at: TEST_DATES.JANUARY_10,
      }),
      createMockStory({
        id: 1002,
        name: "Old Story 2",
        full_slug: "old/story-2",
        published_at: TEST_DATES.JANUARY_15,
      }),
      createMockStory({
        id: 1003,
        name: "Old Story 3",
        full_slug: "old/story-3",
        published_at: TEST_DATES.JANUARY_20,
      }),
    ];

    const createRefetchStories = () => [
      createMockStory({
        id: 1002, // Same ID as Old Story 2
        name: "Old Story 2 - Updated",
        full_slug: "old/story-2",
        published_at: TEST_DATES.FEBRUARY_5,
      }),
      createMockStory({
        id: 1004,
        name: "New Story 1",
        full_slug: "new/story-1",
        published_at: TEST_DATES.FEBRUARY_1,
      }),
      createMockStory({
        id: 1005,
        name: "New Story 2",
        full_slug: "new/story-2",
        published_at: TEST_DATES.FEBRUARY_10,
      }),
    ];

    it("should perform initial load without date filtering", async () => {
      const config = createBasicConfig({ storyblokParams: { version: "published" } });
      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      const initialStories = createInitialStories();

      mockShouldUseDateFilter.mockReturnValue(false);
      mockFetchStories.mockResolvedValue(initialStories);
      mockProcessStoriesResponse.mockReturnValue(new Date(TEST_DATES.JANUARY_20));

      await loader.load(context);

      expect(mockFetchStories).toHaveBeenCalledWith(mockClient, {}, undefined, { version: "published" });
      expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", TEST_DATES.JANUARY_20);
    });

    it("should handle refetch with date filtering for updated and new stories", async () => {
      const config = createBasicConfig({ storyblokParams: { version: "published" } });
      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();
      const refetchStories = createRefetchStories();

      context.meta.set("lastPublishedAt", TEST_DATES.JANUARY_20);
      mockShouldUseDateFilter.mockReturnValue(true);
      mockFetchStories.mockResolvedValue(refetchStories);
      mockProcessStoriesResponse.mockReturnValue(new Date(TEST_DATES.FEBRUARY_10));

      await loader.load(context);

      expect(mockShouldUseDateFilter).toHaveBeenCalledWith(TEST_DATES.JANUARY_20, "published");
      expect(mockFetchStories).toHaveBeenCalledWith(mockClient, { published_at_gt: TEST_DATES.JANUARY_20 }, undefined, {
        version: "published",
      });
      expect(mockProcessStoriesResponse).toHaveBeenCalledWith(
        refetchStories,
        context.store,
        mockLogger,
        TEST_COLLECTIONS.DEFAULT,
        undefined,
        new Date(TEST_DATES.JANUARY_20),
        expect.objectContaining({
          accessToken: TEST_TOKENS.ACCESS_TOKEN,
          storyblokParams: { version: "published" },
        })
      );
      expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", TEST_DATES.FEBRUARY_10);
      expect(context.store.clear).not.toHaveBeenCalled();
    });
  });

  it("should process mixed batch of updated existing and new stories", async () => {
    const config = createBasicConfig({ storyblokParams: { version: "published" } });
    const loader = StoryblokLoaderStories(config);
    const context = createLoaderContext();

    const mixedStories = [
      createMockStory({
        id: 2001,
        name: "Existing Article - Updated Content",
        full_slug: "blog/existing-article",
        published_at: TEST_DATES.FEBRUARY_3,
      }),
      createMockStory({
        id: 2002,
        name: "Breaking News Story",
        full_slug: "news/breaking-news",
        published_at: TEST_DATES.JANUARY_28,
      }),
      createMockStory({
        id: 2003,
        name: "Product Launch - Final Details",
        full_slug: "products/launch-details",
        published_at: TEST_DATES.FEBRUARY_5,
      }),
      createMockStory({
        id: 2004,
        name: "February Newsletter",
        full_slug: "newsletter/february-2024",
        published_at: TEST_DATES.FEBRUARY_1,
      }),
    ];

    context.meta.set("lastPublishedAt", TEST_DATES.JANUARY_25);
    mockShouldUseDateFilter.mockReturnValue(true);
    mockFetchStories.mockResolvedValue(mixedStories);
    mockProcessStoriesResponse.mockReturnValue(new Date(TEST_DATES.FEBRUARY_5));

    await loader.load(context);

    expect(mockShouldUseDateFilter).toHaveBeenCalledWith(TEST_DATES.JANUARY_25, "published");
    expect(mockFetchStories).toHaveBeenCalledWith(mockClient, { published_at_gt: TEST_DATES.JANUARY_25 }, undefined, {
      version: "published",
    });
    expect(mockProcessStoriesResponse).toHaveBeenCalledWith(
      mixedStories,
      context.store,
      mockLogger,
      TEST_COLLECTIONS.DEFAULT,
      undefined,
      new Date(TEST_DATES.JANUARY_25),
      expect.objectContaining({
        accessToken: TEST_TOKENS.ACCESS_TOKEN,
        storyblokParams: { version: "published" },
      })
    );
    expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", TEST_DATES.FEBRUARY_5);
    expect(context.store.clear).not.toHaveBeenCalled();
  });

  describe("Multi-Content Type Scenarios", () => {
    it("should handle cache invalidation with multiple content types", async () => {
      const config = createBasicConfig({ contentTypes: ["page", "post"], storyblokParams: { version: "published" } });
      const loader = StoryblokLoaderStories(config);
      const context = createLoaderContext();

      const pageStories = [
        createMockStory({
          id: 3001,
          name: "Updated Homepage",
          full_slug: "homepage",
          published_at: TEST_DATES.FEBRUARY_15,
          content: { component: "page" },
        }),
        createMockStory({
          id: 3002,
          name: "New About Page",
          full_slug: "about",
          published_at: TEST_DATES.FEBRUARY_20,
          content: { component: "page" },
        }),
      ];

      const postStories = [
        createMockStory({
          id: 3003,
          name: "Updated Blog Post",
          full_slug: "blog/updated-post",
          published_at: TEST_DATES.FEBRUARY_10,
          content: { component: "post" },
        }),
        createMockStory({
          id: 3004,
          name: "Fresh Content",
          full_slug: "blog/fresh-content",
          published_at: TEST_DATES.FEBRUARY_25,
          content: { component: "post" },
        }),
      ];

      context.meta.set("lastPublishedAt", TEST_DATES.JANUARY_1);
      mockShouldUseDateFilter.mockReturnValue(true);
      mockFetchStories.mockResolvedValueOnce(pageStories).mockResolvedValueOnce(postStories);
      mockProcessStoriesResponse
        .mockReturnValueOnce(new Date(TEST_DATES.FEBRUARY_20))
        .mockReturnValueOnce(new Date(TEST_DATES.FEBRUARY_25));

      await loader.load(context);

      expect(mockFetchStories).toHaveBeenCalledTimes(2);
      expect(mockFetchStories).toHaveBeenNthCalledWith(
        1,
        mockClient,
        { published_at_gt: TEST_DATES.JANUARY_1 },
        "page",
        {
          version: "published",
        }
      );
      expect(mockFetchStories).toHaveBeenNthCalledWith(
        2,
        mockClient,
        { published_at_gt: TEST_DATES.JANUARY_1 },
        "post",
        {
          version: "published",
        }
      );

      expect(mockProcessStoriesResponse).toHaveBeenNthCalledWith(
        1,
        pageStories,
        context.store,
        mockLogger,
        TEST_COLLECTIONS.DEFAULT,
        "page",
        new Date(TEST_DATES.JANUARY_1),
        expect.objectContaining({ accessToken: TEST_TOKENS.ACCESS_TOKEN })
      );

      expect(mockProcessStoriesResponse).toHaveBeenNthCalledWith(
        2,
        postStories,
        context.store,
        mockLogger,
        TEST_COLLECTIONS.DEFAULT,
        "post",
        new Date(TEST_DATES.FEBRUARY_20),
        expect.objectContaining({ accessToken: TEST_TOKENS.ACCESS_TOKEN })
      );

      expect(context.meta.set).toHaveBeenCalledWith("lastPublishedAt", TEST_DATES.FEBRUARY_25);
    });
  });
});
