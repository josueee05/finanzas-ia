// Sin dependencias de servidor: el proxy también importa estos nombres.
export const SESSION_COOKIE = "fia_session";
export const OAUTH_STATE_COOKIE = "fia_oauth_state";

export const githubConfigured = () =>
  Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

/** El acceso como "usuario local" es solo para desarrollo, nunca en producción. */
export const localLoginEnabled = () => process.env.NODE_ENV !== "production";
