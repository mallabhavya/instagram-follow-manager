import FileStatus from './FileStatus'

interface FileUploadProps {
  id: string
  label: string
  hint: string
  files: File[]
  multiple?: boolean
  onFilesSelected: (files: File[]) => void
}

export default function FileUpload({
  id,
  label,
  hint,
  files,
  multiple = false,
  onFilesSelected,
}: FileUploadProps) {
  return (
    <div className="upload-field">
      <div className="upload-heading">
        <label htmlFor={id}>{label}</label>
        <span>{hint}</span>
      </div>
      <input
        id={id}
        type="file"
        accept=".json,application/json"
        multiple={multiple}
        onChange={(event) => onFilesSelected(Array.from(event.currentTarget.files ?? []))}
      />
      <FileStatus files={files} emptyMessage={multiple ? 'Optional' : 'No file selected'} />
    </div>
  )
}
