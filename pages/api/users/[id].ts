import type { NextApiRequest, NextApiResponse } from 'next'

type User = {
  id: number
  name: string
  email: string
}

type Data = {
  user?: User
  error?: string
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  const { id } = req.query

  if (req.method === 'GET') {
    // Ejemplo: obtener usuario por ID
    res.status(200).json({
      user: {
        id: Number(id),
        name: 'Usuario Ejemplo',
        email: 'usuario@example.com',
      },
    })
  } else {
    res.setHeader('Allow', ['GET'])
    res.status(405).end(`Method ${req.method} Not Allowed`)
  }
}

