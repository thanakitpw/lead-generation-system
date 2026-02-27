import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '../../lib/prisma'

export interface AuthRequest extends Request {
  userId?: string
  userEmail?: string
}

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string; email: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Unauthorized: User not found or inactive' })
    }

    req.userId = decoded.userId
    req.userEmail = decoded.email
    next()
  } catch {
    return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' })
  }
}
