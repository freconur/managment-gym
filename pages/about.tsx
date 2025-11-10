import type { NextPage } from 'next'
import Head from 'next/head'

const About: NextPage = () => {
  return (
    <>
      <Head>
        <title>Acerca de - Management Gym</title>
        <meta name="description" content="Información sobre Management Gym" />
      </Head>
      <main>
        <h1>Acerca de</h1>
        <p>Esta es una página de ejemplo en la ruta /about</p>
        <p>
          Esta página se encuentra en <code>pages/about.tsx</code>
        </p>
      </main>
    </>
  )
}

export default About

