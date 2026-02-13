import React, { useEffect } from "react"
import { act, render, waitFor } from "@testing-library/react-native"

import { CacheProvider, useCache } from "../../context/CacheContext"

let cacheRef: ReturnType<typeof useCache> | null = null

const CaptureCache = () => {
  const cache = useCache()
  useEffect(() => {
    cacheRef = cache
  }, [cache])
  return null
}

describe("CacheContext", () => {
  beforeEach(() => {
    cacheRef = null
  })

  it("caches API calls by key", async () => {
    const fetcher = jest.fn().mockResolvedValue("data")

    render(
      <CacheProvider>
        <CaptureCache />
      </CacheProvider>,
    )

    await waitFor(() => {
      expect(cacheRef).not.toBeNull()
    })

    let first: string | null = null
    let second: string | null = null

    await act(async () => {
      first = await cacheRef!.cachedApiCall("products:1", fetcher, 1000)
    })

    await act(async () => {
      second = await cacheRef!.cachedApiCall("products:1", fetcher, 1000)
    })

    expect(first).toBe("data")
    expect(second).toBe("data")
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it("invalidates cached data by prefix", async () => {
    const fetcher = jest.fn().mockResolvedValue("data")

    render(
      <CacheProvider>
        <CaptureCache />
      </CacheProvider>,
    )

    await waitFor(() => {
      expect(cacheRef).not.toBeNull()
    })

    await act(async () => {
      await cacheRef!.cachedApiCall("products:1", fetcher, 1000)
    })

    act(() => {
      cacheRef!.invalidateCache("products")
    })

    await act(async () => {
      await cacheRef!.cachedApiCall("products:1", fetcher, 1000)
    })

    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
