// netlify/functions/send-message.js
import { set, get } from '@netlify/blobs';
import { json } from '@netlify/functions';

export const handler = async (event) => {
  try {
    const { username, text } = JSON.parse(event.body || '{}');

    if (!username || !text) {
      return json({ error: "Nom et message requis" }, { status: 400 });
    }

    // Lire les anciens messages (ou liste vide)
    let messages = [];
    try {
      const blob = await get('chat/messages');
      if (blob?.body) messages = JSON.parse(blob.body);
    } catch (_) {
      messages = [];
    }

    // Ajouter le nouveau message
    messages.push({
      username,
      text,
      timestamp: Date.now()
    });

    // Écrire le nouveau blob
    await set('chat/messages', JSON.stringify(messages), {
      contentType: 'application/json',
    });

    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, { status: 500 });
  }
};
