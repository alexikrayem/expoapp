import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { render, fireEvent } from "@testing-library/react-native"

import { SearchProvider, useSearch } from "../../context/SearchContext"

const SearchConsumer = () => {
  const { searchTerm, activeSearchTab, handleSearchTermChange, setActiveSearchTab, clearSearch } = useSearch()
  return (
    <View>
      <Text testID="term">{searchTerm}</Text>
      <Text testID="tab">{activeSearchTab}</Text>
      <TouchableOpacity testID="set-term" onPress={() => handleSearchTermChange("shoes")} />
      <TouchableOpacity testID="set-tab" onPress={() => setActiveSearchTab("suppliers")} />
      <TouchableOpacity testID="clear" onPress={clearSearch} />
    </View>
  )
}

describe("SearchContext", () => {
  it("stores global search session values", () => {
    const { getByTestId } = render(
      <SearchProvider>
        <SearchConsumer />
      </SearchProvider>,
    )

    fireEvent.press(getByTestId("set-term"))
    fireEvent.press(getByTestId("set-tab"))

    expect(getByTestId("term").props.children).toBe("shoes")
    expect(getByTestId("tab").props.children).toBe("suppliers")
  })

  it("clearSearch resets session to defaults", () => {
    const { getByTestId } = render(
      <SearchProvider>
        <SearchConsumer />
      </SearchProvider>,
    )

    fireEvent.press(getByTestId("set-term"))
    fireEvent.press(getByTestId("set-tab"))
    fireEvent.press(getByTestId("clear"))

    expect(getByTestId("term").props.children).toBe("")
    expect(getByTestId("tab").props.children).toBe("products")
  })
})
