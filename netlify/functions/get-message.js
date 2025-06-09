// netlify/functions/get-messages.js
import { get } from '@netlify/blobs';

export default async (req, res) => {
  try {
    const blob = await get('chat/messages');
    const messages = blob ? JSON.parse(blob.body) : [];
    return res.status(200).json(messages);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur lecture blobs' });
  }
};
