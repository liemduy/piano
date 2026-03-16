(() => {
    const { SearchIcon, Trash2Icon } = window.AppIcons;

    const CloudControls = ({
        currentUser,
        cloudDirty,
        currentSongId,
        libraryItems,
        title,
        libraryBusy,
        showLibraryMenu,
        setShowLibraryMenu,
        librarySearch,
        setLibrarySearch,
        filteredLibraryItems,
        handleLibrarySelect,
        handleDeleteLibrarySong,
        cloudBusy,
        handleNewLibraryDraft,
        handleSaveToLibrary,
        showAccountMenu,
        setShowAccountMenu,
        sessionChecked,
        lastCloudSavedAt,
        formatLibraryTime,
        handleSignOut,
        openAuthModal,
    }) => (
        <div className="flex flex-wrap items-center gap-2 px-2 py-1.5 rounded-2xl border border-slate-200 bg-slate-50/90 shadow-sm">
            <div className="hidden sm:flex items-center gap-2 pr-1 border-r border-slate-200">
                <span className={`w-2 h-2 rounded-full ${currentUser ? (cloudDirty ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-slate-300'}`}></span>
                <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Library</span>
            </div>

            <div className="relative z-[9999]" data-library-root>
                <button
                    onClick={() => {
                        if (!currentUser) return;
                        setLibrarySearch('');
                        setShowLibraryMenu((value) => !value);
                    }}
                    disabled={!currentUser}
                    className={`h-9 min-w-[190px] max-w-[250px] px-3 text-sm border rounded-xl outline-none transition-all flex items-center gap-2 ${!currentUser ? 'border-slate-200 bg-white text-slate-400 cursor-not-allowed' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
                    title={currentUser ? 'Open your Library' : 'Sign in to use Library'}
                >
                    <span className="truncate flex-1 text-left">
                        {!currentUser
                            ? 'Sign in for Library'
                            : currentSongId
                                ? (libraryItems.find((song) => song.id === currentSongId)?.title || title || 'Current song')
                                : (libraryBusy ? 'Loading Library...' : 'Select song')}
                    </span>
                    <span className="text-slate-400">v</span>
                </button>

                {showLibraryMenu && currentUser && (
                    <div className="absolute left-0 top-full mt-2 w-[340px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-3 border-b border-slate-100 bg-slate-50">
                            <div className="relative">
                                <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={librarySearch}
                                    onChange={(event) => setLibrarySearch(event.target.value)}
                                    placeholder="Search songs..."
                                    className="w-full h-10 pl-9 pr-3 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                />
                            </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                            {filteredLibraryItems.length === 0 ? (
                                <div className="px-3 py-8 text-center text-sm text-slate-500">
                                    {libraryItems.length ? 'No songs match your search.' : 'Your Library is empty.'}
                                </div>
                            ) : (
                                filteredLibraryItems.map((song) => (
                                    <div
                                        key={song.id}
                                        className={`flex items-stretch gap-1 rounded-xl border ${song.id === currentSongId ? 'border-indigo-200 bg-indigo-50/70' : 'border-transparent bg-white hover:bg-slate-50'}`}
                                    >
                                        <button
                                            onClick={() => handleLibrarySelect(song.id)}
                                            className="flex-1 min-w-0 px-3 py-2.5 text-left"
                                        >
                                            <div className="text-sm font-semibold text-slate-900 truncate">{song.title || 'Untitled'}</div>
                                            <div className="text-[12px] text-slate-500 truncate">{song.composer || 'No composer'} - {formatLibraryTime(song.updated_at)}</div>
                                        </button>
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleDeleteLibrarySong(song.id);
                                            }}
                                            disabled={cloudBusy}
                                            className="self-center mr-1 w-9 h-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all disabled:opacity-40"
                                            title="Delete song"
                                        >
                                            <Trash2Icon size={16} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={handleNewLibraryDraft}
                className="h-9 px-3 text-sm font-medium rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all"
                title="Create a new song"
            >
                New
            </button>

            <button
                onClick={handleSaveToLibrary}
                disabled={cloudBusy}
                className={`h-9 px-3 text-sm font-medium rounded-xl transition-all shadow-sm ${cloudBusy ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}`}
                title="Save the current song to your personal Library"
            >
                {cloudBusy ? 'Saving...' : 'Save'}
            </button>

            <div className="relative z-[9999]" data-account-root>
                <button
                    onClick={() => setShowAccountMenu((value) => !value)}
                    className="h-9 pl-3 pr-2 text-sm font-medium rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-2 max-w-[180px]"
                    title={currentUser ? (currentUser.email || 'User') : 'Account'}
                >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${currentUser ? (cloudDirty ? 'bg-amber-400' : 'bg-emerald-400') : 'bg-slate-300'}`}></span>
                    <span className="truncate">
                        {!sessionChecked
                            ? 'Checking...'
                            : currentUser
                                ? (currentUser.email || 'Account')
                                : 'Account'}
                    </span>
                    <span className="text-slate-400">v</span>
                </button>

                {showAccountMenu && (
                    <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                            <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Account</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 truncate">
                                {currentUser ? (currentUser.email || 'User') : 'Not signed in'}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                                {!sessionChecked
                                    ? 'Checking your session...'
                                    : !currentUser
                                        ? 'Local draft mode'
                                        : currentSongId
                                            ? (cloudDirty ? 'Unsaved changes' : 'Saved to Library')
                                            : (cloudDirty ? 'New draft not saved yet' : 'New song, not saved yet')}
                            </div>
                            {lastCloudSavedAt && currentUser && (
                                <div className="mt-1 text-[11px] text-slate-400">Last saved: {formatLibraryTime(lastCloudSavedAt)}</div>
                            )}
                        </div>

                        {currentUser ? (
                            <button
                                onClick={handleSignOut}
                                disabled={cloudBusy}
                                className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-all"
                            >
                                Sign out
                            </button>
                        ) : (
                            <div className="p-3 flex items-center gap-2">
                                <button
                                    onClick={() => openAuthModal('signin')}
                                    className="flex-1 h-10 text-sm font-medium rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all"
                                >
                                    Sign in
                                </button>
                                <button
                                    onClick={() => openAuthModal('signup')}
                                    className="flex-1 h-10 text-sm font-medium rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-all"
                                >
                                    Create account
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    window.AppComponents = window.AppComponents || {};
    window.AppComponents.CloudControls = CloudControls;
})();
