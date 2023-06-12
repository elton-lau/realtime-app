import { fetchRedis } from '@/helpers/redis';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth/next';
import { addFriendValidator } from '../../../../lib/validations/add-friend';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { email: emailToAdd } = addFriendValidator.parse(body.email)

    const idToAdd = (await fetchRedis(
      'get',
      `user:email:${emailToAdd}`
    )) as string

    const session = await getServerSession(authOptions)
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    if (!idToAdd) {
      return new Response('User not found', { status: 404 });
    }

    if (idToAdd === session.user.id) {
      return new Response('You cannot add yourself', { status: 400 });
    }

    // check if user already added
    const isAlreadyAdded = await fetchRedis('sismember', `user:${idToAdd}:incoming_friend_requests`, session.user.id) as 0 | 1;
    if (isAlreadyAdded) {
      return new Response('Already added this user', { status: 400 });
    }
    // check if user is already friends
    const isAlreadyFriends = await fetchRedis('sismember', `user:${idToAdd}:friends`, session.user.id) as 0 | 1;
    if (isAlreadyFriends) {
      return new Response('Already friends', { status: 400 });
    }

    // valid request
    db.sadd(`user:${idToAdd}:incoming_friend_requests`, session.user.id);
    return new Response('OK')
  } catch (err) {
    if(err instanceof z.ZodError) {
      return new Response('Invalid request payload', { status: 422 });
    }
    return new Response('Invalid request', { status: 400 });
  }
}