interface FileStatusProps {
  files: File[]
  emptyMessage: string
}

export default function FileStatus({ files, emptyMessage }: FileStatusProps) {
  if (files.length === 0) return <p className="file-status muted">{emptyMessage}</p>
  if (files.length === 1) return <p className="file-status selected">Selected: {files[0].name}</p>
  return <p className="file-status selected">{files.length} files selected</p>
}
