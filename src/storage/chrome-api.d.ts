interface ChromeStorageLocalArea {
  get(key: string, callback: (items: Record<string, unknown>) => void): void
  set(items: Record<string, unknown>, callback: () => void): void
  remove(key: string, callback: () => void): void
}

declare const chrome: {
  runtime: {
    lastError?: { message?: string }
  }
  storage: {
    local: ChromeStorageLocalArea
  }
}
