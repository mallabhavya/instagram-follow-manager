import { describe, expect, it } from 'vitest'
import followersFixture from './fixtures/followers.json'
import followingFixture from './fixtures/following.json'
import { JsonFileReadError, readJsonFile } from '../popup/fileReader'
import { analyzeImportedFiles } from '../popup/importWorkflow'

function makeFile(name: string, contents: string): File {
  return { name, text: async () => contents } as unknown as File
}

describe('readJsonFile', () => {
  it('reads and parses local JSON file contents', async () => {
    const file = makeFile('data.json', '{"ok":true}')
    await expect(readJsonFile(file)).resolves.toEqual({ ok: true })
  })

  it('returns a controlled error for malformed JSON', async () => {
    await expect(readJsonFile(makeFile('broken.json', '{')))
      .rejects.toThrow(JsonFileReadError)
    await expect(readJsonFile(makeFile('broken.json', '{')))
      .rejects.toThrow("broken.json isn't valid JSON.")
  })

  it('returns a controlled error when the browser cannot read the selected file', async () => {
    const unreadable = { name: 'followers.json', text: async () => { throw new Error('permission denied') } } as unknown as File
    await expect(readJsonFile(unreadable)).rejects.toThrow('Could not read followers.json. Please select the file again.')
  })
})

describe('analyzeImportedFiles', () => {
  const followers = makeFile('followers_1.json', JSON.stringify(followersFixture))
  const following = makeFile('following.json', JSON.stringify(followingFixture))
  const now = Date.UTC(2026, 0, 1)

  it('analyzes files without interactions', async () => {
    const result = await analyzeImportedFiles(followers, following, [], 6, now)
    expect(result.followersCount).toBe(2)
    expect(result.followingCount).toBe(3)
    expect(result.accounts.find(({ username }) => username === 'bob'))
      .toMatchObject({ followsBack: false, interactionCount: 0, isDormant: true })
  })

  it('routes multiple interaction files to their domain parsers', async () => {
    const likes = makeFile('likes.json', JSON.stringify({
      likes_media_likes: [{ title: 'Bob', string_list_data: [{ timestamp: 1_700_000_000 }] }],
    }))
    const comments = makeFile('comments.json', JSON.stringify({
      comments_media_comments: [{ title: 'Charlie', string_list_data: [{ timestamp: 1_700_000_000 }] }],
    }))
    const result = await analyzeImportedFiles(followers, following, [likes, comments], 6, now)
    expect(result.accounts.find(({ username }) => username === 'bob'))
      .toMatchObject({ interactionCount: 1, isDormant: true })
    expect(result.accounts.find(({ username }) => username === 'charlie'))
      .toMatchObject({ interactionCount: 1, isDormant: true })
  })

  it.each([6, 12, 24] as const)('passes the %i month setting through to analysis', async (months) => {
    const interaction = makeFile('likes.json', JSON.stringify({
      likes_media_likes: [{ title: 'Bob', string_list_data: [{ timestamp: Date.UTC(2025, 5, 1) / 1000 }] }],
    }))
    const result = await analyzeImportedFiles(followers, following, [interaction], months, now)
    const bob = result.accounts.find(({ username }) => username === 'bob')
    expect(bob?.isDormant).toBe(months === 6)
  })
})
