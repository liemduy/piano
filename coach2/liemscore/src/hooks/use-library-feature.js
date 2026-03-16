(function () {
    const { useState, useRef, useEffect, useCallback } = React;

    function useLibraryFeature(options) {
        const {
            supabaseClient,
            showToast,
            editorState,
            editorActions,
            editorConfig,
            resetEditorToDefault,
        } = options;

        const {
            abcText,
            title,
            composer,
            meter,
            tempo,
            keyTonic,
            keyMode,
            keySigInput,
            keySigDirty,
            lang,
            theme,
            duration,
            isDotted,
            activeVoice,
            voices,
        } = editorState;

        const {
            setTitle,
            setComposer,
            setMeter,
            setTempo,
            setKeyTonic,
            setKeyMode,
            setKeySigInput,
            setKeySigDirty,
            setLang,
            setTheme,
            setDuration,
            setIsDotted,
            setActiveVoice,
            applyTextChange,
            syncVoicesFromText,
        } = editorActions;

        const {
            DEFAULT_ABC,
            KEY_SIG_HINT,
            THEMES,
            DURATION_ORDER,
            buildKeyString,
            getHeaderValue,
            parseKeyLine,
        } = editorConfig;

        const [sessionChecked, setSessionChecked] = useState(false);
        const [currentUser, setCurrentUser] = useState(null);
        const [showAuthModal, setShowAuthModal] = useState(false);
        const [showAccountMenu, setShowAccountMenu] = useState(false);
        const [showLibraryMenu, setShowLibraryMenu] = useState(false);
        const [librarySearch, setLibrarySearch] = useState('');
        const [showSaveChoiceModal, setShowSaveChoiceModal] = useState(false);
        const [authMode, setAuthMode] = useState('signin');
        const [authEmail, setAuthEmail] = useState('');
        const [authPassword, setAuthPassword] = useState('');
        const [authBusy, setAuthBusy] = useState(false);
        const [authError, setAuthError] = useState('');
        const [authInfo, setAuthInfo] = useState('');
        const [passwordRecoveryReady, setPasswordRecoveryReady] = useState(false);
        const [libraryItems, setLibraryItems] = useState([]);
        const [libraryBusy, setLibraryBusy] = useState(false);
        const [currentSongId, setCurrentSongId] = useState('');
        const [cloudBusy, setCloudBusy] = useState(false);
        const [cloudDirty, setCloudDirty] = useState(false);
        const [lastCloudSavedAt, setLastCloudSavedAt] = useState('');
        const cloudSnapshotRef = useRef('');

        const clearLinkedSong = useCallback(() => {
            setCurrentSongId('');
            setLastCloudSavedAt('');
            cloudSnapshotRef.current = '';
        }, []);

        const openAuthModal = useCallback((mode = 'signin') => {
            setShowAccountMenu(false);
            setAuthMode(mode);
            setAuthError('');
            setAuthInfo('');
            setPasswordRecoveryReady(false);
            setShowAuthModal(true);
        }, []);

        const closeAuthModal = useCallback(() => {
            setShowAuthModal(false);
            setShowAccountMenu(false);
            setAuthError('');
            setAuthInfo('');
            setAuthPassword('');
            setPasswordRecoveryReady(false);
        }, []);

        const formatLibraryTime = useCallback((iso) => {
            if (!iso) return '';
            try {
                return new Date(iso).toLocaleString('en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                });
            } catch (error) {
                return iso;
            }
        }, []);

        const filteredLibraryItems = libraryItems.filter((song) => {
            const query = String(librarySearch || '').trim().toLowerCase();
            if (!query) return true;
            const haystack = `${song?.title || ''} ${song?.composer || ''}`.toLowerCase();
            return haystack.includes(query);
        });

        const buildSongPayload = useCallback(() => {
            const parsedTempo = parseInt(String(tempo || '').trim(), 10);
            const keyValue = getHeaderValue(abcText, 'K') || buildKeyString(keyTonic, keyMode);

            return {
                title: String(title || '').trim() || 'New Song',
                composer: String(composer || '').trim(),
                meter: String(meter || '').trim() || '4/4',
                tempo_bpm: Number.isFinite(parsedTempo) ? parsedTempo : null,
                key_signature: String(keyValue || '').trim() || 'C',
                abc_text: String(abcText || DEFAULT_ABC),
                editor_state: {
                    lang,
                    theme,
                    duration,
                    isDotted,
                    activeVoice,
                    voices,
                    keyTonic,
                    keyMode,
                    keySigInput,
                    keySigDirty,
                },
            };
        }, [
            DEFAULT_ABC,
            abcText,
            activeVoice,
            buildKeyString,
            composer,
            duration,
            getHeaderValue,
            isDotted,
            keyMode,
            keySigDirty,
            keySigInput,
            keyTonic,
            lang,
            meter,
            tempo,
            theme,
            title,
            voices,
        ]);

        const buildSongSnapshot = useCallback((songLike) => {
            if (!songLike) return '';
            return JSON.stringify({
                title: String(songLike.title || '').trim(),
                composer: String(songLike.composer || '').trim(),
                meter: String(songLike.meter || '').trim(),
                tempo_bpm: songLike.tempo_bpm == null ? null : Number(songLike.tempo_bpm),
                key_signature: String(songLike.key_signature || '').trim(),
                abc_text: String(songLike.abc_text || ''),
                editor_state: JSON.stringify(songLike.editor_state || {}),
            });
        }, []);

        const markSongSaved = useCallback((songLike) => {
            setCurrentSongId(songLike?.id || '');
            setLastCloudSavedAt(songLike?.updated_at || '');
            cloudSnapshotRef.current = buildSongSnapshot(songLike);
        }, [buildSongSnapshot]);

        const isFreshDefaultScore = useCallback(() => {
            return (
                String(abcText || '').trim() === String(DEFAULT_ABC).trim() &&
                String(title || '').trim() === 'New Song' &&
                String(composer || '').trim() === 'Composer' &&
                String(meter || '').trim() === '4/4' &&
                String(tempo || '').trim() === '120' &&
                String(keyTonic || '').trim() === 'C' &&
                String(keyMode || '').trim() === 'major'
            );
        }, [DEFAULT_ABC, abcText, composer, keyMode, keyTonic, meter, tempo, title]);

        const fetchLibrary = useCallback(async (userId) => {
            if (!supabaseClient || !userId) {
                setLibraryItems([]);
                return;
            }

            setLibraryBusy(true);
            try {
                const { data, error } = await supabaseClient
                    .from('songs')
                    .select('id, title, composer, updated_at')
                    .eq('user_id', userId)
                    .order('updated_at', { ascending: false });

                if (error) throw error;
                setLibraryItems(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Load library failed', error);
                showToast('Could not load your library.');
            } finally {
                setLibraryBusy(false);
            }
        }, [showToast, supabaseClient]);

        const applySongToEditor = useCallback((song) => {
            const nextText = String(song?.abc_text || '').trim() ? String(song.abc_text) : DEFAULT_ABC;
            const editorSnapshot = (song && song.editor_state && typeof song.editor_state === 'object') ? song.editor_state : {};

            setTitle(song?.title || 'New Song');
            setComposer(song?.composer || 'Composer');
            setMeter(song?.meter || '4/4');
            setTempo(song?.tempo_bpm ? String(song.tempo_bpm) : '120');

            const keyParsed = parseKeyLine(song?.key_signature || getHeaderValue(nextText, 'K') || 'C');
            if (keyParsed && keyParsed.tonic) {
                setKeyTonic(keyParsed.tonic);
                setKeyMode(keyParsed.mode);
                setKeySigInput(keyParsed.sigInput || KEY_SIG_HINT);
                setKeySigDirty(!!keyParsed.sigDirty);
            } else {
                setKeyTonic('C');
                setKeyMode('major');
                setKeySigInput(KEY_SIG_HINT);
                setKeySigDirty(false);
            }

            if (editorSnapshot.lang) setLang(editorSnapshot.lang);
            if (editorSnapshot.theme && THEMES.includes(editorSnapshot.theme)) setTheme(editorSnapshot.theme);
            if (editorSnapshot.duration && DURATION_ORDER.includes(String(editorSnapshot.duration))) setDuration(String(editorSnapshot.duration));
            if (typeof editorSnapshot.isDotted === 'boolean') setIsDotted(editorSnapshot.isDotted);
            if (typeof editorSnapshot.activeVoice === 'number') setActiveVoice(editorSnapshot.activeVoice);

            applyTextChange(nextText, nextText.length, { focus: false, skipHistory: true });
            setTimeout(() => {
                try { syncVoicesFromText(nextText); } catch (error) {}
            }, 0);

            markSongSaved({
                id: song?.id || '',
                updated_at: song?.updated_at || '',
                title: song?.title || 'New Song',
                composer: song?.composer || '',
                meter: song?.meter || '4/4',
                tempo_bpm: song?.tempo_bpm ?? null,
                key_signature: song?.key_signature || 'C',
                abc_text: nextText,
                editor_state: editorSnapshot,
            });
        }, [
            DEFAULT_ABC,
            DURATION_ORDER,
            KEY_SIG_HINT,
            THEMES,
            applyTextChange,
            getHeaderValue,
            markSongSaved,
            parseKeyLine,
            setActiveVoice,
            setComposer,
            setDuration,
            setIsDotted,
            setKeyMode,
            setKeySigDirty,
            setKeySigInput,
            setKeyTonic,
            setLang,
            setMeter,
            setTempo,
            setTheme,
            setTitle,
            syncVoicesFromText,
        ]);

        const loadSongFromLibrary = useCallback(async (songId) => {
            if (!supabaseClient || !currentUser || !songId) return;

            setLibraryBusy(true);
            try {
                const { data, error } = await supabaseClient
                    .from('songs')
                    .select('*')
                    .eq('id', songId)
                    .eq('user_id', currentUser.id)
                    .single();

                if (error) throw error;
                applySongToEditor(data);
                showToast('Song loaded from Library.');
            } catch (error) {
                console.error('Load song failed', error);
                showToast('Could not open this song.');
            } finally {
                setLibraryBusy(false);
            }
        }, [applySongToEditor, currentUser, showToast, supabaseClient]);

        const handleLibrarySelect = useCallback(async (songId) => {
            if (!songId) {
                clearLinkedSong();
                return;
            }
            if (songId === currentSongId) {
                setShowLibraryMenu(false);
                return;
            }
            if (cloudDirty) {
                const ok = window.confirm('You have unsaved changes. Opening another song will discard them. Continue?');
                if (!ok) return;
            }
            await loadSongFromLibrary(songId);
            setShowLibraryMenu(false);
        }, [clearLinkedSong, cloudDirty, currentSongId, loadSongFromLibrary]);

        const handleForgotPassword = useCallback(async () => {
            if (!supabaseClient) {
                setAuthError('Account service is not ready yet.');
                return;
            }

            const email = String(authEmail || '').trim();
            if (!email) {
                setAuthError('Enter your email first to receive a reset link.');
                return;
            }

            setAuthBusy(true);
            setAuthError('');
            setAuthInfo('');
            try {
                const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
                    redirectTo: window.location.origin + window.location.pathname,
                });
                if (error) throw error;
                setAuthInfo('Reset instructions have been sent to your email. Open the email and follow the link.');
            } catch (error) {
                console.error('Reset password failed', error);
                setAuthError(error?.message ? String(error.message) : 'Could not send the reset email.');
            } finally {
                setAuthBusy(false);
            }
        }, [authEmail, supabaseClient]);

        const handleAuthSubmit = useCallback(async () => {
            if (!supabaseClient) {
                setAuthError('Account service is not ready yet.');
                return;
            }

            const email = String(authEmail || '').trim();
            const password = String(authPassword || '');

            if (authMode !== 'recovery' && !email) {
                setAuthError('Please enter your email.');
                return;
            }
            if (!password) {
                setAuthError(authMode === 'recovery' ? 'Please enter your new password.' : 'Please enter your password.');
                return;
            }
            if (password.length < 6) {
                setAuthError('Password should be at least 6 characters.');
                return;
            }

            setAuthBusy(true);
            setAuthError('');
            setAuthInfo('');
            try {
                if (authMode === 'signup') {
                    const { data, error } = await supabaseClient.auth.signUp({
                        email,
                        password,
                        options: {
                            emailRedirectTo: window.location.origin + window.location.pathname,
                        },
                    });
                    if (error) throw error;
                    if (data?.session?.user) {
                        showToast('Account created.');
                        closeAuthModal();
                    } else {
                        setAuthInfo('Your account has been created. Please check your email, confirm it, then sign in.');
                    }
                } else if (authMode === 'recovery') {
                    const { error } = await supabaseClient.auth.updateUser({ password });
                    if (error) throw error;
                    setPasswordRecoveryReady(false);
                    setAuthMode('signin');
                    setAuthPassword('');
                    if (typeof window !== 'undefined' && window.history?.replaceState) {
                        window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
                    }
                    showToast('Password updated.');
                    closeAuthModal();
                } else {
                    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    showToast('Signed in.');
                    closeAuthModal();
                }
            } catch (error) {
                console.error('Auth failed', error);
                setAuthError(error?.message ? String(error.message) : 'Could not complete your request.');
            } finally {
                setAuthBusy(false);
            }
        }, [authEmail, authMode, authPassword, closeAuthModal, showToast, supabaseClient]);

        const handleSignOut = useCallback(async () => {
            setShowAccountMenu(false);
            setShowLibraryMenu(false);
            setLibrarySearch('');
            if (!supabaseClient) return;

            setCloudBusy(true);
            try {
                const { error } = await supabaseClient.auth.signOut({ scope: 'local' });
                if (error) throw error;
            } catch (error) {
                console.error('Sign out failed', error);
                showToast('Could not sign out.');
            } finally {
                setCloudBusy(false);
            }
        }, [showToast, supabaseClient]);

        const handleResetText = useCallback(() => {
            const ok = window.confirm('Reset the score to the default ABC? This will replace the current content.');
            if (!ok) return;
            resetEditorToDefault({ skipHistory: false });
            setShowLibraryMenu(false);
            setLibrarySearch('');
            clearLinkedSong();
        }, [clearLinkedSong, resetEditorToDefault]);

        const handleNewLibraryDraft = useCallback(() => {
            if (cloudDirty) {
                const ok = window.confirm('You have unsaved changes. Creating a new song will discard them. Continue?');
                if (!ok) return;
            }
            resetEditorToDefault({ skipHistory: false });
            setShowLibraryMenu(false);
            setLibrarySearch('');
            clearLinkedSong();
            showToast('New draft created.');
        }, [clearLinkedSong, cloudDirty, resetEditorToDefault, showToast]);

        const performSaveToLibrary = useCallback(async (saveMode = 'new') => {
            if (!currentUser) {
                openAuthModal('signin');
                showToast('Sign in to save to Library.');
                return;
            }
            if (!supabaseClient) {
                showToast('Library is not ready yet.');
                return;
            }

            const payload = buildSongPayload();
            setCloudBusy(true);
            try {
                let response;
                if (saveMode === 'overwrite' && currentSongId) {
                    response = await supabaseClient
                        .from('songs')
                        .update(payload)
                        .eq('id', currentSongId)
                        .eq('user_id', currentUser.id)
                        .select('*')
                        .single();
                } else {
                    response = await supabaseClient
                        .from('songs')
                        .insert({ ...payload, user_id: currentUser.id })
                        .select('*')
                        .single();
                }

                const { data, error } = response;
                if (error) throw error;

                markSongSaved(data);
                await fetchLibrary(currentUser.id);
                setShowSaveChoiceModal(false);
                setShowLibraryMenu(false);
                showToast(saveMode === 'overwrite' ? 'Song updated in Library.' : 'Song saved to Library.');
            } catch (error) {
                console.error('Save library failed', error);
                showToast(error?.message ? String(error.message) : 'Could not save to Library.');
            } finally {
                setCloudBusy(false);
            }
        }, [buildSongPayload, currentSongId, currentUser, fetchLibrary, markSongSaved, openAuthModal, showToast, supabaseClient]);

        const handleSaveToLibrary = useCallback(async () => {
            if (!currentUser) {
                openAuthModal('signin');
                showToast('Sign in to save to Library.');
                return;
            }
            if (currentSongId) {
                setShowSaveChoiceModal(true);
                return;
            }
            await performSaveToLibrary('new');
        }, [currentSongId, currentUser, openAuthModal, performSaveToLibrary, showToast]);

        const handleDeleteLibrarySong = useCallback(async (songId) => {
            if (!currentUser || !supabaseClient || !songId) return;
            const song = libraryItems.find((item) => item.id === songId);
            const ok = window.confirm(`Delete "${song?.title || 'this song'}" from your Library?`);
            if (!ok) return;

            setCloudBusy(true);
            try {
                const { error } = await supabaseClient
                    .from('songs')
                    .delete()
                    .eq('id', songId)
                    .eq('user_id', currentUser.id);
                if (error) throw error;

                if (songId === currentSongId) {
                    clearLinkedSong();
                }

                await fetchLibrary(currentUser.id);
                setLibrarySearch('');
                showToast('Song deleted from Library.');
            } catch (error) {
                console.error('Delete song failed', error);
                showToast(error?.message ? String(error.message) : 'Could not delete this song.');
            } finally {
                setCloudBusy(false);
            }
        }, [clearLinkedSong, currentSongId, currentUser, fetchLibrary, libraryItems, showToast, supabaseClient]);

        useEffect(() => {
            if (!supabaseClient) {
                setSessionChecked(true);
                return undefined;
            }

            let active = true;
            const init = async () => {
                try {
                    const { data } = await supabaseClient.auth.getSession();
                    if (!active) return;
                    const user = data?.session?.user || null;
                    setCurrentUser(user);
                    if (user?.email) setAuthEmail(user.email);
                    if (user?.id) await fetchLibrary(user.id);
                } catch (error) {
                    console.error('Session init failed', error);
                } finally {
                    if (active) setSessionChecked(true);
                }
            };
            init();

            const recoveryLinkActive = typeof window !== 'undefined' && (window.location.hash || '').includes('type=recovery');
            if (recoveryLinkActive) {
                setPasswordRecoveryReady(true);
                setAuthMode('recovery');
                setShowAuthModal(true);
                setAuthError('');
                setAuthInfo('Reset link confirmed. Enter your new password.');
            }

            const { data: authListener } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
                const user = session?.user || null;
                setCurrentUser(user);
                setSessionChecked(true);
                setAuthPassword('');

                if (user?.email) setAuthEmail(user.email);

                if (event === 'PASSWORD_RECOVERY') {
                    setPasswordRecoveryReady(true);
                    setAuthMode('recovery');
                    setShowAccountMenu(false);
                    setShowAuthModal(true);
                    setAuthError('');
                    setAuthInfo('Reset link confirmed. Enter your new password.');
                }

                if (user?.id) {
                    await fetchLibrary(user.id);
                } else {
                    setLibraryItems([]);
                    clearLinkedSong();
                }

                if (event === 'SIGNED_OUT') {
                    setPasswordRecoveryReady(false);
                    showToast('Signed out.');
                }
            });

            return () => {
                active = false;
                try { authListener?.subscription?.unsubscribe(); } catch (error) {}
            };
        }, [clearLinkedSong, fetchLibrary, showToast, supabaseClient]);

        useEffect(() => {
            if (!showAuthModal) return undefined;
            const onKey = (event) => { if (event.key === 'Escape') closeAuthModal(); };
            document.addEventListener('keydown', onKey);
            return () => document.removeEventListener('keydown', onKey);
        }, [closeAuthModal, showAuthModal]);

        useEffect(() => {
            if (!currentUser) {
                setCloudDirty(false);
                return;
            }
            if (!currentSongId) {
                setCloudDirty(!isFreshDefaultScore());
                return;
            }
            const nextSnapshot = buildSongSnapshot(buildSongPayload());
            setCloudDirty(nextSnapshot !== cloudSnapshotRef.current);
        }, [
            buildSongPayload,
            buildSongSnapshot,
            currentSongId,
            currentUser,
            isFreshDefaultScore,
        ]);

        return {
            sessionChecked,
            currentUser,
            showAuthModal,
            setShowAuthModal,
            showAccountMenu,
            setShowAccountMenu,
            showLibraryMenu,
            setShowLibraryMenu,
            librarySearch,
            setLibrarySearch,
            showSaveChoiceModal,
            setShowSaveChoiceModal,
            authMode,
            setAuthMode,
            authEmail,
            setAuthEmail,
            authPassword,
            setAuthPassword,
            authBusy,
            authError,
            setAuthError,
            authInfo,
            setAuthInfo,
            passwordRecoveryReady,
            setPasswordRecoveryReady,
            libraryItems,
            filteredLibraryItems,
            libraryBusy,
            currentSongId,
            cloudBusy,
            cloudDirty,
            lastCloudSavedAt,
            openAuthModal,
            closeAuthModal,
            formatLibraryTime,
            handleLibrarySelect,
            handleForgotPassword,
            handleAuthSubmit,
            handleSignOut,
            handleResetText,
            handleNewLibraryDraft,
            performSaveToLibrary,
            handleSaveToLibrary,
            handleDeleteLibrarySong,
        };
    }

    window.AppFeatureHooks = Object.assign({}, window.AppFeatureHooks || {}, {
        useLibraryFeature,
    });
})();
