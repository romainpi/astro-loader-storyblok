# astro-loader-storyblok

~~A robust~~ _An experimental_ Storyblok loader for the [Astro Content Layer API][astro-collections] that enables seamless integration between Storyblok CMS and Astro content collections.

## Features

- ✅ **Full Astro Content Layer API support** - Compatible with Astro 5.0+
- 🗂️ **Stories and datasources** - Comprehensive support for both Storyblok stories and datasources
- 🎯 **Content type filtering** - Load specific content types or all stories
- 📊 **Flexible sorting** - Multiple sorting options for your content
- 🚀 **Optimized performance** - Incremental updates and efficient caching
- 📦 **TypeScript ready** - Full TypeScript support with type definitions

## Performance Features

- **Incremental Updates**: Only fetches content that has changed since the last build
- **Efficient Caching**: Stores metadata about the last published date to minimize API calls
- **Selective Loading**: Load only specific content types to reduce payload size

## Installation

```bash
npm install astro-loader-storyblok
# or
pnpm add astro-loader-storyblok
# or
yarn add astro-loader-storyblok
```

## Quick Start

### 1. Configure your Astro content collection

Create or update your `src/content/config.ts`:

```typescript
import { defineCollection } from "astro:content";
import { StoryblokLoaderStories } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: "your-storyblok-access-token",
  }),
});

export const collections = { stories };
```

### 2. Use in your Astro pages

```astro
---
// src/pages/blog/[...slug].astro
import { getCollection, getEntry } from "astro:content";

export async function getStaticPaths() {
  const stories = await getCollection("stories");
  return stories.map((story) => ({
    params: { slug: story.data.full_slug },
    props: { story },
  }));
}

const { story } = Astro.props;
---

<html>
  <head>
    <title>{story.data.name}</title>
  </head>
  <body>
    <h1>{story.data.content.title}</h1>
    <div set:html={story.data.content.body} />
  </body>
</html>
```

## Stories Loader

The `StoryblokLoaderStories` allows you to load stories from Storyblok into your Astro content collections.

### Basic Configuration

```typescript
import { defineCollection } from "astro:content";
import { StoryblokLoaderStories } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: "your-access-token",
  }),
});
```

### Advanced Configuration

```typescript
import { StoryblokLoaderStories, SortByEnum } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: "your-access-token",

      // Filter by specific content types
      contentTypes: ["article", "page", "product"],

      // Use UUIDs instead of slugs as IDs
      useUuids: true,

      // Additional Storyblok API options
      apiOptions: {
        region: "us", // 'eu' (default), 'us', 'ap', 'ca', 'cn'
        https: true,
        cache: {
          type: "memory",
        },
      },
    },
    {
      // Content version
      version: "draft", // "draft" or "published" (default)

      // Exclude specific slugs
      excluding_slugs: "home,about,contact",

      // Sort stories
      sort_by: SortByEnum.CREATED_AT_DESC,
    }
  ),
});
```

## Datasource Loader

The `StoryblokLoaderDatasource` allows you to load data from Storyblok datasources into your Astro content collections. Datasources in Storyblok are useful for managing structured data like categories, tags, or any other reference data.

### Basic Usage

```typescript
import { defineCollection } from "astro:content";
import { StoryblokLoaderDatasource } from "astro-loader-storyblok";

const categories = defineCollection({
  loader: StoryblokLoaderDatasource({
    accessToken: "your-storyblok-access-token",
    datasource: "categories", // Your datasource slug in Storyblok
  }),
});

export const collections = { categories };
```

### Datasource Configuration

```typescript
const categories = defineCollection({
  loader: StoryblokLoaderDatasource({
    accessToken: "your-access-token",
    datasource: "categories",
    
    // Switch names and values
    switchNamesAndValues: true, // Use value as ID, name as body
    
    // Filter by dimension (if configured in Storyblok)
    dimension: "default",
    
    // Additional Storyblok API options
    apiOptions: {
      region: "us",
    },
  }),
});
```

### Using Datasource Data

```astro
---
// src/pages/categories.astro
import { getCollection } from "astro:content";

const categories = await getCollection("categories");
---

<html>
  <body>
    <h1>Categories</h1>
    <ul>
      {categories.map((category) => (
        <li key={category.id}>
          <strong>{category.id}</strong>: {category.body}
        </li>
      ))}
    </ul>
  </body>
</html>
```

### Data Structure

By default, the loader uses the datasource entry's `name` as the collection entry ID and the `value` as the body content. You can switch this behavior using the `switchNamesAndValues` option.

## API Reference

### `StoryblokLoaderStories` Configuration

The `StoryblokLoaderStories` function accepts two parameters:

1. **Config object** (`StoryblokLoaderStoriesConfig`) - Contains loader-specific configuration
2. **Storyblok API parameters** (`ISbStoriesParams`) - Contains standard Storyblok API query parameters

```typescript
export interface StoryblokLoaderStoriesConfig {
  accessToken: string;
  apiOptions?: ISbConfig;
  contentTypes?: string[];
  useUuids?: boolean;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accessToken` | `string` | **Required** | Your Storyblok access token |
| `apiOptions` | `ISbConfig` | `{}` | Additional Storyblok API configuration |
| `contentTypes` | `string[]` | `undefined` | Array of content types to load. If not provided, loads all stories |
| `useUuids` | `boolean` | `false` | Use story UUIDs instead of slugs as collection entry IDs |

**Storyblok API Parameters (`ISbStoriesParams`):**

The second parameter accepts all standard Storyblok Stories API parameters:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `version` | `"draft" \| "published"` | `"published"` | Content version to load |
| `excluding_slugs` | `string` | `undefined` | Comma-separated list of slugs to exclude |
| `sort_by` | `string` | `undefined` | Sort order for stories |
| `starts_with` | `string` | `undefined` | Filter by slug prefix |
| `by_slugs` | `string` | `undefined` | Filter by specific slugs |

For a complete list of available parameters, see the [Storyblok Stories API documentation][stories-query-params].

### `StoryblokLoaderDatasource` Configuration

```typescript
export interface StoryblokLoaderDatasourceConfig {
  accessToken: string;
  datasource: string;
  dimension?: string;
  switchNamesAndValues?: boolean;
  apiOptions?: ISbConfig;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `accessToken` | `string` | **Required** | Your Storyblok access token |
| `datasource` | `string` | **Required** | The slug of your Storyblok datasource |
| `dimension` | `string` | `undefined` | Filter entries by dimension (if configured in Storyblok) |
| `switchNamesAndValues` | `boolean` | `false` | Use value as ID and name as body instead of the default |
| `apiOptions` | `ISbConfig` | `{}` | Additional Storyblok API configuration |

### Sorting Options

The `SortByEnum` enum provides the following default sorting options for use in the `sort_by` parameter:

```typescript
import { SortByEnum } from "astro-loader-storyblok";

// Available sorting options
SortByEnum.CREATED_AT_ASC    // "created_at:asc"
SortByEnum.CREATED_AT_DESC   // "created_at:desc"
SortByEnum.NAME_ASC          // "name:asc"
SortByEnum.NAME_DESC         // "name:desc"
SortByEnum.SLUG_ASC          // "slug:asc"
SortByEnum.SLUG_DESC         // "slug:desc"
SortByEnum.UPDATED_AT_ASC    // "updated_at:asc"
SortByEnum.UPDATED_AT_DESC   // "updated_at:desc"

// Usage example
const stories = defineCollection({
  loader: StoryblokLoaderStories(
    { accessToken: "your-token" },
    { 
      version: "published",
      sort_by: SortByEnum.CREATED_AT_DESC 
    }
  ),
});
```

You may also specify a custom string for custom sorting options. For more details, refer to the [Storyblok Stories API documentation][stories-query-params].

## Examples

### Loading Blog Posts

```typescript
// src/content/config.ts
const blog = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: import.meta.env.STORYBLOK_TOKEN,
      contentTypes: ["blog-post"],
    },
    {
      version: "published",
      sort_by: SortByEnum.CREATED_AT_DESC,
    }
  ),
});
```

### Multi-region Setup

```typescript
const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: import.meta.env.STORYBLOK_TOKEN,
      apiOptions: {
        region: "us", // for US region
      },
    },
    {
      version: "published",
    }
  ),
});
```

### Development vs Production

```typescript
const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: import.meta.env.STORYBLOK_TOKEN,
    },
    {
      version: import.meta.env.DEV ? "draft" : "published",
    }
  ),
});
```

### Combined Stories and Datasources

```typescript
import { defineCollection } from "astro:content";
import { StoryblokLoaderStories, StoryblokLoaderDatasource } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: import.meta.env.STORYBLOK_TOKEN,
      contentTypes: ["article", "page"],
    },
    {
      version: "published",
    }
  ),
});

const categories = defineCollection({
  loader: StoryblokLoaderDatasource({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    datasource: "categories",
  }),
});

export const collections = { stories, categories };
```

## Breaking Changes

### Since v0.0.4

This section documents all breaking changes introduced since version v0.0.4. If you're upgrading from v0.0.4 or earlier, please review these changes carefully.

#### 1. Function Name Changes

##### `StoryblokLoader` → `StoryblokLoaderStories`

- **What changed**: The main loader function has been renamed from `StoryblokLoader` to `StoryblokLoaderStories`
- **Reason**: Better clarity and consistency as the package now supports multiple loader types (Stories and Datasources)

```typescript
// ❌ Old (v0.0.4)
import { StoryblokLoader } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoader({ accessToken: "token" }),
});

// ✅ New (v0.1.0+)
import { StoryblokLoaderStories } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories({ accessToken: "token" }),
});
```

#### 2. Enum Name Changes

##### `SortBy` → `SortByEnum`

- **What changed**: The sorting enum has been renamed from `SortBy` to `SortByEnum`
- **Reason**: Better naming convention and consistency

```typescript
// ❌ Old (v0.0.4)
import { SortBy } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoader({
    accessToken: "token",
    sortBy: SortBy.CREATED_AT_DESC
  }),
});

// ✅ New (v0.1.0+)
import { SortByEnum } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories(
    { accessToken: "token" },
    { sort_by: SortByEnum.CREATED_AT_DESC }
  ),
});
```

#### 3. Configuration Structure Changes

##### Flattened configuration → Separated loader config and Storyblok API parameters

- **What changed**: The configuration is now split into two parameters: loader-specific config and Storyblok API parameters
- **Reason**: Better separation of concerns and more flexible API that directly maps to Storyblok's API parameters

```typescript
// ❌ Old (v0.0.4)
const stories = defineCollection({
  loader: StoryblokLoader({
    accessToken: "token",
    version: "draft",
    contentTypes: ["article"],
    excludingSlugs: "home,about",
    sortBy: SortBy.CREATED_AT_DESC,
    useUuids: true,
    apiOptions: { region: "us" }
  }),
});

// ✅ New (v0.1.0+)
const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      // Loader-specific configuration
      accessToken: "token",
      contentTypes: ["article"],
      useUuids: true,
      apiOptions: { region: "us" }
    },
    {
      // Standard Storyblok API parameters
      version: "draft",
      excluding_slugs: "home,about",
      sort_by: SortByEnum.CREATED_AT_DESC
    }
  ),
});
```

#### 4. Property Name Changes

##### Snake_case for Storyblok API parameters

- **What changed**: Some properties now use snake_case to match Storyblok's API exactly
- **Reason**: Direct mapping to Storyblok API parameters for consistency and better IntelliSense

| Old Property (v0.0.4) | New Property (v0.1.0+) | Parameter Location |
|------------------------|-------------------------|-------------------|
| `excludingSlugs` | `excluding_slugs` | Storyblok API params (2nd parameter) |
| `sortBy` | `sort_by` | Storyblok API params (2nd parameter) |
| `version` | `version` | Moved to Storyblok API params (2nd parameter) |

#### 5. Type Name Changes

##### Updated type definitions for better clarity

- **What changed**: Several interface names have been updated to reflect the new structure
- **Reason**: Better type organization and clarity

```typescript
// ❌ Old (v0.0.4)
import type { StoryblokLoaderConfig } from "astro-loader-storyblok";

// ✅ New (v0.1.0+)
import type { 
  StoryblokLoaderStoriesConfig,
  StoryblokLoaderDatasourceConfig 
} from "astro-loader-storyblok";
```

### Migration Guide

To migrate from v0.0.4 to the latest version:

1. **Update import names**:
   - `StoryblokLoader` → `StoryblokLoaderStories`
   - `SortBy` → `SortByEnum`
   - `StoryblokLoaderConfig` → `StoryblokLoaderStoriesConfig`

2. **Restructure configuration**:
   - Move `version`, `excluding_slugs`, `sort_by` to the second parameter
   - Keep `accessToken`, `contentTypes`, `useUuids`, `apiOptions` in the first parameter

3. **Update property names**:
   - `excludingSlugs` → `excluding_slugs`
   - `sortBy` → `sort_by`

4. **Test your configuration**: After making these changes, verify that your content loads correctly in both development and production environments.

## TypeScript Support

This package is built with TypeScript and provides full type definitions. For even better type safety, consider using [`storyblok-to-zod`] to generate Zod schemas for your Storyblok components.

```typescript
import { z } from "astro:content";
import { StoryblokLoaderStories } from "astro-loader-storyblok";
import { pageSchema } from './types/storyblok.zod.ts';

// Example with Zod schema (when using storyblok-to-zod)
const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: import.meta.env.STORYBLOK_TOKEN,
    },
    {
      version: "published",
    }
  ),
  schema: pageSchema,
});
```

## Background

This loader was created as an alternative to Storyblok's official Astro Content Layer implementation. In September 2024, Storyblok announced an [alpha version of a loader][astro-alpha], but the [implementation][abandoned-implementation] was later archived and didn't include proper Zod schema definitions.

This package provides a complete, production-ready solution with full TypeScript support and works seamlessly with [`storyblok-to-zod`] for type-safe content schemas.

## Feedback

Feedback and contributions are welcome! If you run into a problem, don't hesitate to [open a GitHub issue][new-issue].

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT - see [LICENSE.txt](LICENSE.txt) for details.

[astro-collections]: https://docs.astro.build/en/guides/content-collections/
[astro-alpha]: https://www.storyblok.com/mp/announcing-storyblok-loader-astro-content-layer-api
[abandoned-implementation]: https://github.com/storyblok/storyblok-astro/commit/1a9bfb16e5886b3419607eb77802088f5eb9dfc4
[`storyblok-to-zod`]: https://www.npmjs.com/package/storyblok-to-zod
[new-issue]: https://github.com/romainpi/astro-loader-storyblok/issues/new
[stories-query-params]: https://www.storyblok.com/docs/api/content-delivery/v2/stories/retrieve-multiple-stories#query-parameters
