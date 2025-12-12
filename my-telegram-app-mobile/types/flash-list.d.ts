import type { FlashListProps as OriginalFlashListProps } from "@shopify/flash-list"

declare module "@shopify/flash-list" {
  export interface FlashListProps<T> extends OriginalFlashListProps<T> {
    estimatedItemSize?: number
    drawDistance?: number
  }

  // ⭐ Re-declare FlashList so TS knows it's generic
  export class FlashList<T> extends React.Component<FlashListProps<T>> {}
}
