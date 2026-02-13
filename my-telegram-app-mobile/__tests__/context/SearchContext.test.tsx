import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { render, fireEvent, waitFor } from "@testing-library/react-native"

import { SearchProvider, useSearch } from "../../context/SearchContext"
import { searchService } from "../../services/searchService"

jest.mock("../../hooks/useDebounce", () => ({
  useDebounce: (value: any) => value,
}))

jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({
    userProfile: { selected_city_id: "2" },
  }),
}))

jest.mock("../../services/searchService", () => ({
  searchService: {
    search: jest.fn(),
  },
}))

const SearchConsumer = () => {
  const { searchTerm, isSearching, searchResults, handleSearchTermChange } = useSearch()
  return (
    <View>
      <Text testID="term">{searchTerm}</Text>
      <Text testID="isSearching">{String(isSearching)}</Text>
      <Text testID="count">{String(searchResults.products.totalItems)}</Text>
      <TouchableOpacity testID="short" onPress={() => handleSearchTermChange("a")} />
      <TouchableOpacity testID="long" onPress={() => handleSearchTermChange("shoes")} />
    </View>
  )
}

describe("SearchContext", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("does not search for short terms", async () => {
    const { getByTestId } = render(
      <SearchProvider>
        <SearchConsumer />
      </SearchProvider>,
    )

    fireEvent.press(getByTestId("short"))

    await waitFor(() => {
      expect(searchService.search).not.toHaveBeenCalled()
    })

    expect(getByTestId("count").props.children).toBe("0")
  })

  it("searches when term is long enough", async () => {
    ;(searchService.search as jest.Mock).mockResolvedValue({
      results: { products: { items: [{}], totalItems: 1 }, deals: [], suppliers: [] },
    })

    const { getByTestId } = render(
      <SearchProvider>
        <SearchConsumer />
      </SearchProvider>,
    )

    fireEvent.press(getByTestId("long"))

    await waitFor(() => {
      expect(searchService.search).toHaveBeenCalledWith("shoes", "2")
    })

    await waitFor(() => {
      expect(getByTestId("count").props.children).toBe("1")
    })
  })
})
