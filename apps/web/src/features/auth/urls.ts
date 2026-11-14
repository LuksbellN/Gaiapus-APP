export function authRedirect(kind: 'callback' | 'recovery', origin = window.location.origin) {
  return `${origin}/auth/${kind}`;
}

export function safeReturnPath(path: string | null) {
  return path?.startsWith('/?') || path === '/' ? path : '/';
}

export function callbackProblem(url: URL) {
  const hash = new URLSearchParams(url.hash.slice(1));
  if (url.searchParams.has('error') || hash.has('error'))
    return 'Este link expirou ou já foi utilizado. Solicite um novo e-mail.';
  if (!url.searchParams.get('code'))
    return 'O link está incompleto. Abra o link mais recente enviado por e-mail neste mesmo navegador.';
  return null;
}
