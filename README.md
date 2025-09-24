# astro-loader-storyblok

![types](https://img.shields.io/badge/types_included-3077c4?logo=typescript&logoColor=white)
[![CI](https://img.shields.io/github/actions/workflow/status/romainpi/astro-loader-storyblok/ci.yml?logo=github&label=CI)](https://github.com/romainpi/astro-loader-storyblok/actions/workflows/ci.yml)
[![Build](https://img.shields.io/github/actions/workflow/status/romainpi/astro-loader-storyblok/build.yml?logo=github&label=build)](https://github.com/romainpi/astro-loader-storyblok/actions/workflows/build.yml)
[![Version](https://img.shields.io/npm/v/astro-loader-storyblok?logo=npm)](https://npmjs.org/package/astro-loader-storyblok)
![Dependencies](https://img.shields.io/librariesio/release/npm/astro-loader-storyblok)
![Maturity](https://img.shields.io/github/created-at/romainpi/astro-loader-storyblok?label=born&color=hotpink)
[![License](https://img.shields.io/npm/l/astro-loader-storyblok?label=license&color=blue)](https://github.com/romainpi/astro-loader-storyblok/blob/main/LICENSE.txt)

~~A robust~~ *An experimental* [Astro content loader][astro-collections] for Storyblok.

`astro-loader-storyblok` is a community-driven continuation of Storyblok’s [archived Astro Content Layer
integration](#background), enabling smooth integration between Storyblok CMS and Astro content collections. Read more
about the [origins of this project here](#background).

## Features

- ✅ **Full Astro Content Layer API support** - Compatible with Astro 5.0+
- 🗂️ **Stories and datasources** - Comprehensive support for both Storyblok stories and datasources
- 🚀 **Optimized performance** - Incremental updates and efficient caching
- ✨ **Automatic schema generation** - Auto-generates Astro collection schemas for datasources
- 🎯 **Content type filtering** - Load specific content types or all stories
- 📊 **Flexible sorting** - Multiple sorting options for your content
- 📦 **TypeScript ready** - Full TypeScript support with type definitions

## Performance Features

- **Cache Version Optimization**: Uses Storyblok's cache version (`cv`) to detect when content has changed, avoiding
  unnecessary API calls
- **Incremental Updates**: Only fetches content that has changed since the last published date
- **Efficient Caching**: Stores metadata about cache version and last published date to minimize API calls  
- **Selective Loading**: Load only specific content types to reduce payload size
- **Smart Cache Validation**: Automatically skips fetching when no changes are detected in the Storyblok space

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

## Advanced Usage (New in v0.2.0)

For more advanced use cases, you can use the new `StoryblokLoader` class which provides better performance through
shared cache version management across multiple collections:

```typescript
import { defineCollection } from "astro:content";
import { StoryblokLoader } from "astro-loader-storyblok";

// Create a shared loader instance
const storyblokLoader = new StoryblokLoader({
  accessToken: "your-storyblok-access-token",
});

// Define multiple collections that share the same cache version
const stories = defineCollection({
  loader: storyblokLoader.getStoriesLoader({
    contentTypes: ["article", "page"],
    storyblokParams: { 
      version: "published",
      sort_by: "created_at:desc" 
    }
  }),
});

const categories = defineCollection({
  loader: storyblokLoader.getDatasourceLoader({
    datasource: "categories"
  }),
});

export const collections = { stories, categories };
```

### Benefits of the StoryblokLoader Class

- **Shared Cache Management**: Multiple collections share the same cache version, reducing redundant API calls and
  preventing conflicts if changes are made to a Storyblok space while collections are being loaded by Astro.
- **Better Performance**: Cache version is fetched once and reused across all loaders
- **Cleaner Architecture**: Centralized configuration and better separation of concerns

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
  loader: StoryblokLoaderStories({
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

    // Storyblok API parameters (new in v0.2.0)
    storyblokParams: {
      // Content version
      version: "draft", // "draft" or "published" (default)

      // Exclude specific slugs
      excluding_slugs: "home,about,contact",

      // Sort stories
      sort_by: SortByEnum.CREATED_AT_DESC,
    },
  }),
});
```

#### Backward Compatibility (Deprecated)

The old two-parameter syntax is still supported but deprecated:

```typescript
// ⚠️ DEPRECATED: This will show a deprecation warning
const stories = defineCollection({
  loader: StoryblokLoaderStories(
    {
      accessToken: "your-access-token",
      contentTypes: ["article", "page", "product"],
      useUuids: true,
      apiOptions: { region: "us" },
    },
    {
      // This second parameter is deprecated
      version: "draft",
      excluding_slugs: "home,about,contact",
      sort_by: SortByEnum.CREATED_AT_DESC,
    }
  ),
});
```

**Migration**: Use the `createStoriesConfig` helper function for easier migration:

```typescript
import { StoryblokLoaderStories, createStoriesConfig } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories(
    createStoriesConfig(
      { accessToken: "your-token" },
      { version: "draft" }
    )
  ),
});
```

## Datasource Loader

The `StoryblokLoaderDatasource` allows you to load data from Storyblok datasources into your Astro content collections.
Datasources in Storyblok are useful for managing structured data like categories, tags, or any other reference data.

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
    datasource: "categories",     // Datasource slug in Storyblok

    // Optionals:
    switchNamesAndValues: true,   // Use value as ID and name as body
    dimension: "es",              // Specify query dimension
    apiOptions: { region: "us" }, // Additional Storyblok API options
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

By default, the loader uses the datasource entry's `name` as the collection entry ID and the `value` as the body
content. You can switch this behavior using the `switchNamesAndValues` option.

## API Reference

### `StoryblokLoaderStories` Configuration

The `StoryblokLoaderStories` function accepts a single configuration object that combines both loader-specific
configuration and Storyblok API parameters:

```typescript
export interface StoryblokLoaderStoriesConfig {
  accessToken: string;
  apiOptions?: ISbConfig;
  contentTypes?: string[];
  useUuids?: boolean;
  storyblokParams?: ISbStoriesParams;
}
```

| Option             | Type               | Default      | Description                                  |
|--------------------|--------------------|--------------|----------------------------------------------|
| `accessToken`      | `string`           | **Required** | Your Storyblok access token                  |
| `apiOptions`       | `ISbConfig`        | `{}`         | Additional Storyblok API configuration       |
| `contentTypes`     | `string[]`         | `undefined`  | Array of content types to load               |
| `useUuids`         | `boolean`          | `false`      | Use story UUIDs instead of slugs as IDs      |
| `storyblokParams`  | `ISbStoriesParams` | `{}`         | Storyblok API query parameters (see below)   |

**Storyblok API Parameters (`storyblokParams`):**

The `storyblokParams` property accepts all standard Storyblok Stories API parameters:

| Option            | Type                     | Default       | Description                              |
|-------------------|--------------------------|---------------|------------------------------------------|
| `version`         | `"draft" \| "published"` | `"published"` | Content version to load                  |
| `excluding_slugs` | `string`                 | `undefined`   | Comma-separated list of slugs to exclude |
| `sort_by`         | `string`                 | `undefined`   | Sort order for stories                   |
| `starts_with`     | `string`                 | `undefined`   | Filter by slug prefix                    |
| `by_slugs`        | `string`                 | `undefined`   | Filter by specific slugs                 |

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

| Option                 | Type        | Default      | Description                                              |
|------------------------|-------------|--------------|----------------------------------------------------------|
| `accessToken`          | `string`    | **Required** | Your Storyblok access token                              |
| `datasource`           | `string`    | **Required** | The slug of your Storyblok datasource                    |
| `dimension`            | `string`    | `undefined`  | Filter entries by dimension (if configured in Storyblok) |
| `switchNamesAndValues` | `boolean`   | `false`      | Use value as ID and name as body instead of the default  |
| `apiOptions`           | `ISbConfig` | `{}`         | Additional Storyblok API configuration                   |

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

You may also specify a custom string for custom sorting options. For more details, refer to the [Storyblok Stories API
documentation][stories-query-params].

## Examples

### Loading Blog Posts

```typescript
// src/content/config.ts
const blog = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    contentTypes: ["blog-post"],
    storyblokParams: {
      version: "published",
      sort_by: SortByEnum.CREATED_AT_DESC,
    },
  }),
});
```

### Multi-region Setup

```typescript
const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    apiOptions: {
      region: "us", // for US region
    },
    storyblokParams: {
      version: "published",
    },
  }),
});
```

### Development vs Production

```typescript
const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    storyblokParams: {
      version: import.meta.env.DEV ? "draft" : "published",
    },
  }),
});
```

### Combined Stories and Datasources

```typescript
import { defineCollection } from "astro:content";
import { StoryblokLoaderStories, StoryblokLoaderDatasource } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    contentTypes: ["article", "page"],
    storyblokParams: {
      version: "published",
    },
  }),
});

const categories = defineCollection({
  loader: StoryblokLoaderDatasource({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    datasource: "categories",
  }),
});

export const collections = { stories, categories };
```

## What's New

### Latest Changes (v0.2.0)

#### 🚀 Performance Improvements

- **Enhanced Cache Version System**: Now uses Storyblok's cache version (`cv`) to detect content changes more
  efficiently, reducing unnecessary API calls
- **Smart Cache Validation**: Automatically skips fetching when no changes are detected in your Storyblok space
- **Shared Cache Management**: New `StoryblokLoader` class enables multiple collections to share the same cache version

#### 🏗️ Architecture Improvements  

- **Improved Code Organization**: Split the monolithic loader into separate, focused modules:
  - `StoryblokLoaderStories` - Stories functionality  
  - `StoryblokLoaderDatasource` - Datasource functionality
  - `StoryblokLoader` - Advanced class-based usage
- **Better Type Safety**: Enhanced TypeScript definitions and schema validation for datasources

#### 🔧 Configuration Enhancements

- **Unified Configuration**: New single-parameter configuration structure with `storyblokParams` property
- **Backward Compatibility**: Deprecated two-parameter syntax still works with automatic migration warnings
- **Helper Functions**: New `createStoriesConfig()` utility for easier migration from deprecated patterns

#### 🛠️ Developer Experience

- **Better Debugging**: Enhanced logging with collection context and debug information  
- **Improved Error Messages**: More detailed error reporting with better context
- **Migration Warnings**: Clear deprecation warnings with migration guidance

## Breaking Changes

<details>
<summary>Since v0.2.0:</summary>

### Since v0.2.0

This section documents changes that may affect your configuration but are backward compatible through deprecation
warnings.

#### ⚠️ Configuration Structure Change (Deprecated but Compatible)

**What changed**: The two-parameter configuration pattern is deprecated in favor of a single configuration object.

**Impact**: Your existing code will continue to work but will show deprecation warnings.

```typescript
// ⚠️ DEPRECATED (but still works with warnings)
const stories = defineCollection({
  loader: StoryblokLoaderStories(config, { version: "draft" })
});

// ✅ RECOMMENDED
const stories = defineCollection({
  loader: StoryblokLoaderStories({
    ...config,
    storyblokParams: { version: "draft" }
  })
});
```

**Migration**: Use the `createStoriesConfig` helper for gradual migration:

```typescript
import { createStoriesConfig } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories(
    createStoriesConfig(config, { version: "draft" })
  )
});
```

#### 🚀 New Advanced Usage Pattern

**What's new**: Introduction of the `StoryblokLoader` class for better performance in multi-collection setups.

```typescript
// ✅ NEW: Advanced usage with shared cache management
import { StoryblokLoader } from "astro-loader-storyblok";

const storyblokLoader = new StoryblokLoader({ accessToken: "token" });

const stories = defineCollection({
  loader: storyblokLoader.getStoriesLoader({
    contentTypes: ["article"],
    storyblokParams: { version: "published" }
  }),
});

const categories = defineCollection({
  loader: storyblokLoader.getDatasourceLoader({
    datasource: "categories"
  }),
});
```

</details>

<details>
<summary>Since v0.0.4:</summary>

### Since v0.0.4

This section documents all breaking changes introduced since version v0.0.4. If you're upgrading from v0.0.4 or earlier,
please review these changes carefully.

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

- **What changed**: The configuration is now split into two parameters: loader-specific config and Storyblok API
  parameters
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

| Old Property (v0.0.4) | New Property (v0.1.0+) | Parameter Location                            |
|-----------------------|------------------------|-----------------------------------------------|
| `excludingSlugs`      | `excluding_slugs`      | Storyblok API params (2nd parameter)          |
| `sortBy`              | `sort_by`              | Storyblok API params (2nd parameter)          |
| `version`             | `version`              | Moved to Storyblok API params (2nd parameter) |

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

#### ⚠️ Deprecation Notice (v0.2.0)

**The second parameter in `StoryblokLoaderStories` is deprecated.** While still functional with automatic backward
compatibility, it will be removed in a future major version.

**Old (deprecated but still works):**

```javascript
// ⚠️ This triggers a deprecation warning but works
const stories = defineCollection({
  loader: StoryblokLoaderStories(config, { version: "draft" })
});
```

**New (recommended):**

```javascript
// ✅ Move storyblok parameters to config.storyblokParams
const stories = defineCollection({
  loader: StoryblokLoaderStories({
    ...config,
    storyblokParams: { version: "draft" }
  })
});
```

**Or use the helper function:**

```javascript
// ✅ Use the helper function for easier migration
import { createStoriesConfig } from "astro-loader-storyblok";

const stories = defineCollection({
  loader: StoryblokLoaderStories(
    createStoriesConfig(config, { version: "draft" })
  )
});
```

The deprecation warning will guide you through the migration and provides automatic backward compatibility.

---

#### Migration from v0.0.4

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

4. **Test your configuration**: After making these changes, verify that your content loads correctly in both development
   and production environments.

</details>

## TypeScript Support

This package is built with TypeScript and provides full type definitions. For even better type safety, consider using
[`storyblok-to-zod`] to generate Zod schemas for your Storyblok components.

```typescript
import { z } from "astro:content";
import { StoryblokLoaderStories } from "astro-loader-storyblok";
import { pageSchema } from './types/storyblok.zod.ts';

// Example with Zod schema (when using storyblok-to-zod)
const stories = defineCollection({
  loader: StoryblokLoaderStories({
    accessToken: import.meta.env.STORYBLOK_TOKEN,
    storyblokParams: {
      version: "published",
    },
  }),
  schema: pageSchema,
});
```

## Background

This Astro content loader is a community-driven successor to Storyblok’s archived Astro Content Layer integration. In
September 2024, [Storyblok had partnered with Astro][astro-blogpost] for the launch of the Content Layer API and
released an [alpha version of a loader][astro-alpha] however, the [implementation][abandoned-implementation] never made
it to the mainline and was subsequently archived and remained in a premature state.

This package provides a complete, production-ready solution with full TypeScript support and works seamlessly with
[`storyblok-to-zod`] for type-safe content schemas.

## Verbose output / debugging

There are two ways of outputting debug messages from `astro-loader-storyblok` to console.

1. Run `astro` with the [`--verbose` flag][astro-verbose] in order to output all of Astro's and Vite's debug messages to
   console.
2. Enable and filter only for messages from `astro-loader-storyblok` with the `DEBUG=astro:astro-loader-storyblok*`
  environment variable ([more info][debugjs-env]). Example:  

    ```bash
    DEBUG=astro:astro-loader-storyblok* astro build
    ```

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
[stories-query-params]:
    https://www.storyblok.com/docs/api/content-delivery/v2/stories/retrieve-multiple-stories#query-parameters
[astro-verbose]: https://docs.astro.build/en/reference/cli-reference/#--verbose
[debugjs-env]: https://github.com/debug-js/debug#environment-variables
[astro-blogpost]: https://astro.build/blog/storyblok-loader/
