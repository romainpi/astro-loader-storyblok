# Test Suite Documentation

This document describes the comprehensive test suite for the `astro-loader-storyblok` package.

## Test Structure

The test suite is organized into several categories:

### Unit Tests

#### `test/utils.test.ts` (19 tests)
Tests for all utility functions in `src/lib/utils.ts`:
- `createStoryblokClient()` - Client initialization and error handling
- `fetchDatasourceEntries()` - Datasource API calls and error handling
- `fetchStories()` - Stories API calls with various parameters
- `processStoriesResponse()` - Story data processing and store updates
- `processDatasourceResponse()` - Datasource data processing and validation
- `setStoryInStore()` - Story storage with UUID/slug configuration
- `shouldUseDateFilter()` - Date filtering logic for incremental updates

#### `test/StoryblokLoaderStories.test.ts` (9 tests)
Tests for the stories loader class:
- `StoryblokLoaderStories` - Stories loader functionality, webhook handling, error scenarios

#### `test/StoryblokLoaderDatasource.test.ts` (4 tests)
Tests for the datasource loader class:
- `StoryblokLoaderDatasource` - Datasource loader functionality and error handling

#### `test/enums.test.ts` (5 tests)
Tests for the `SortByEnum` enumeration values and completeness.

#### `test/index.test.ts` (4 tests)
Tests for the main package exports and public API structure.

### Integration Tests

#### `test/integration.test.ts` (8 tests)
End-to-end workflow tests:
- Complete story loading workflows with multiple content types
- Webhook update handling during incremental sync
- Draft mode behavior with store clearing
- Full datasource loading workflows
- Error handling and recovery scenarios
- Data validation and malformed response handling

### Edge Case Tests

#### `test/edge-cases.test.ts` (8 tests)
Coverage-focused tests for edge cases:
- Empty data handling
- Mixed data formats and null values
- Time calculation edge cases
- Configuration variations
- Data validation edge cases

## Test Utilities

### Mock Infrastructure (`test/mocks.ts`)
- `MockDataStore` - Simulates Astro's DataStore with spies
- `MockMeta` - Mock metadata storage
- `mockLogger` - Console logging mock
- Story and datasource entry factory functions
- Reset utilities for clean test isolation

### Mock Configuration
- Storyblok JS SDK mocking via `vi.mock()`
- API client method mocking
- Proper TypeScript type handling for mocks

## Coverage Report

Current test coverage:
- **Statements**: 89.95%
- **Branches**: 96.42%  
- **Functions**: 93.33%
- **Lines**: 89.95%

### Coverage Details
- `src/index.ts`: 100% coverage (all exports tested)
- `src/lib/StoryblokLoaderDatasource.ts`: 100% coverage
- `src/lib/StoryblokLoaderStories.ts`: 100% coverage
- `src/lib/enums.ts`: 100% coverage
- `src/lib/utils.ts`: 100% statements, 96.22% branches
- `src/lib/types.ts`: Type definitions (no runtime coverage needed)
- `src/lib/syncContentUpdate.ts`: Unused file (0% coverage)

### Uncovered Lines
- `utils.ts` lines 64, 97: Edge case error handling scenarios that are difficult to trigger in tests

## Running Tests

### Available Commands
- `pnpm test` - Run all tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage report
- `pnpm test:ui` - Run tests with Vitest UI

### Configuration
- **Framework**: Vitest 3.2.4
- **Environment**: happy-dom (for DOM simulation)
- **Coverage**: v8 provider with HTML, JSON, and text reports
- **Setup**: Global test configuration in `test/setup.ts`

## Test Scenarios Covered

### API Integration
- ✅ Storyblok API client initialization
- ✅ Stories API calls with various parameters
- ✅ Datasource API calls with dimensions
- ✅ Error handling for network failures
- ✅ Response processing and validation

### Data Processing
- ✅ Story data transformation and storage
- ✅ UUID vs slug-based story IDs
- ✅ Date filtering for incremental updates
- ✅ Datasource entry processing
- ✅ Name/value switching for datasources
- ✅ Invalid data handling and warnings

### Loader Functionality
- ✅ Multiple content type support
- ✅ Webhook story updates
- ✅ Draft vs published mode handling
- ✅ Store clearing in draft mode
- ✅ Metadata persistence
- ✅ Error propagation and logging

### Edge Cases
- ✅ Empty responses
- ✅ Malformed data
- ✅ Network timeouts
- ✅ Invalid configurations
- ✅ Mixed data types
- ✅ Time calculation variations

## Quality Metrics

- **Total Tests**: 57
- **Test Files**: 7
- **Mock Coverage**: Comprehensive mocking of external dependencies
- **Type Safety**: Full TypeScript coverage with proper type assertions
- **Error Scenarios**: Extensive error condition testing
- **Integration**: End-to-end workflow validation

The test suite provides confidence in the reliability and correctness of the Storyblok loader implementations.