// Help without animation: glossary in the farmer's words and short answers. Tutorials (H1) are listed here too.
import { Link } from 'react-router-dom';

export const GLOSSARY: { id: string; term: string; text: string }[] = [
  { id: 'et0', term: 'Demanda de água da atmosfera (ET0)', text: 'Quanto de água o ar "puxa" do solo e das plantas num dia, em milímetros. Dias quentes, secos e com vento têm ET0 alta.' },
  { id: 'reserva', term: 'Reserva de água no solo', text: 'Água guardada no solo que a planta consegue usar, em milímetros ou em porcentagem da capacidade do solo.' },
  { id: 'deficit', term: 'Déficit hídrico', text: 'Quando a planta recebe menos água do que precisa. Mostrado em milímetros por dia.' },
  { id: 'ndvi', term: 'NDVI', text: 'Medida do verde da vegetação vista do satélite, de 0 a 1. Imagens com nuvem são descartadas; nenhum valor é estimado no lugar.' },
  { id: 'escala-municipal', term: 'Escala municipal', text: 'O número vale para a média do município, não para o seu talhão.' },
  { id: 'cenario', term: 'Cenário hipotético', text: 'Simulação feita com hipóteses declaradas, como trocar o pousio por braquiária. Não é medição de campo.' },
  { id: 'retrospectivo', term: 'Retrospectivo', text: 'Calculado para uma safra que já passou. Não é previsão para a safra atual.' },
  { id: 'mae', term: 'Erro absoluto médio (MAE)', text: 'Quanto o modelo errou, em média, nos anos de teste. Não é intervalo de confiança.' },
  { id: 'climatologia', term: 'Climatologia', text: 'Média de 2001 a 2021 para os mesmos dias do ano, usada como comparação com a previsão.' },
  { id: 'nao-liberado', term: 'Não liberado para uso operacional', text: 'O resultado serve para entender e comparar, não para decidir sozinho o que fazer na lavoura.' },
];
const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: 'Por que às vezes vejo Sorriso?', a: <>Sorriso, MT, é a demonstração desta edição: lá há projeção de água, simulação e rendimento de referência publicados. Toda tela de dado diz de onde é o dado e avisa quando não é do seu talhão.</> },
  { q: 'Meus dados ficam onde?', a: <>Propriedades, talhões, registros, planos e rascunhos ficam neste aparelho e neste navegador, separados por conta. Entrar na conta não envia esses dados. Você pode <Link to="/conta">exportá-los</Link>.</> },
  { q: 'Posso escolher qualquer país?', a: <>Sim. Todos os países podem ser escolhidos no <Link to="/explorar">explorador</Link>. A análise agrícola desta edição existe só em alguns municípios do Brasil; cada lugar diz o que há e o que falta.</> },
  { q: 'O que quer dizer "Integração pendente"?', a: <>Que este aplicativo ainda não consegue consultar aquele dado. Não quer dizer que o lugar esteja fora da cobertura dos modelos.</> },
];

export function Help() {
  return <div className="page" style={{ maxWidth: 860 }}>
    <div className="page-head"><div className="stack-2"><h1>Ajuda</h1><p>Termos usados no aplicativo e respostas curtas. Em cada tela, o botão “Como usar esta tela” abre um passo a passo opcional.</p></div></div>
    <section className="card" aria-labelledby="h-faq"><h2 id="h-faq">Perguntas frequentes</h2>{FAQ.map((f) => <div key={f.q} className="stack-2"><h3>{f.q}</h3><p>{f.a}</p></div>)}</section>
    <section className="card" aria-labelledby="h-glossario"><h2 id="h-glossario">Glossário</h2><dl className="stack-2">{GLOSSARY.map((g) => <div key={g.id} id={g.id}><dt><b>{g.term}</b></dt><dd style={{ margin: 0 }} className="meta">{g.text}</dd></div>)}</dl></section>
  </div>;
}
