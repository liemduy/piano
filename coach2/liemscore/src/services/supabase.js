(function () {
    const config = window.LIEMSCORE_CONFIG || {};
    const url = config.supabaseUrl;
    const key = config.supabasePublishableKey;

    const supabaseClient = (typeof window !== 'undefined' && window.supabase && url && key)
        ? window.supabase.createClient(url, key, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true,
            },
        })
        : null;

    window.AppServices = Object.assign({}, window.AppServices || {}, { supabaseClient });
})();
