import { describe, it, expect, vi, beforeEach } from "vitest";
import type { StoryblokLoaderDatasourceConfig } from "../src/lib/types";
import { mockLogger, createMockDatasourceResponse, resetAllMocks, createLoaderContext } from "./mocks";

// Mock the utils module
vi.mock("../src/lib/utils", () => ({
  createStoryblokClient: vi.fn(() => mockClient),
  fetchDatasourceEntries: vi.fn(),
  checkStoredVersionUpToDate: vi.fn(),
  timeAgo: vi.fn(),
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
import { createStoryblokClient, fetchDatasourceEntries, checkStoredVersionUpToDate, timeAgo } from "../src/lib/utils";

// Import the loader after mocking
import { StoryblokLoaderDatasource } from "../src/lib/StoryblokLoaderDatasource";

const mockCreateStoryblokClient = vi.mocked(createStoryblokClient);
const mockFetchDatasourceEntries = vi.mocked(fetchDatasourceEntries);
const mockCheckStoredVersionUpToDate = vi.mocked(checkStoredVersionUpToDate);
const mockTimeAgo = vi.mocked(timeAgo);

describe("StoryblokLoaderDatasource", () => {
  beforeEach(() => {
    resetAllMocks();
    mockCreateStoryblokClient.mockReturnValue(mockClient as any);
    mockTimeAgo.mockReturnValue("45 months ago"); // Mock time ago response
  });

  it("should create a loader with correct name", () => {
    const config: StoryblokLoaderDatasourceConfig = {
      accessToken: "test-token",
      datasource: "test-datasource",
    };

    const loader = StoryblokLoaderDatasource(config);

    expect(loader.name).toBe("loader-storyblok-datasource");
    expect(typeof loader.load).toBe("function");
  });

  it("should load datasource entries successfully", async () => {
    const config: StoryblokLoaderDatasourceConfig = {
      accessToken: "test-token",
      datasource: "test-datasource",
      dimension: "test-dimension",
    };
    const loader = StoryblokLoaderDatasource(config);
    const context = createLoaderContext();
    const mockResponse = createMockDatasourceResponse();

    mockFetchDatasourceEntries.mockResolvedValue(mockResponse);
    mockCheckStoredVersionUpToDate.mockReturnValue(false); // Force loading

    await loader.load(context);

    expect(mockFetchDatasourceEntries).toHaveBeenCalledWith(mockClient, config, undefined);
    // Verify that entries were stored directly in the loader
    expect(context.store.set).toHaveBeenCalledTimes(3); // Based on mock response with 3 entries
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining("[test-collection] Loaded 3 entries"));
  });

  it("should handle errors and rethrow them", async () => {
    const config: StoryblokLoaderDatasourceConfig = {
      accessToken: "test-token",
      datasource: "test-datasource",
    };
    const loader = StoryblokLoaderDatasource(config);
    const context = createLoaderContext();
    const error = new Error("Datasource Error");

    mockCheckStoredVersionUpToDate.mockReturnValue(false);
    mockFetchDatasourceEntries.mockRejectedValue(error);

    await expect(loader.load(context)).rejects.toThrow("Datasource Error");
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to load datasource entries for "test-collection": Datasource Error'
    );
  });

  it("should handle non-Error exceptions", async () => {
    const config: StoryblokLoaderDatasourceConfig = {
      accessToken: "test-token",
      datasource: "test-datasource",
    };
    const loader = StoryblokLoaderDatasource(config);
    const context = createLoaderContext();

    mockCheckStoredVersionUpToDate.mockReturnValue(false);
    mockFetchDatasourceEntries.mockRejectedValue("Network timeout");

    await expect(loader.load(context)).rejects.toThrow("Network timeout");
    expect(mockLogger.error).toHaveBeenCalledWith(
      'Failed to load datasource entries for "test-collection": Network timeout'
    );
  });
});
