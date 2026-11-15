# E-mail de confirmação

Após publicar o frontend com suporte a token_hash, em Supabase → Authentication → Email Templates → Confirm signup, use o assunto `Confirme seu e-mail · Gaiapus` e cole o conteúdo de `confirmation.html` no corpo HTML.

Defina o Site URL como https://gaiapus.space. O link usa SiteURL e TokenHash e o frontend valida o token por verifyOtp. O token é de uso único. O template precisa ser aplicado ao projeto hospedado pelo dashboard ou API administrativa. O deploy Azure não atualiza templates Supabase.

Desative rastreamento de cliques no provedor de e-mail para preservar os links de autenticação. Peça um novo link após atualizar o template. Valide com uma conta de teste em outro navegador e confira também a rejeição de links expirados. Nunca publique links reais ou tokens nas capturas de teste.
