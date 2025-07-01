import { useState, useEffect, useCallback } from "react"
import { FileEntry } from "../types/app"

interface RemoteConnectionState {
  isRemoteWindow: boolean
  remoteConnectionId: string | null
  remoteConnectionName: string | null
}

interface UseRemoteConnectionReturn extends RemoteConnectionState {
  loadRemoteFiles: (connectionId: string) => Promise<void>
  handleRemoteFileSelect: (path: string, isDir: boolean, openBuffer: (path: string, name: string, content: string, isSQLite: boolean, isImage: boolean, isDiff: boolean, isVirtual: boolean) => void) => Promise<void>
  setFiles: (files: FileEntry[]) => void
}

export function useRemoteConnection(
  _files: FileEntry[],
  setFiles: (files: FileEntry[]) => void,
  _refreshAllProjectFiles?: () => void
): UseRemoteConnectionReturn {
  const [isRemoteWindow, setIsRemoteWindow] = useState(false)
  const [remoteConnectionId, setRemoteConnectionId] = useState<string | null>(null)
  const [remoteConnectionName, setRemoteConnectionName] = useState<string | null>(null)

  const getInitialRemoteState = () => {
    try {
      if (typeof window !== "undefined" && window.location) {
        const searchParams = new URLSearchParams(window.location.search)
        const remoteId = searchParams.get("remote")
        if (remoteId) {
          return {
            isRemote: true,
            connectionId: remoteId,
            connectionName: "Remote Connection",
          }
        }
      }
    } catch (error) {
      console.error("Error checking initial remote state:", error)
    }
    return { isRemote: false, connectionId: null, connectionName: null }
  }

  const loadRemoteFiles = useCallback(async (connectionId: string) => {
    try {
      console.log("Loading remote files for connection:", connectionId)
      const { invoke } = await import("@tauri-apps/api/core")
      const remoteFiles = await invoke<any[]>("ssh_list_directory", {
        connectionId,
        path: "/",
      })

      const convertedFiles: FileEntry[] = remoteFiles.map((file) => ({
        name: file.name,
        path: file.path,
        isDir: file.is_dir,
        expanded: false,
        children: undefined,
      }))

      setFiles(convertedFiles)
    } catch (error) {
      console.error("Failed to load remote files:", error)
    }
  }, [setFiles])

  const handleRemoteFileSelect = useCallback(async (
    path: string, 
    isDir: boolean, 
    openBuffer: (path: string, name: string, content: string, isSQLite: boolean, isImage: boolean, isDiff: boolean, isVirtual: boolean) => void
  ) => {
    if (isDir || !remoteConnectionId) return

    try {
      const { invoke } = await import("@tauri-apps/api/core")
      const content = await invoke<string>("ssh_read_file", {
        connectionId: remoteConnectionId,
        filePath: path,
      })

      const fileName = path.split("/").pop() || path
      openBuffer(
        `remote://${remoteConnectionId}${path}`,
        fileName,
        content,
        false,
        false,
        false,
        false
      )
    } catch (error) {
      console.error("Failed to read remote file:", error)
      
      try {
        const { message } = await import("@tauri-apps/plugin-dialog")
        await message(`Failed to read file: ${error}`, {
          title: "Remote File Error",
          kind: "error",
        })
      } catch {
        console.error("Failed to read file:", error)
      }
    }
  }, [remoteConnectionId])

  useEffect(() => {
    const checkRemoteWindow = async () => {
      try {
        const initialRemoteState = getInitialRemoteState()
        let connectionId: string | null = initialRemoteState.connectionId
        let connectionName = initialRemoteState.connectionName || "Remote Connection"

        if (initialRemoteState.isRemote) {
          setIsRemoteWindow(true)
          setRemoteConnectionId(connectionId)
          setRemoteConnectionName(connectionName)
        }

        const urlParams = new URLSearchParams(window.location.search)
        const remoteParam = urlParams.get("remote")

        if (remoteParam) {
          connectionId = remoteParam
          setIsRemoteWindow(true)
          setRemoteConnectionId(remoteParam)

          try {
            const stored = localStorage.getItem("athas-remote-connections")
            if (stored) {
              const connections = JSON.parse(stored)
              const connection = connections.find((conn: any) => conn.id === remoteParam)
              connectionName = connection ? connection.name : "Remote Connection"
              setRemoteConnectionName(connectionName)
            } else {
              setRemoteConnectionName(connectionName)
            }
          } catch {
            setRemoteConnectionName(connectionName)
          }
        }

        if (!connectionId) {
          const { getCurrentWindow } = await import("@tauri-apps/api/window")
          const currentWindow = getCurrentWindow()
          const label = await currentWindow.label

          if (label.startsWith("remote-")) {
            connectionId = label.replace("remote-", "")
            setIsRemoteWindow(true)
            setRemoteConnectionId(connectionId)

            try {
              const stored = localStorage.getItem("athas-remote-connections")
              if (stored) {
                const connections = JSON.parse(stored)
                const connection = connections.find((conn: any) => conn.id === connectionId)
                connectionName = connection ? connection.name : "Remote Connection"
                setRemoteConnectionName(connectionName)
              } else {
                setRemoteConnectionName(connectionName)
              }
            } catch {
              setRemoteConnectionName(connectionName)
            }
          }
        }

        if (connectionId) {
          await loadRemoteFiles(connectionId)
        }

        const { listen } = await import("@tauri-apps/api/event")
        const unlisten = await listen("remote-connection-info", (event: any) => {
          const {
            connectionId: eventConnectionId,
            connectionName: eventConnectionName,
            isRemoteWindow: remote,
          } = event.payload
          setIsRemoteWindow(remote)
          setRemoteConnectionId(eventConnectionId)
          setRemoteConnectionName(eventConnectionName)

          if (remote && eventConnectionId) {
            loadRemoteFiles(eventConnectionId)
          }
        })

        return unlisten
      } catch (error) {
        console.error("Error in enhanced remote window detection:", error)
      }
    }

    checkRemoteWindow()
  }, [loadRemoteFiles])

  return {
    isRemoteWindow,
    remoteConnectionId,
    remoteConnectionName,
    loadRemoteFiles,
    handleRemoteFileSelect,
    setFiles,
  }
} 