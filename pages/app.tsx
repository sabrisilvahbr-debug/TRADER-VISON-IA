import type { AppProps } from 'next/app'
import Head from 'next/head'
import '../styles/globals.css'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>AlphaVision AI — Análise de Trading com IA</title>
        <meta name="description" content="Pare de operar no achismo. Use inteligência artificial para validar suas decisões de trading em segundos." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <meta property="og:title" content="AlphaVision AI — Análise de Trading com IA" />
        <meta property="og:description" content="IA que analisa o mercado em segundos. Tendência, suporte, resistência, entrada e stop automáticos." />
        <meta property="og:type" content="website" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
