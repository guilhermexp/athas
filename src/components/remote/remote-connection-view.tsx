import { useState, useEffect } from "react";
import { invoke } from '@tauri-apps/api/core';
import ConnectionDialog from "./connection-dialog";
import ConnectionList from "./connection-list";
import { RemoteConnection, RemoteConnectionFormData } from "./types";

interface RemoteConnectionViewProps {
  onFileSelect?: (path: string, isDir: boolean) => void;
}

const RemoteConnectionView = ({
  onFileSelect
}: RemoteConnectionViewProps) => {
  const [connections, setConnections] = useState<RemoteConnection[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<RemoteConnection | null>(null);

  // Load connections from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('athas-remote-connections');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConnections(parsed.map((conn: any) => ({ ...conn, isConnected: false })));
      } catch (error) {
        console.error('Error loading remote connections:', error);
      }
    }
  }, []);

  // Save connections to localStorage with error handling
  const saveConnections = (conns: RemoteConnection[]) => {
    try {
      const dataToStore = JSON.stringify(conns);
      localStorage.setItem('athas-remote-connections', dataToStore);
      setConnections(conns);
    } catch (error) {
      console.error('Error saving remote connections:', error);
      
      // If quota exceeded, try to clear and retry
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        try {
          // Clear existing connections and try again
          localStorage.removeItem('athas-remote-connections');
          localStorage.setItem('athas-remote-connections', JSON.stringify(conns));
          setConnections(conns);
          console.log('Successfully saved after clearing old data');
        } catch (retryError) {
          console.error('Failed to save even after clearing:', retryError);
          // At least update the state even if localStorage fails
          setConnections(conns);
        }
      } else {
        // For other errors, still update state
        setConnections(conns);
      }
    }
  };

  const handleSaveConnection = async (formData: RemoteConnectionFormData): Promise<boolean> => {
    try {
      let updatedConnections: RemoteConnection[];
      
      if (editingConnection) {
        // Update existing connection
        updatedConnections = connections.map(conn => 
          conn.id === editingConnection.id 
            ? { 
                ...conn, 
                ...formData,
                isConnected: false // Reset connection status when editing
              }
            : conn
        );
      } else {
        // Add new connection
        const newConnection: RemoteConnection = {
          id: Date.now().toString(),
          ...formData,
          isConnected: false,
        };
        updatedConnections = [...connections, newConnection];
      }
      
      // Use the safe save function
      saveConnections(updatedConnections);
      
      return true;
    } catch (error) {
      console.error('Error saving connection:', error);
      return false;
    }
  };

  const handleConnect = async (connectionId: string) => {
    const connection = connections.find(conn => conn.id === connectionId);
    if (!connection) return;

    try {
      if (connection.isConnected) {
        // Disconnect
        await invoke('ssh_disconnect', { connectionId });
        
        setConnections(connections.map(conn => 
          conn.id === connectionId 
            ? { ...conn, isConnected: false }
            : conn
        ));
      } else {
        // Connect
        await invoke('ssh_connect', {
          connectionId,
          host: connection.host,
          port: connection.port,
          username: connection.username,
          password: connection.password || null,
          keyPath: connection.keyPath || null,
          useSftp: connection.type === 'sftp'
        });

        // Update connection status
        setConnections(connections.map(conn => 
          conn.id === connectionId 
            ? { ...conn, isConnected: true, lastConnected: new Date().toISOString() }
            : conn
        ));

        // Create new remote window
        await invoke('create_remote_window', {
          connectionId,
          connectionName: connection.name
        });
      }
    } catch (error) {
      console.error('Connection error:', error);
      
      // Use Tauri's dialog API instead of alert
      try {
        const { message } = await import('@tauri-apps/plugin-dialog');
        await message(`Connection failed: ${error}`, {
          title: 'SSH Connection Error',
          kind: 'error'
        });
      } catch {
        // Fallback to console if dialog fails
        console.error('Connection failed:', error);
      }
    }
  };

  const handleEditConnection = (connection: RemoteConnection) => {
    setEditingConnection(connection);
    setIsDialogOpen(true);
  };

  const handleDeleteConnection = (connectionId: string) => {
    saveConnections(connections.filter(conn => conn.id !== connectionId));
  };

  const handleAddNew = () => {
    setEditingConnection(null);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingConnection(null);
  };

  return (
    <>
      <ConnectionList
        connections={connections}
        onConnect={handleConnect}
        onEdit={handleEditConnection}
        onDelete={handleDeleteConnection}
        onFileSelect={onFileSelect}
        onAddNew={handleAddNew}
      />

      <ConnectionDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        onSave={handleSaveConnection}
        editingConnection={editingConnection}
      />
    </>
  );
};

export default RemoteConnectionView; 