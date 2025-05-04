import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';

config();

const commands = [
  {
    name: 'register',
    description: 'Register your Discord account',
    type: 1, // CHAT_INPUT
    options: [
      {
        name: 'username',
        description: 'Your username',
        type: 3, // STRING
        required: true,
      },
      {
        name: 'password',
        description: 'Your password',
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: 'balance',
    description: 'Check your wallet balance',
    type: 1, // CHAT_INPUT
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

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
