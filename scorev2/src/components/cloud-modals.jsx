(() => {
    const { XIcon } = window.AppIcons;

    const CloudModals = ({
        showSaveChoiceModal,
        setShowSaveChoiceModal,
        cloudBusy,
        title,
        performSaveToLibrary,
        showAuthModal,
        closeAuthModal,
        authMode,
        setAuthMode,
        setAuthError,
        setAuthInfo,
        setPasswordRecoveryReady,
        authEmail,
        setAuthEmail,
        authPassword,
        setAuthPassword,
        handleAuthSubmit,
        handleForgotPassword,
        authBusy,
        authError,
        authInfo,
        passwordRecoveryReady,
    }) => {
        const switchAuthMode = (mode) => {
            setAuthMode(mode);
            setAuthError('');
            setAuthInfo('');
            setPasswordRecoveryReady(false);
        };

        return (
            <>
                {showSaveChoiceModal && (
                    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/45" onClick={() => setShowSaveChoiceModal(false)} />
                        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-slate-900">Save changes to Library?</div>
                                    <div className="text-[11px] text-slate-500">You are about to overwrite an existing song.</div>
                                </div>
                                <button
                                    onClick={() => setShowSaveChoiceModal(false)}
                                    className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                                    title="Close"
                                >
                                    <XIcon size={18} className="text-slate-600" />
                                </button>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="text-sm text-slate-600 leading-relaxed">
                                    <span className="font-semibold text-slate-900">{title || 'Untitled'}</span> is already linked to this editor. Choose how you want to save it.
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                        onClick={() => setShowSaveChoiceModal(false)}
                                        className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => performSaveToLibrary('new')}
                                        disabled={cloudBusy}
                                        className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-all disabled:opacity-50"
                                    >
                                        Save as New Song
                                    </button>
                                    <button
                                        onClick={() => performSaveToLibrary('overwrite')}
                                        disabled={cloudBusy}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${cloudBusy ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200'}`}
                                    >
                                        {cloudBusy ? 'Saving…' : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showAuthModal && (
                    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/45" onClick={closeAuthModal} />
                        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-bold text-slate-900">{authMode === 'recovery' ? 'Reset password' : (authMode === 'signin' ? 'Sign in' : 'Create account')}</div>
                                    <div className="text-[11px] text-slate-500">Each account has its own Library.</div>
                                </div>
                                <button
                                    onClick={closeAuthModal}
                                    className="p-2 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                                    title="Close"
                                >
                                    <XIcon size={18} className="text-slate-600" />
                                </button>
                            </div>

                            <div className="p-5 space-y-4">
                                {authMode !== 'recovery' && (
                                    <div className="flex bg-slate-100 rounded-lg p-1">
                                        <button
                                            onClick={() => switchAuthMode('signin')}
                                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${authMode === 'signin' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            Sign in
                                        </button>
                                        <button
                                            onClick={() => switchAuthMode('signup')}
                                            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${authMode === 'signup' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            Create account
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {authMode !== 'recovery' && (
                                        <div>
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Email</label>
                                            <input
                                                type="email"
                                                value={authEmail}
                                                onChange={(e) => setAuthEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className="w-full text-sm border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">{authMode === 'recovery' ? 'New password' : 'Password'}</label>
                                        <input
                                            type="password"
                                            value={authPassword}
                                            onChange={(e) => setAuthPassword(e.target.value)}
                                            placeholder={authMode === 'recovery' ? 'Enter your new password' : 'At least 6 characters'}
                                            className="w-full text-sm border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleAuthSubmit();
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                {authError && (
                                    <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                        {authError}
                                    </div>
                                )}

                                {authInfo && (
                                    <div className="text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 leading-relaxed">
                                        {authInfo}
                                    </div>
                                )}

                                {authMode === 'signin' && (
                                    <div className="flex items-center justify-between gap-3 text-[12px]">
                                        <button
                                            onClick={handleForgotPassword}
                                            disabled={authBusy}
                                            className="text-indigo-600 hover:text-indigo-700 font-medium transition-all disabled:opacity-50"
                                        >
                                            Forgot password?
                                        </button>
                                        <div className="text-slate-400">We will send a password reset email.</div>
                                    </div>
                                )}

                                {authMode === 'recovery' && passwordRecoveryReady && (
                                    <div className="text-[12px] text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 leading-relaxed">
                                        Your reset link has been confirmed. Enter a new password and save it.
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2 pt-1">
                                    <button
                                        onClick={closeAuthModal}
                                        className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all"
                                    >
                                        Close
                                    </button>
                                    <button
                                        onClick={handleAuthSubmit}
                                        disabled={authBusy}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${authBusy ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200'}`}
                                    >
                                        {authBusy ? 'Working…' : (authMode === 'recovery' ? 'Save new password' : (authMode === 'signin' ? 'Sign in' : 'Create account'))}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    window.AppComponents = window.AppComponents || {};
    window.AppComponents.CloudModals = CloudModals;
})();
