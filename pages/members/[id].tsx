import type { NextPage } from 'next'
import { useRouter } from 'next/router'
import Head from 'next/head'

const MemberPage: NextPage = () => {
  const router = useRouter()
  const { id } = router.query

  return (
    <>
      <Head>
        <title>Miembro {id} - Management Gym</title>
        <meta name="description" content={`Información del miembro ${id}`} />
      </Head>
      <main>
        <h1>Miembro #{id}</h1>
        <p>Esta es una página de ejemplo con ruta dinámica</p>
        <p>
          Esta página se encuentra en <code>pages/members/[id].tsx</code>
        </p>
        <p>Accede a esta página con: <code>/members/123</code></p>
      </main>
    </>
  )
}

export default MemberPage

