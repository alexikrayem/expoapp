import React, { useEffect } from "react"
import { act, render, waitFor } from "@testing-library/react-native"

import { CheckoutProvider, useCheckout } from "../../context/CheckoutContext"
import { orderService } from "../../services/orderService"
import { emitter } from "../../utils/emitter"

const mockOpenModal = jest.fn()
const mockCloseModal = jest.fn()

let mockCartItems: any[] = []
const mockClearCart = jest.fn()
const mockGetCartTotal = jest.fn(() => 25)

jest.mock("../../context/ModalContext", () => ({
  useModal: () => ({
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
  }),
}))

jest.mock("../../context/CartContext", () => ({
  useCart: () => ({
    cartItems: mockCartItems,
    actions: { clearCart: mockClearCart },
    getCartTotal: mockGetCartTotal,
  }),
}))

jest.mock("../../services/orderService", () => ({
  orderService: {
    createOrderFromCart: jest.fn(),
  },
}))

jest.mock("../../services/userService", () => ({
  userService: {
    updateProfile: jest.fn(),
  },
}))

jest.mock("../../utils/emitter", () => ({
  emitter: {
    emit: jest.fn(),
  },
}))

let checkoutRef: ReturnType<typeof useCheckout> | null = null

const CaptureCheckout = () => {
  const checkout = useCheckout()
  useEffect(() => {
    checkoutRef = checkout
  }, [checkout])
  return null
}

describe("CheckoutContext", () => {
  const originalAlert = global.alert

  beforeEach(() => {
    jest.clearAllMocks()
    mockCartItems = [
      {
        product_id: "p1",
        quantity: 1,
        effective_selling_price: "10",
        name: "Item 1",
      },
    ]
    checkoutRef = null
    global.alert = jest.fn()
  })

  afterEach(() => {
    global.alert = originalAlert
  })

  it("opens address confirmation for complete profiles", async () => {
    render(
      <CheckoutProvider>
        <CaptureCheckout />
      </CheckoutProvider>,
    )

    await waitFor(() => {
      expect(checkoutRef).not.toBeNull()
    })

    const userProfile = {
      userId: "u1",
      full_name: "Jane Doe",
      phone_number: "111",
      address_line1: "Street 1",
      city: "Dubai",
    }

    await act(async () => {
      await checkoutRef!.startCheckout(userProfile, null, jest.fn())
    })

    expect(mockOpenModal).toHaveBeenCalledWith(
      "addressConfirmation",
      expect.objectContaining({ profileData: expect.any(Object) }),
    )
  })

  it("opens address modal for incomplete profiles", async () => {
    render(
      <CheckoutProvider>
        <CaptureCheckout />
      </CheckoutProvider>,
    )

    await waitFor(() => {
      expect(checkoutRef).not.toBeNull()
    })

    const userProfile = {
      userId: "u1",
      full_name: "Jane Doe",
      phone_number: "111",
      address_line1: "",
      city: "",
    }

    await act(async () => {
      await checkoutRef!.startCheckout(userProfile, null, jest.fn())
    })

    expect(mockOpenModal).toHaveBeenCalledWith(
      "address",
      expect.objectContaining({ initialData: expect.any(Object) }),
    )
  })

  it("creates order and opens confirmation modal", async () => {
    ;(orderService.createOrderFromCart as jest.Mock).mockResolvedValue({
      id: "order-1",
    })

    render(
      <CheckoutProvider>
        <CaptureCheckout />
      </CheckoutProvider>,
    )

    await waitFor(() => {
      expect(checkoutRef).not.toBeNull()
    })

    const addressData = {
      fullName: "Jane Doe",
      phoneNumber: "111",
      addressLine1: "Street 1",
      addressLine2: "",
      city: "Dubai",
    }

    await act(async () => {
      await checkoutRef!.placeOrder(addressData, jest.fn())
    })

    expect(orderService.createOrderFromCart).toHaveBeenCalled()
    expect(mockClearCart).toHaveBeenCalled()
    expect(emitter.emit).toHaveBeenCalledWith("order-placed", { id: "order-1" })
    expect(mockOpenModal).toHaveBeenCalledWith(
      "orderConfirmation",
      expect.objectContaining({ orderDetails: { id: "order-1" } }),
    )
  })
})
