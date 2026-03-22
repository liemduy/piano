(function () {
    const { useEffect } = React;

    function useDismissibleLayer(isOpen, selector, onDismiss) {
        useEffect(() => {
            if (!isOpen) return undefined;

            const handlePointerDown = (event) => {
                const element = event.target;
                const root = element && element.closest ? element.closest(selector) : null;
                if (root) return;
                onDismiss();
            };

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') onDismiss();
            };

            document.addEventListener('mousedown', handlePointerDown);
            document.addEventListener('keydown', handleKeyDown);
            return () => {
                document.removeEventListener('mousedown', handlePointerDown);
                document.removeEventListener('keydown', handleKeyDown);
            };
        }, [isOpen, selector, onDismiss]);
    }

    function useEscapeToClose(isOpen, onDismiss) {
        useEffect(() => {
            if (!isOpen) return undefined;

            const handleKeyDown = (event) => {
                if (event.key === 'Escape') onDismiss();
            };

            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }, [isOpen, onDismiss]);
    }

    window.AppHooks = {
        useDismissibleLayer,
        useEscapeToClose,
    };
})();
