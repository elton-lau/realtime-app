import { getSession } from 'next-auth/react';
import { z} from 'zod'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { fetchRedis } from '@/helpers/redis';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { id: idToAdd } = z.object({id: z.string()}).parse(body); 

    const session  = await getServerSession(authOptions)
    if (!session) {
      return new Response('Unauthorized', { status: 401 })
    }

    const isAlreadyFriends = await fetchRedis('sismember', `user:${session.user.id}:friends`, idToAdd)
    if (isAlreadyFriends) {
      return new Response('Already friends', { status: 400 })
    }
    const hasFriendRequest = await fetchRedis('sismember', `user:${session.user.id}:incoming_friend_requests`, idToAdd)
    if (!hasFriendRequest) {
      return new Response('No friend request', { status: 400 })
    }

    await db.sadd(`user:${session.user.id}:friends`, idToAdd)
    await db.sadd(`user:${idToAdd}:friends`, session.user.id)
    await db.srem(`user:${session.user.id}:incoming_friend_requests`, idToAdd)

    return new Response('OK', { status: 200 })
  }
   catch (err) {
    if(err instanceof z.ZodError) {
      return new Response('Invalid request payload', { status: 422 });
    }
    return new Response('Invalid request', { status: 400 });
  }
}