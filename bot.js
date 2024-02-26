const Discord = require('discord.js');
const ms = require('ms');
const Keyv = require('keyv');
const stepStorage = new Keyv(/* Optional: database URI */);

const steps = [
  {
    question: 'Where did you find RoyaliTEA from?\n> Examples:\n- Referred by a friend\n- An online advertisement, i.e. partnership message\n> **Please specify a specific member/server which invited you if you can.**',
    short: 'Where they found the server:'
  },
  {
    question: 'Have you previously had other names? If so, what are they?',
    short: 'Previous Names'
  },
  {
    question: 'Is this an alternate (i.e. secondary) account? If so, what is your main account?',
    short: 'Alt Account?'
  },
  {
    question: 'Do you have any other information you want to tell us?',
    short: 'Extra Information'
  }
];

module.exports = (client) => {
  client.once('ready', () => {
    console.log(`Bot started as ${client.user.tag} (${client.user.id})`);
    /*
    client.api.applications(client.user.id).guilds('690928432980295763').commands.post({data: {
      "name": "accept",
      "options": [
        {
          "type": 3,
          "name": "userID",
          "description": "The Discord ID (snowflake) of the user you want to verify.",
          "default": false,
          "required": true
        }
      ],
      "description": "Verify a user."
    }
    });
    client.api.applications(client.user.id).guilds('690928432980295763').commands.post({data: {
      "name": "verify",
      "description": "Ask the bot to verify you, if it does not automatically."
    }
    });
    client.api.applications(client.user.id).guilds('690928432980295763').commands.post({data: {
      "name": "deny",
      "options": [
        {
          "type": 3,
          "name": "userID",
          "description": "The Discord ID (snowflake) of the user you want to deny.",
          "default": false,
          "required": true
        }
      ],
      "description": "Deny a user's verification application."
    }
    });
    */
    try {
      client.user.setActivity('your bullsh**', { type: 'LISTENING' });
    } catch {}
  });

  client.on('error', console.error);
  client.on('debug', console.info);
  client.on('warn', console.warn);
  stepStorage.on('error', console.error);

  client.on('guildMemberAdd', async (member) => {
    try {
      const channel = await client.channels.fetch('829310118902235147');
      if (!channel) return console.error('Verification channel not found?');
      const embed = new Discord.MessageEmbed().setColor('#defbff').setFooter('Bot made by PiggyPlex#3888');
      channel.send(
        member.toString(),
        embed
        .setAuthor(`Welcome, ${member.user.tag}!`, member.user.displayAvatarURL())
        .setDescription('Please check your DMs for steps on how to verify.')
      );
      member.send(
        embed
        .setTitle(`Step ${0 + 1}/${steps.length}`)
        .setDescription(steps[0].question)
      );
      stepStorage.set(member.user.id, {
        step: 1,
        questions: []
      });
    } catch (err) {
      console.error('Error whilst verifying user:', member.user.tag, member.user.id, err);
    };
  });

  client.on('message', async (message) => {
    if (message.content === '!simulate_join') {
      client.emit('guildMemberAdd', message.member);
    }
    if (message.author.id === client.user.id || message.author.bot) return;
    if (message.channel.type !== 'dm') return;
    try {
      const verificationChannel = client.channels.cache.find((channel) => channel.name === `⌛・${message.author.id}`);
      if (verificationChannel) return message.channel.send('❌ Your verification request is already pending.');
      let stepData = await stepStorage.get(message.author.id);
      if (!stepData || typeof stepData !== 'object') return message.channel.send('❌ You are not being verified!');
      let { step, questions } = stepData;
      stepStorage.set(message.author.id, {
        step: step + 1,
        questions: [...questions, message.content]
      });
      if (step >= steps.length) {
        const sentMessage = await message.channel.send(new Discord.MessageEmbed().setColor('#defbff').setDescription('⌛ Please wait a moment whilst I submit your responses...').setFooter('Bot made by PiggyPlex#3888'));
        stepData = await stepStorage.get(message.author.id);
        step = stepData.step;
        questions = stepData.questions;
        const verificationCategory = await client.channels.fetch('831217664297926676');
        if (!verificationCategory || verificationCategory.type !== 'category') {
          message.channel.send('Please notify staff that the verification category could not be found!');
          console.error('Logs channel not found');
          return;
        }
        const verificationChannel = await verificationCategory.guild.channels.create(`⌛・${message.author.id}`);
        await verificationChannel.setParent(verificationCategory);
        await verificationChannel.send(`New verification request`,
          new Discord.MessageEmbed()
          .setColor('#defbff')
          .setAuthor(message.author.tag, message.author.displayAvatarURL()).
          setDescription(`Account Age: \`${ms(new Date().getTime() - message.author.createdTimestamp)}\``)
          .addField('Accept', `\`/accept ${message.author.id}\``, true)
          .addField('Deny', `\`/deny ${message.author.id}\``, true)
        );
        for (let i = 0; i < questions.length; i++) {
          const embed = new Discord.MessageEmbed().setColor('#defbff');
          if (i === questions.length - 1) {
            embed.setFooter('Bot made by PiggyPlex#3888');
          }
          embed.setTitle(steps[i].short);
          embed.setDescription(questions[i]);
          await verificationChannel.send(embed);
        }
        stepStorage.delete(message.author.id);
        return sentMessage.edit(new Discord.MessageEmbed().setColor('#defbff').setDescription('👌 Your verification request is now pending. Please wait for staff to see it.').setFooter('Bot made by PiggyPlex#3888'));
      }
      const embed = new Discord.MessageEmbed().setColor('#defbff').setFooter('Bot made by PiggyPlex#3888');
      message.author.send(
        embed
        .setTitle(`Step ${step + 1}/${steps.length}`)
        .setDescription(steps[step].question)
      );
    } catch (err) {
      message.channel.send('Something went wrong...');
      console.error('Error whilst verifying user in DMs:', message.author.tag, message.author.id, err);
      return;
    }
  });

  client.ws.on('INTERACTION_CREATE', async (interaction) => {
    const { guild_id: guildID, member: { user: { id: authorID } }, data: { options: args, name: command } } = interaction;
    const guild = await client.guilds.fetch(guildID);
    if (!guild) return console.error('Guild not found o_O; Interaction:', interaction);
    interaction.member = await guild.members.fetch(authorID);
    if (!interaction.member) return console.error('User not found; Interaction:', interaction);
    interaction.author = interaction.member.user;
    if (command === 'verify') {
      const embed = new Discord.MessageEmbed().setColor('#defbff').setFooter('Bot made by PiggyPlex#3888');
      interaction.member.send(
        embed
        .setTitle(`Step ${0 + 1}/${steps.length}`)
        .setDescription(steps[0].question)
      );
      stepStorage.set(interaction.member.user.id, {
        step: 1,
        questions: []
      });
      client.api.interactions(interaction.id, interaction.token).callback.post({
        data: {
          type: 3,
          data: {
            flags: 64,
            content: `📩 Check your DMs.`
          }
        }
      });
      return;
    }
    if (['accept', 'deny'].includes(command)) {
      const verb = command === 'accept' ? ({ present: 'verify', past: 'verified' }) : ({ present: 'kick', past: 'kicked' });
      const userID = args.find(arg => arg.name === 'userid');
      if (!userID) {
        client.api.interactions(interaction.id, interaction.token).callback.post({
          data: {
            type: 3,
            data: {
              flags: 64,
              content: `❌ You must provide a user.`
            }
          }
        });
        return;
      }
      let member;
      try {
        member = await guild.members.fetch(userID.value);
      } catch {
        client.api.interactions(interaction.id, interaction.token).callback.post({
          data: {
            type: 3,
            data: {
              flags: 64,
              content: `❌ I couldn't ${verb.present} that user - are you sure that's their ID?`
            }
          }
        });
        return;
      }
      if (!member) {
        client.api.interactions(interaction.id, interaction.token).callback.post({
          data: {
            type: 3,
            data: {
              flags: 64,
              content: `❌ I couldn't ${verb.present} that user - are you sure that's their ID?`
            }
          }
        });
        return;
      }
      try {
        await client.api.interactions(interaction.id, interaction.token).callback.post({
          data: {
            type: 3,
            data: {
              flags: 64,
              content: `😎 Attempting to ${verb.present} ${member}...`
            }
          }
        });
        if (command === 'accept') {
          await member.roles.add('827170733368279130');
          const embed = new Discord.MessageEmbed().setColor('#defbff').setFooter('Bot made by PiggyPlex#3888');
          await member.send(embed.setTitle(`You have been ${verb.past}!`).setDescription(`A staff member has approved your verification request. You may now chat in the server.`));
          client.api.webhooks(client.user.id, interaction.token).messages('@original').patch({
            data: {
              content: `✅ You have ${verb.past} ${member}.`
            }
          });
        }
        if (command === 'deny') {
          const embed = new Discord.MessageEmbed().setColor('#defbff').setFooter('Bot made by PiggyPlex#3888');
          await member.send(embed.setTitle(`You have been ${verb.past}!`).setDescription(`A staff member has denied your application to join the server.`));
          await member.kick(`Denied by ${interaction.author.tag} (ID: ${interaction.author.id}) from application.`);
          client.api.webhooks(client.user.id, interaction.token).messages('@original').patch({
            data: {
              content: `✅ You have ${verb.past} ${member}.`
            }
          });
        }
        const verificationChannel = client.channels.cache.find((channel) => channel.name === `⌛・${member.user.id}`);
        if (verificationChannel) {
          verificationChannel.delete();
        }
        const logs = await client.channels.fetch('829318821369741365');
        if (logs) {
          logs.send(`${interaction.author} ${verb.past} ${member}.`);
        }
      } catch (e) {
        console.error(`Error whilst ${verb}ing`, member, interaction, e);
        try {
          client.api.webhooks(client.user.id, interaction.token).messages('@original').patch({
            data: {
              content: '❌ Something went wrong.'
            }
          });
        } catch {
          client.api.interactions(interaction.id, interaction.token).callback.post({
            data: {
              type: 3,
              data: {
                flags: 64,
                content: `❌ Something went wrong.`
              }
            }
          });
        }
      }
    }
    if (command === 'deny') {
      client.api.interactions(interaction.id, interaction.token).callback.post({data: {
        type: 4,
        data: {
          content: 'Testing...'
        }
      }})
      setTimeout(() => {
        client.api.webhooks(client.user.id, interaction.token).messages('@original').patch({data: {
          content: `✅ Denied them for you`
        }});
      }, 3000);
    }
  })
}
