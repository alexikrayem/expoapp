import React from "react"
import { Text, TouchableOpacity, View } from "react-native"
import { render, fireEvent, waitFor } from "@testing-library/react-native"

import { CartProvider, useCart } from "../../context/CartContext"

const mockShowMiniCartBar = jest.fn()
const mockShowToast = jest.fn()

jest.mock("../../context/MiniCartContext", () => ({
  useMiniCart: () => ({
    showMiniCartBar: mockShowMiniCartBar,
  }),
}))

jest.mock("../../context/ToastContext", () => ({
  useToast: () => ({
    showToast: mockShowToast,
  }),
}))

const mockStorageGetItem = jest.fn()
const mockStorageSetItem = jest.fn()

jest.mock("../../utils/storage", () => ({
  storage: {
    getItem: (...args: any[]) => mockStorageGetItem(...args),
    setItem: (...args: any[]) => mockStorageSetItem(...args),
  },
}))

const product = {
  id: "p1",
  name: "Test",
  image_url: "http://example.com/1.png",
  supplier_name: "Supplier",
  effective_selling_price: "5",
}

const CartConsumer = () => {
  const { cartItems, getCartItemCount, getCartTotal, actions, isLoadingCart } = useCart()
  return (
    <View>
      <Text testID="count">{String(getCartItemCount())}</Text>
      <Text testID="total">{String(getCartTotal())}</Text>
      <Text testID="loading">{String(isLoadingCart)}</Text>
      <Text testID="items">{JSON.stringify(cartItems)}</Text>
      <TouchableOpacity testID="add" onPress={() => actions.addToCart(product)} />
      <TouchableOpacity testID="increase" onPress={() => actions.increaseQuantity(product.id)} />
      <TouchableOpacity testID="decrease" onPress={() => actions.decreaseQuantity(product.id)} />
    </View>
  )
}

describe("CartContext", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("loads cart items from storage", async () => {
    mockStorageGetItem.mockResolvedValue(
      JSON.stringify([
        { product_id: "p1", quantity: 2, effective_selling_price: "5" },
      ]),
    )

    const { getByTestId } = render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>,
    )

    await waitFor(() => {
      expect(getByTestId("loading").props.children).toBe("false")
    })

    expect(getByTestId("count").props.children).toBe("2")
    expect(getByTestId("total").props.children).toBe("10")
  })

  it("adds and updates items in the cart", async () => {
    mockStorageGetItem.mockResolvedValue(null)

    const { getByTestId } = render(
      <CartProvider>
        <CartConsumer />
      </CartProvider>,
    )

    await waitFor(() => {
      expect(getByTestId("loading").props.children).toBe("false")
    })

    fireEvent.press(getByTestId("add"))
    await waitFor(() => {
      expect(getByTestId("count").props.children).toBe("1")
    })

    fireEvent.press(getByTestId("add"))
    await waitFor(() => {
      expect(getByTestId("count").props.children).toBe("2")
    })

    expect(mockShowMiniCartBar).toHaveBeenCalled()
    expect(mockShowToast).toHaveBeenCalledWith("تم إضافة المنتج إلى السلة", "success")

    fireEvent.press(getByTestId("decrease"))
    await waitFor(() => {
      expect(getByTestId("count").props.children).toBe("1")
    })

    fireEvent.press(getByTestId("decrease"))
    await waitFor(() => {
      expect(getByTestId("count").props.children).toBe("0")
    })

    expect(mockStorageSetItem).toHaveBeenCalled()
  })
})
