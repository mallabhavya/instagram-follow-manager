export function normalizeUsername(username: string): string {
  return username.trim().replace(/^@/, '').toLocaleLowerCase('en-US')
}
