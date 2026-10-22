import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Trader Vision — Bot de análise de gráficos por foto</title>
        <meta name="description" content="Envie o print de um gráfico e receba suporte, resistência, entrada, stop e alvo marcados na imagem." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:title" content="Trader Vision — Bot de análise de gráficos por foto" />
        <meta property="og:description" content="Bot que analisa o gráfico que você fotografa e marca os níveis na imagem." />
        <meta property="og:type" content="website" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
