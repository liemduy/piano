const AppIcons = window.AppIcons || (window.AppIcons = {});

// --- CÁC BIỂU TƯỢNG (ICONS) ---
        // Thay thế thư viện lucide-react bằng các icon SVG thuần để chạy trực tiếp trên file HTML
        const Icon = ({ children, size = 24, className = '' }) => (
            <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{children}</svg>
        );
        const Music = (p) => <Icon {...p}><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></Icon>;
        const Play = (p) => <Icon {...p}><polygon points="5 3 19 12 5 21 5 3"></polygon></Icon>;
        const Pause = (p) => <Icon {...p}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></Icon>;
        const Square = (p) => <Icon {...p}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></Icon>;
        const Plus = (p) => <Icon {...p}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></Icon>;
        const Settings = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></Icon>;
        const XIcon = (p) => <Icon {...p}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></Icon>;
        const Edit3 = (p) => <Icon {...p}><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></Icon>;
        const AlignLeft = (p) => <Icon {...p}><line x1="21" y1="6" x2="3" y2="6"></line><line x1="15" y1="12" x2="3" y2="12"></line><line x1="17" y1="18" x2="3" y2="18"></line></Icon>;
        const Layers = (p) => <Icon {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></Icon>;
        const CopyIcon = (p) => <Icon {...p}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></Icon>;
        const Check = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12"></polyline></Icon>;
const DownloadIcon = (p) => <Icon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
    <polyline points="7 10 12 15 17 10"></polyline>
    <line x1="12" y1="15" x2="12" y2="3"></line>
</Icon>;
const GlobeIcon = (p) => <Icon {...p}>
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
</Icon>;



        const PaletteIcon = (p) => <Icon {...p}>
            <path d="M12 22a10 10 0 1 1 10-10c0 3.5-2.5 4.5-4 4.5h-1.5a2 2 0 0 0-2 2c0 1.5-1 2.5-2.5 2.5Z"></path>
            <circle cx="7.5" cy="10.5" r="1"></circle>
            <circle cx="12" cy="7.5" r="1"></circle>
            <circle cx="16.5" cy="10.5" r="1"></circle>
            <circle cx="9.5" cy="15" r="1"></circle>
        </Icon>;

const SearchIcon = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></Icon>;
const Trash2Icon = (p) => <Icon {...p}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path></Icon>;

// Rest icons (SVG) để tránh lỗi font trên một số thiết bị
        const RestQuarterIcon = (p) => (
            <Icon {...p}>
                <path d="M13 3 L10 8 L14 12 L11 16 L13 21"></path>
            </Icon>
        );
        const RestEighthIcon = (p) => (
            <Icon {...p}>
                <path d="M13 3 C18 4 18 8 13 9"></path>
                <path d="M13 3 L10 8 L14 12 L11 16 L13 21"></path>
            </Icon>
        );

        const RestSixteenthIcon = (p) => (
            <Icon {...p}>
                <path d="M13 3 C18 4 18 7 13 8"></path>
                <path d="M13 8 C18 9 18 12 13 13"></path>
                <path d="M13 3 L10 8 L14 12 L11 16 L13 21"></path>
            </Icon>
        );

        const RestThirtySecondIcon = (p) => (
            <Icon {...p}>
                <path d="M13 3 C18 4 18 6.6 13 7.6"></path>
                <path d="M13 7.6 C18 8.6 18 11.2 13 12.2"></path>
                <path d="M13 12.2 C18 13.2 18 15.8 13 16.8"></path>
                <path d="M13 3 L10 8 L14 12 L11 16 L13 21"></path>
            </Icon>
        );

        const UndoIcon = (p) => <Icon {...p}>
            <path d="M3 7v6h6"></path>
            <path d="M3 13c2.5-4 6-6 11-6h7"></path>
        </Icon>;
        const RedoIcon = (p) => <Icon {...p}>
            <path d="M21 7v6h-6"></path>
            <path d="M21 13c-2.5-4-6-6-11-6H3"></path>
        </Icon>;
        const RotateCcwIcon = (p) => <Icon {...p}>
            <path d="M3 2v6h6"></path>
            <path d="M3 8a9 9 0 1 1 3 6"></path>
        </Icon>;

        const SparklesIcon = (p) => <Icon {...p}>
            <path d="M12 2l1.2 3.6L17 7l-3.8 1.4L12 12l-1.2-3.6L7 7l3.8-1.4L12 2z"></path>
            <path d="M5 13l.7 2.1L8 16l-2.3.9L5 19l-.7-2.1L2 16l2.3-.9L5 13z"></path>
            <path d="M19 14l.9 2.6L23 18l-3.1 1.4L19 22l-.9-2.6L15 18l3.1-1.4L19 14z"></path>
        </Icon>;



        // --- CẤU HÌNH & HẰNG SỐ ---

Object.assign(AppIcons, {
    Icon,
    Music,
    Play,
    Pause,
    Square,
    Plus,
    Settings,
    XIcon,
    Edit3,
    AlignLeft,
    Layers,
    CopyIcon,
    Check,
    DownloadIcon,
    GlobeIcon,
    PaletteIcon,
    SearchIcon,
    Trash2Icon,
    RestQuarterIcon,
    RestEighthIcon,
    RestSixteenthIcon,
    RestThirtySecondIcon,
    UndoIcon,
    RedoIcon,
    RotateCcwIcon,
    SparklesIcon,
});
