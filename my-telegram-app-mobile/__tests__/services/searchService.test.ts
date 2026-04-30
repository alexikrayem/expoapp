import { searchService } from "../../services/searchService"

const mockApiClient = jest.fn()
const mockStorageGetItem = jest.fn()
const mockStorageSetItem = jest.fn()
const mockStorageRemoveItem = jest.fn()

jest.mock("../../api/apiClient", () => ({
  apiClient: (...args: unknown[]) => mockApiClient(...args),
}))

jest.mock("../../utils/storage", () => ({
  storage: {
    getItem: (...args: unknown[]) => mockStorageGetItem(...args),
    setItem: (...args: unknown[]) => mockStorageSetItem(...args),
    removeItem: (...args: unknown[]) => mockStorageRemoveItem(...args),
  },
}))

describe("searchService recent searches", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockStorageGetItem.mockResolvedValue(null)
    mockStorageSetItem.mockResolvedValue(undefined)
    mockStorageRemoveItem.mockResolvedValue(undefined)
  })

  it("builds encoded search URL and forwards request options", async () => {
    const abortController = new AbortController()
    mockApiClient.mockResolvedValue({ results: {} })

    await searchService.search("cat food", "3", 12, { signal: abortController.signal })

    expect(mockApiClient).toHaveBeenCalledWith("search?searchTerm=cat+food&cityId=3&limit=12", {
      signal: abortController.signal,
    })
  })

  it("returns parsed recent searches", async () => {
    mockStorageGetItem.mockResolvedValueOnce(JSON.stringify(["  milk  ", "bread"]))

    await expect(searchService.getRecentSearches()).resolves.toEqual(["milk", "bread"])
  })

  it("saves recent searches with de-duplication and newest first ordering", async () => {
    mockStorageGetItem.mockResolvedValue(JSON.stringify(["Bread", "milk"]))

    const next = await searchService.saveRecentSearch("  bread  ")

    expect(next).toEqual(["bread", "milk"])
    expect(mockStorageSetItem).toHaveBeenCalledWith("recentSearches_v1", JSON.stringify(["bread", "milk"]))
  })

  it("ignores terms that are shorter than the minimum length", async () => {
    mockStorageGetItem.mockResolvedValue(JSON.stringify(["milk"]))

    const next = await searchService.saveRecentSearch("a")

    expect(next).toEqual(["milk"])
    expect(mockStorageSetItem).not.toHaveBeenCalled()
  })

  it("removes one recent search and persists the updated list", async () => {
    mockStorageGetItem.mockResolvedValue(JSON.stringify(["milk", "bread", "water"]))

    const next = await searchService.removeRecentSearch("Bread")

    expect(next).toEqual(["milk", "water"])
    expect(mockStorageSetItem).toHaveBeenCalledWith("recentSearches_v1", JSON.stringify(["milk", "water"]))
  })

  it("clears all recent searches from storage", async () => {
    await searchService.clearRecentSearches()
    expect(mockStorageRemoveItem).toHaveBeenCalledWith("recentSearches_v1")
  })
})
