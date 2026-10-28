# Trader Vision

Bot de análise de gráficos por foto. Envie o print de um gráfico e o app marca suporte, resistência, entrada, stop e alvo direto na imagem, com veredito (entrar, esperar ou evitar), risco/retorno e o que invalida o setup.

> Análise automática para estudo. Não é recomendação de investimento.

## Como usar

1. Escolha o serviço de IA que lê o print e cole sua chave. Ela fica só no seu navegador.
   - **Google Gemini**: grátis, sem cartão ([gerar chave](https://aistudio.google.com/app/apikey)). Cole a chave exatamente como o AI Studio a gerou (as novas começam com `AQ.`, as antigas com `AIza`); o app não exige prefixo. Chaves antigas sem restrição podem ser recusadas pelo Google.
   - **Z.ai GLM-5.3-Flash**: pago por uso, aceita imagem ([gerar chave](https://z.ai/manage-apikey/apikey-list)). Também pode usar a chave do servidor (`ZAI_API_KEY`).
   - **OpenRouter**: modelos gratuitos, sem cartão ([gerar chave](https://openrouter.ai/keys)).
   - **OpenAI**: pago, precisa de saldo ([gerar chave](https://platform.openai.com/api-keys)).
2. (Recomendado) cole sua chave **gratuita** da [Alpha Vantage](https://www.alphavantage.co/support/#api-key) e informe o ativo (PETR4, AAPL, EURUSD, BTC). O app busca os candles diários reais e confere o print com preço, RSI, médias móveis e volatilidade, avisando quando o gráfico diverge dos dados.
3. (Opcional) informe o timeframe e o perfil de risco.
4. Arraste o print do gráfico, clique para escolher ou cole com `Ctrl+V`.
5. Clique em **Analisar gráfico**.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000. Não é preciso `.env`. Se quiser oferecer uma chave padrão do Gemini no servidor, copie `.env.example` para `.env.local` e preencha `GOOGLE_GEMINI_API_KEY`.

## Deploy

Funciona na Vercel sem variáveis de ambiente. O GitHub Actions (`.github/workflows/ci.yml`) checa tipos, lint e build a cada push e pull request.

## Limites

- A chave grátis da Alpha Vantage permite cerca de 25 consultas por dia (1 por análise) e só entrega candles diários, mesmo que o print seja de outro timeframe.
- 10 análises por minuto por IP (limite simples em memória).
- As cotas gratuitas (Google, OpenRouter) são pequenas e mudam; quando acabam, o app avisa.
- Modelos gratuitos do OpenRouter variam de qualidade e podem sair do ar. Troque com `OPENROUTER_MODEL`.
- As linhas desenhadas sobre o gráfico são aproximadas.

## Gemini: autenticação e modelos

O app chama a API REST do Gemini (`generateContent`) direto, com a chave só no cabeçalho `x-goog-api-key`, como na [documentação oficial](https://ai.google.dev/gemini-api/docs/api-key). Não usa mais o pacote legado `@google/generative-ai`. A chave nunca vai em URL, corpo, log ou mensagem de erro, e a checagem do campo é só local (nenhuma chamada à API para validar).

Modelos, nesta ordem, até um responder: `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-2.5-flash`. Para fixar um só, defina `GEMINI_MODEL`.

Nos modelos Gemini 3 o raciocínio padrão é `high` e pode demorar; o app envia `generationConfig.thinkingConfig.thinkingLevel = "low"` (documentado pelo Google). Cada análise tem um orçamento de 54 s (a rota aceita 60 s) e o erro diz se foi tempo esgotado ou falha de conexão.

## Z.ai (GLM-5.3-Flash)

Endpoint `https://api.z.ai/api/paas/v4/chat/completions`, `Authorization: Bearer`, modelo `glm-5.3-flash`, imagem em `image_url` (data URL, JPG/PNG de até 5 MB). O raciocínio do GLM-5.3 não pode ser desligado; o app usa `reasoning_effort: low`. Chave: a do usuário (colada na tela) ou, se ele não colar, a `ZAI_API_KEY` do servidor, que nunca é enviada ao navegador. É um serviço pago por uso (consulte a [tabela de preços](https://docs.z.ai/guides/overview/pricing)).

## Testes

```bash
npm test                      # unitários: validação de chave, contrato REST, erros, rota (Google simulado)
GEMINI_API_KEY=... npm run test:e2e   # ponta a ponta com credencial real
```

O teste real também roda no GitHub: crie o secret `GEMINI_API_KEY` e execute **Actions > Teste real do Gemini**. Para a Z.ai, crie o secret `ZAI_API_KEY` e execute **Actions > Teste real da Z.ai** (`npm run test:e2e:zai`). Para usar um print seu, defina `TEST_CHART_IMAGE=/caminho/do/print.png`. O `tests/fixtures/grafico-teste.png` é um gráfico **gerado** para teste, não um print real de corretora.
