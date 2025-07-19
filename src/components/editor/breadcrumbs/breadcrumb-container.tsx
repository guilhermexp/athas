import { useBufferStore } from "../../../stores/buffer-store";
import { useFileSystemStore } from "../../../stores/file-system-store";
import Breadcrumb from "./breadcrumb";

export default function BreadcrumbContainer() {
  const activeBuffer = useBufferStore(state => state.getActiveBuffer());
  const { rootFolderPath, handleFileSelect } = useFileSystemStore();

  const handleNavigate = async (path: string) => {
    try {
      await handleFileSelect(path, false);
    } catch (error) {
      console.error("Failed to navigate to path:", path, error);
    }
  };

  if (!activeBuffer) {
    return null;
  }

  return (
    <Breadcrumb
      filePath={activeBuffer.path}
      rootPath={rootFolderPath}
      onNavigate={handleNavigate}
      isOutlineVisible={false}
      onToggleOutline={() => {}}
    />
  );
}
