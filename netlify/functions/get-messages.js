// netlify/functions/get-messages.js
import { get } from '@netlify/blobs';
import { json } from '@netlify/functions';

export const handler = async () => {
  try {
    const blob = await get('chat/messages');
    const messages = blob?.body ? JSON.parse(blob.body) : [];
    return json(messages);
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
};
