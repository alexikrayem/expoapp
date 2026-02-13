import React from "react"
import { Text, View } from "react-native"
import { render, waitFor } from "@testing-library/react-native"

import { CurrencyProvider, useCurrency } from "../../context/CurrencyContext"

const CurrencyConsumer = () => {
  const { formatPrice } = useCurrency()
  return (
    <View>
      <Text testID="price">{formatPrice(1)}</Text>
    </View>
  )
}

describe("CurrencyContext", () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.clearAllMocks()
  })

  it("formats price using fetched conversion rate", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        code: 200,
        data: [{ currency: "SYP", buy_rate: "15000" }],
      }),
    }) as any

    const { getByTestId } = render(
      <CurrencyProvider>
        <CurrencyConsumer />
      </CurrencyProvider>,
    )

    await waitFor(() => {
      expect(getByTestId("price").props.children).not.toBe("...")
    })

    const value = getByTestId("price").props.children as string
    expect(value).toContain("ل.س")
    expect(value).toContain("15,000")
  })

  it("falls back to default rate when fetch fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as any

    const { getByTestId } = render(
      <CurrencyProvider>
        <CurrencyConsumer />
      </CurrencyProvider>,
    )

    await waitFor(() => {
      expect(getByTestId("price").props.children).not.toBe("...")
    })

    const value = getByTestId("price").props.children as string
    expect(value).toContain("ل.س")
    expect(value).toContain("14,000")
  })
})
