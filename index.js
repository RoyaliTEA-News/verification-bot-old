const Discord = require('discord.js'),
      client = new Discord.Client(),
      dotenv = require('dotenv');

dotenv.config();
require('./bot.js')(client);

client.login(process.env.TOKEN);
