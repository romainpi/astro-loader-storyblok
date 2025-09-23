import { describe, it, expect } from "vitest";
import { SortByEnum } from "../src/lib/enums";

describe("SortByEnum", () => {
  it("should have correct created_at sorting values", () => {
    expect(SortByEnum.CREATED_AT_ASC).toBe("created_at:asc");
    expect(SortByEnum.CREATED_AT_DESC).toBe("created_at:desc");
  });

  it("should have correct name sorting values", () => {
    expect(SortByEnum.NAME_ASC).toBe("name:asc");
    expect(SortByEnum.NAME_DESC).toBe("name:desc");
  });

  it("should have correct slug sorting values", () => {
    expect(SortByEnum.SLUG_ASC).toBe("slug:asc");
    expect(SortByEnum.SLUG_DESC).toBe("slug:desc");
  });

  it("should have correct updated_at sorting values", () => {
    expect(SortByEnum.UPDATED_AT_ASC).toBe("updated_at:asc");
    expect(SortByEnum.UPDATED_AT_DESC).toBe("updated_at:desc");
  });

  it("should have all expected enum values", () => {
    const enumValues = Object.values(SortByEnum);
    expect(enumValues).toHaveLength(8);
    expect(enumValues).toEqual([
      "created_at:asc",
      "created_at:desc",
      "name:asc",
      "name:desc",
      "slug:asc",
      "slug:desc",
      "updated_at:asc",
      "updated_at:desc",
    ]);
  });
});
