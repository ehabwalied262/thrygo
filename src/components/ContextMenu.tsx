interface ContextMenuProps {
  contextMenu: {
    x: number;
    y: number;
    items: { label: string; action: () => void; icon: string }[];
  } | null;
  setContextMenu: (menu: any) => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ contextMenu, setContextMenu }) => {
  if (!contextMenu) return null;

  return (
    <div
      className="context-menu bg-dark-nav ring-1 ring-white/10 border-text-hover rounded shadow-md transform transition-all duration-200 ease-in-out animate-slide-down"
      style={{ position: 'absolute', left: contextMenu.x, top: contextMenu.y, zIndex: 1000 }}
    >
      {contextMenu.items.map((item, index) => (
        <div
          key={index}
          className="px-4 py-2 text-text-primary hover:bg-[#4a5568] cursor-pointer flex items-center text-sm"
          onClick={(e) => {
            e.stopPropagation();
            item.action();
            setContextMenu(null);
          }}
        >
          <i className={`${item.icon} mr-2`}></i>
          {item.label}
        </div>
      ))}
    </div>
  );
};

export default ContextMenu;