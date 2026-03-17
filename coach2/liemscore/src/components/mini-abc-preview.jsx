const AppComponents = window.AppComponents || (window.AppComponents = {});

const MiniAbcPreview = ({ abc }) => {
            const ref = React.useRef(null);

            React.useEffect(() => {
                if (!ref.current) return;
                ref.current.innerHTML = '';

                if (!window.ABCJS || !abc) return;

                try {
                    window.ABCJS.renderAbc(ref.current, abc, {
                        responsive: 'resize',
                        staffwidth: 112,
                        paddingtop: 0,
                        paddingbottom: 0,
                        paddingleft: 0,
                        paddingright: 0,
                        add_classes: false,
                        scale: 0.75,
                    });
                    const svg = ref.current.querySelector('svg');
                    if (svg) {
                        svg.style.display = 'block';
                        svg.style.width = '100%';
                        svg.style.height = 'auto';
                    }
                } catch (err) {
                    ref.current.innerHTML = '<div style="padding:6px 4px;font-size:11px;color:#64748b;font-family:monospace;">preview</div>';
                }
            }, [abc]);

            return (
                <div className="w-[118px] min-h-[34px] shrink-0 overflow-hidden rounded-md border border-slate-100 bg-white px-1 py-0.5">
                    <div ref={ref} className="pointer-events-none" />
                </div>
            );
        };

AppComponents.MiniAbcPreview = MiniAbcPreview;
