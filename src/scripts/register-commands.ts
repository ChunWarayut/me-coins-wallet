import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

config();

const commands = [
  {
    name: 'register',
    description: 'ลงทะเบียนบัญชี Discord ของคุณ',
    type: 1, // CHAT_INPUT
    options: [
      {
        name: 'username',
        description: 'ชื่อผู้ใช้งาน',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'password',
        description: 'รหัสผ่าน',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'balance',
    description: 'ตรวจสอบยอดเงินในกระเป๋าของคุณ',
    type: 1, // CHAT_INPUT
  },
  {
    name: 'gifts',
    description: 'แสดงของขวัญทั้งหมดที่มีในระบบ',
    type: 1, // CHAT_INPUT
  },
  {
    name: 'donate',
    description: 'โดเนทของขวัญให้กับเจ้าของห้องเสียงหรือผู้พูด',
    type: 1, // CHAT_INPUT
    options: [
      {
        name: 'item',
        description: 'รหัสของขวัญที่ต้องการโดเนท',
        type: 3, // STRING
        required: true,
      },
    ],
  },
];

const rest = new REST({ version: '10' }).setToken(
  process.env.DISCORD_BOT_TOKEN as string,
);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationGuildCommands(
        process.env.DISCORD_CLIENT_ID as string,
        process.env.DISCORD_GUILD_ID as string,
      ),
      { body: commands },
    );

    // await rest.put(
    //   Routes.applicationGuildCommands(
    //     process.env.DISCORD_CLIENT_ID as string,
    //     '1229834103872946247',
    //   ),
    //   { body: commands },
    // );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
