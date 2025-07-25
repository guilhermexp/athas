import { useBufferStore } from "../../../stores/buffer-store";
import { useFileSystemStore } from "../../../stores/file-system/store";
import { useUIState } from "../../../stores/ui-state-store";
import Breadcrumb from "./breadcrumb";

export default function BreadcrumbContainer() {
  const activeBuffer = useBufferStore(state => state.getActiveBuffer());
  const { rootFolderPath, handleFileSelect } = useFileSystemStore();
  const { isFindVisible, setIsFindVisible } = useUIState();

  const handleNavigate = async (path: string) => {
    try {
      await handleFileSelect(path, false);
    } catch (error) {
      console.error("Failed to navigate to path:", path, error);
    }
  };

  const handleSearchClick = () => {
    setIsFindVisible(!isFindVisible);
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
      onSearchClick={handleSearchClick}
    />
  );
}
