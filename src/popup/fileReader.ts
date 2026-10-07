export class JsonFileReadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JsonFileReadError'
  }
}

export async function readJsonFile(file: File): Promise<unknown> {
  let contents: string
  try {
    contents = await file.text()
  } catch {
    throw new JsonFileReadError(`Could not read ${file.name}. Please select the file again.`)
  }

  try {
    return JSON.parse(contents) as unknown
  } catch {
    throw new JsonFileReadError(`${file.name} isn't valid JSON.`)
  }
}
