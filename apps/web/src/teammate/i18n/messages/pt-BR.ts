// Texto-fonte da interface (português do Brasil). As outras línguas seguem estas chaves.
// Convenções: {nome} = variável; objetos { one, other } = plural; termos científicos seguem o glossário de Docs/ux-preservacao/07.
const ptBR = {
  common: {
    localTime: 'hora local', retry: 'Tentar de novo', close: 'Fechar', cancel: 'Cancelar', loading: 'Carregando…', none: '—', notProvided: 'não fornecida',
    brand: 'Gaiapus', yes: 'Sim', no: 'Não', optional: '(opcional)', municipality: 'município', ha: 'ha', mm: 'mm', days: 'dias',
    tableScroll: 'Tabela; role para os lados se não couber na tela', shortcuts: 'Atalhos', edition: 'Edição {year}',
  },
  crop: {
    soy: 'Soja', maize1: 'Milho 1ª safra', maize2: 'Milho 2ª safra (safrinha)', bean1: 'Feijão 1ª safra', bean2: 'Feijão 2ª safra', rice: 'Arroz', wheat: 'Trigo',
    coffee_arabica: 'Café arábica', coffee_conilon: 'Café conilon', coffee_total_mg: 'Café total MG', cover: 'Braquiária (cobertura)', other: 'Outra',
  },
  cropRole: { crop: 'Cultura', cropSeason: 'Cultura e modalidade de safra', coffeeSpecies: 'Espécie de café', coffeeCategory: 'Categoria de café conforme o contrato', cohort: 'Coorte estatística agregada (não é espécie)' },
  stage: { establishment: 'Estabelecimento', vegetative: 'Vegetativo', reproductive: 'Reprodutivo', maturation: 'Maturação', off_season_bare: 'Entressafra · solo exposto', off_season_cover: 'Entressafra · braquiária' },
  stageShort: { establishment: 'Estabelecimento', vegetative: 'Vegetativo', reproductive: 'Reprodutivo', maturation: 'Maturação', off_season_bare: 'Solo exposto', off_season_cover: 'Braquiária' },
  stageAbbr: { establishment: 'Est', vegetative: 'Veg', reproductive: 'Rep', maturation: 'Mat', off_season_bare: 'Exp', off_season_cover: 'Braq' },
  land: { soy: 'Soja', maize2: 'Milho safrinha', 'maize2+brachiaria': 'Milho + braquiária', brachiaria: 'Braquiária (cobertura)', bare: 'Pousio (solo exposto)' },
  lang: { label: 'Idioma', loadFailed: 'Não foi possível carregar o idioma.', loading: 'Carregando o idioma…' },
  nav: {
    main: 'Principal', skip: 'Pular para o conteúdo', home: 'Gaiapus — início', more: 'Mais',
    group: { explorar: 'Explorar', acompanhar: 'Acompanhar', planejar: 'Planejar', lavoura: 'Minha lavoura', ajuda: 'Conta e ajuda' },
    item: { explorar: 'Explorar', municipio: 'Município', visaoGeral: 'Visão geral', alertas: 'Alertas', sondas: 'Sondas', planejar: 'Planejar', simulador: 'Simulador', fieldShift: 'Field Shift', propriedades: 'Propriedades', registros: 'Registros', ajuda: 'Ajuda', conta: 'Conta', linguagem: 'Linguagem visual' },
    propertiesLong: 'Propriedades e talhões',
    ctx: { current: 'Contexto atual: ', open: ' — abrir registros', openTitle: 'Abrir registros', demo: 'Demonstração', demoDetail: ' · Sorriso, MT · soja · sem propriedade cadastrada', noPlanting: ' · sem plantio registrado', season: ' · safra {season}' },
    theme: { toLight: 'Mudar para tema claro', toDark: 'Mudar para tema escuro' },
    account: { enter: 'Entrar', enterOrCreate: 'Entrar ou criar conta', of: 'Conta de {name}' },
    mode: 'Dados de exemplo', notFound: 'Página não encontrada', backToExplorer: 'Voltar ao explorador',
    edition: { title: 'Sobre esta edição', text: '{challenge}. Os resultados científicos são exemplos publicados e retrospectivos; nada está liberado para decisão operacional.' },
  },
  page: {
    openFailed: 'Não foi possível abrir esta tela', recordsSafe: 'Seus registros continuam salvos neste aparelho.', loadingScreen: 'Carregando a tela…',
    failedStart: 'Não foi possível iniciar. Confira a conexão e recarregue a página.',
  },
  source: { publicacao: 'Publicação da API', fixture: 'Dado de exemplo do pacote', mock: 'Dado ilustrativo', local: 'Salvo neste aparelho', sintetico: 'Dado sintético', label: 'Fonte: {source}' },
  errors: {
    offlineTitle: 'Sem conexão. ', unreachableTitle: 'Serviço indisponível. ', genericTitle: 'Não foi possível carregar. ', generic: 'Algo falhou ao buscar os dados.', code: '(código: {code})',
    network: 'Os dados já carregados continuam na tela; tente de novo quando a rede voltar.',
    api_unreachable: 'Não foi possível falar com o servidor da Gaiapus. Isso não quer dizer que não haja dados; tente de novo em instantes.',
    municipality_not_covered: 'Este município é válido, mas ainda não tem análise publicada.', invalid_municipality_code: 'Código de município inválido.', invalid_crop: 'Cultura não reconhecida.',
    catalog_unavailable: 'O catálogo de cobertura não pôde ser consultado agora.',
    api: {
      invalid_input: 'Os dados enviados não foram aceitos.', not_found: 'Não encontrado.', unauthenticated: 'Entre na sua conta para continuar.', email_verification_required: 'Confirme seu e-mail para continuar.',
      identity_unavailable: 'O serviço de contas ainda não foi configurado neste ambiente.', dependency_failure: 'Um serviço da Gaiapus falhou. Tente de novo em instantes.', dependency_busy: 'O serviço está ocupado. Tente de novo em instantes.',
      database_unavailable: 'O banco de dados está indisponível agora.', upstream_invalid: 'A resposta recebida não corresponde ao contrato.', unsupported_input: 'Esta combinação não é aceita pelo serviço.',
      fixture_not_available: 'Cálculo indisponível neste ambiente.', rate_limited: 'Muitos pedidos seguidos. Aguarde um pouco.', result_expired: 'O resultado expirou. Calcule de novo.', internal_error: 'Erro interno do serviço.',
      request_failed: 'Não foi possível carregar os dados.', invalid_response: 'A resposta recebida não corresponde ao contrato.', unknown: 'Algo falhou ({code}).',
    },
    auth: {
      signin_failed: 'Confira e-mail e senha. Confirme seu e-mail antes de entrar.', signup_failed: 'Não foi possível criar a conta. Confira os dados e tente novamente.',
      reset_failed: 'Não foi possível enviar o link. Aguarde e tente novamente.', resend_failed: 'Não foi possível reenviar o link. Aguarde e tente novamente.',
      signout_failed: 'Não foi possível sair. Tente novamente.', identity_unavailable: 'O serviço de contas ainda não foi configurado neste ambiente.',
      account_changed: 'A conta mudou. Abra o formulário novamente para continuar.',
    },
  },
  ui: {
    loading: 'Carregando…', state: { done: 'Concluído' },
  },
  number: {
    useComma: 'Use vírgula para decimais, por exemplo {example}.', usePoint: 'Use ponto para decimais, por exemplo {example}.', onlyNumbers: 'Use apenas números, por exemplo {example}.',
  },
};
export default ptBR;
