/*
  Plugin Anti Tag SW untuk bot Baileys
  Command: /antitagsw on/off
  Butuh: global.db.data.chats tersedia di bot kamu
*/

function normalizeParticipant(jid) {
  if (!jid) return jid;
  return jid.replace(/:\d+@/, '@');
}

function buildDeleteKey(m) {
  return {
    remoteJid: m.chat || m.from,
    fromMe: false,
    id: m.key?.id || m.id,
    participant: m.key?.participantAlt
      || normalizeParticipant(m.key?.participant)
      || normalizeParticipant(m.sender),
  };
}

const handler = async (m, plug) => {
  const { reply, isAdmin, isBotAdmin } = plug;

  if (!m.isGroup) return reply('❌ Perintah ini hanya untuk grup!');
  if (!isAdmin)   return reply('❌ Hanya admin grup yang bisa menggunakan perintah ini!');
  if (!isBotAdmin) return reply('❌ Bot harus menjadi admin terlebih dahulu!');

  const group = global.db?.data?.chats?.[m.chat] || {};
  const body  = m.body?.replace(/^[!/.](antitagsw)\s*/i, '').trim().toLowerCase();

  if (!body || !['on', 'off'].includes(body)) {
    return reply(
      `💡 *Penggunaan:* /antitagsw on/off\n\n` +
      `📌 *Status:* ${group.antitagsw ? '✅ Aktif' : '❌ Nonaktif'}`
    );
  }

  if (!global.db?.data?.chats?.[m.chat]) {
    global.db.data.chats[m.chat] = {};
  }

  global.db.data.chats[m.chat].antitagsw = (body === 'on');
  reply(body === 'on'
    ? '✅ Anti Tag SW aktif!\nMember yang tag massal/status akan otomatis dikick.'
    : '✅ Anti Tag SW dinonaktifkan!'
  );
};

// Middleware — dijalankan sebelum setiap pesan
handler.before = async (m, plug) => {
  if (m.isBaileys || m.fromMe) return true;
  if (!m.isGroup) return true;

  const { conn, isAdmin, isBotAdmin } = plug;

  const group  = global.db?.data?.chats?.[m.chat] || {};
  const isTagSW = (
    m.mtype  === 'groupStatusMentionMessage' ||
    m.type   === 'groupStatusMentionMessage' ||
    !!m.message?.groupStatusMentionMessage
  );

  if (group.antitagsw && isTagSW && isBotAdmin && !isAdmin) {
    try {
      // Hapus pesan
      await conn.sendMessage(m.chat, { delete: buildDeleteKey(m) });

      // Notif + kick
      await conn.sendMessage(m.chat, {
        text: `⛔ @${m.sender.split('@')[0]} dikeluarkan karena melakukan tag massal/status!`,
        mentions: [m.sender],
      });
      await conn.groupParticipantsUpdate(m.chat, [m.sender], 'remove');

    } catch (e) {
      console.error('[ANTITAGSW] Error:', e.message);
    }
    return false;
  }

  return true;
};

handler.help    = ['antitagsw <on/off>'];
handler.tags    = ['group'];
handler.command = /^(antitagsw)$/i;
handler.group   = true;
handler.admin   = true;

export default handler;
