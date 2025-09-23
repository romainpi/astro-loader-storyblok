import { vi } from "vitest";
import type { ISbStoryData } from "@storyblok/js";
import type { StoryblokDatasourceResponse } from "../src/lib/types";

// Define DatasourceEntry type locally based on the actual structure
export interface DatasourceEntry {
  id: number;
  name: string;
  value: string;
  dimension_value?: string;
  datasource_id: number;
}

/**
 * Mock Storyblok API client
 */
export const mockStoryblokClient = {
  get: vi.fn(),
  getAll: vi.fn(),
};

/**
 * Mock Astro DataStore
 */
export class MockDataStore {
  private data = new Map<string, any>();

  set = vi.fn((entry: { id: string; data?: any; body?: string }) => {
    this.data.set(entry.id, entry);
    return true;
  });

  get(id: string) {
    return this.data.get(id);
  }

  clear = vi.fn(() => {
    this.data.clear();
  });

  has(id: string) {
    return this.data.has(id);
  }

  size() {
    return this.data.size;
  }

  entries() {
    return Array.from(this.data.entries());
  }

  // Additional methods required by Astro DataStore interface
  values = vi.fn(() => Array.from(this.data.values()));
  keys = vi.fn(() => Array.from(this.data.keys()));
  delete = vi.fn((id: string) => this.data.delete(id));
  addModuleImport = vi.fn();
}

/**
 * Mock Astro logger
 */
export const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  options: {
    dest: { write: vi.fn(() => true) }, // Simple mock LogWritable
    level: "info" as const,
  },
  label: "test",
  fork: vi.fn(() => mockLogger),
} as any; // Type assertion to bypass complex Logger interface

/**
 * Mock metadata store
 */
export class MockMeta {
  private data = new Map<string, any>();

  get(key: string) {
    return this.data.get(key);
  }

  set = vi.fn((key: string, value: any) => {
    this.data.set(key, value);
  });

  has(key: string) {
    return this.data.has(key);
  }

  delete = vi.fn((key: string) => {
    return this.data.delete(key);
  });
}

/**
 * Create a mock story with realistic data structure
 */
export function createMockStory(overrides: Partial<ISbStoryData> = {}): ISbStoryData {
  const baseStory = {
    id: 123456,
    uuid: "test-uuid-123",
    name: "Test Story",
    slug: "test-story",
    full_slug: "test/test-story",
    content: {
      component: "page",
      _uid: "content-uid",
      title: "Test Story Title",
    },
    created_at: "2024-01-01T10:00:00.000Z",
    published_at: "2024-01-10T10:00:00.000Z",
    is_startpage: false,
    parent_id: 0,
    group_id: "group-123",
    sort_by_date: null,
    position: 1,
    tag_list: ["test", "story"],
  };

  return { ...baseStory, ...overrides } as ISbStoryData;
}

/**
 * Create multiple mock stories
 */
export function createMockStories(count: number, baseOverrides: Partial<ISbStoryData> = {}): ISbStoryData[] {
  return Array.from({ length: count }, (_, index) =>
    createMockStory({
      ...baseOverrides,
      id: 123456 + index,
      uuid: `test-uuid-${123 + index}`,
      name: `Test Story ${index + 1}`,
      slug: `test-story-${index + 1}`,
      full_slug: `test/test-story-${index + 1}`,
      published_at: new Date(2024, 0, 10 + index).toISOString(),
    })
  );
}

/**
 * Create a mock datasource entry
 */
export function createMockDatasourceEntry(overrides: Partial<DatasourceEntry> = {}): DatasourceEntry {
  return {
    id: 12345,
    name: "test-entry",
    value: "Test Entry Value",
    dimension_value: undefined,
    datasource_id: 1,
    ...overrides,
  };
}

/**
 * Create multiple mock datasource entries
 */
export function createMockDatasourceEntries(count: number): DatasourceEntry[] {
  return Array.from({ length: count }, (_, index) =>
    createMockDatasourceEntry({
      id: 12345 + index,
      name: `entry-${index + 1}`,
      value: `Entry ${index + 1} Value`,
      datasource_id: 1,
    })
  );
}

/**
 * Create a mock datasource response
 */
export function createMockDatasourceResponse(
  entries: DatasourceEntry[] = createMockDatasourceEntries(3),
  cv = 1640995200 // Unix timestamp for 2022-01-01
): StoryblokDatasourceResponse {
  return {
    datasource_entries: entries,
    cv,
  };
}

/**
 * Mock storyblokInit function
 */
export const mockStoryblokInit = vi.fn(() => ({
  storyblokApi: mockStoryblokClient,
}));

/**
 * Create loader context for testing
 */
export function createLoaderContext() {
  const store = new MockDataStore();
  const meta = new MockMeta();

  return {
    store,
    meta,
    logger: mockLogger,
    collection: "test-collection",
    refreshContextData: undefined as any,
    config: {} as any,
    parseData: vi.fn() as any,
    renderMarkdown: vi.fn() as any,
    generateDigest: vi.fn() as any,
  };
}

/**
 * Reset all mocks
 */
export function resetAllMocks() {
  vi.clearAllMocks();
  mockStoryblokClient.get.mockReset();
  mockStoryblokClient.getAll.mockReset();
}
