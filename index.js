require("dotenv").config(); // Load environment variables from .env

const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");

// Create a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Replace these with your actual channel IDs
const commandChannelId = "1378330848113463337"; // Channel where users send commands
const announcementChannelIds = ["1379800785071771800", "1379800821406896138"]; // Channels where bot sends announcements

const events = []; // Store events in memory

// When the bot is ready
client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

// When a new message is sent in a server
client.on("messageCreate", (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Only respond to commands in the designated command channel
  if (message.channel.id !== commandChannelId) return;

  // Respond to "!ping"
  if (message.content === "!ping") {
    announcementChannelIds.forEach((channelId) => {
      const announcementChannel = client.channels.cache.get(channelId);
      if (announcementChannel) {
        announcementChannel.send("🏓 Pong! This is the announcement channel.");
      }
    });
  }
  // Respond to "vox" (case-insensitive)
  else if (message.content.toLowerCase() === "vox") {
    const responses = [
      "Bro is busy playing video game, WoW",
      "Probably smoking somewhere",
      "He is trashtalking, will reply to you soon",
    ];
    const reply = responses[Math.floor(Math.random() * responses.length)];
    announcementChannelIds.forEach((channelId) => {
      const announcementChannel = client.channels.cache.get(channelId);
      if (announcementChannel) {
        announcementChannel.send(reply);
      }
    });
  }
  // Respond to "!add"
  else if (message.content.startsWith("!add")) {
    const parts = message.content.split(" ");
    if (parts.length < 4) {
      message.channel.send(
        "❌ Invalid format! Use: `!add EventName YYYY-MM-DD HH:MM`"
      );
      return;
    }

    const eventName = parts[1];
    const eventDate = parts[2];
    const eventTime = parts[3];

    const eventDateTime = new Date(`${eventDate}T${eventTime}`);
    if (isNaN(eventDateTime.getTime())) {
      message.channel.send("❌ Invalid date or time format!");
      return;
    }

    const event = {
      name: eventName,
      date: eventDate,
      time: eventTime,
      dateTime: eventDateTime,
      reminderMinutes: null,
      addedBy: message.author.tag,
      channelId: message.channel.id,
    };

    events.push(event);

    // Send confirmation only in the command channel
    message.channel.send(
      `✅ Event "${eventName}" added for ${eventDate} at ${eventTime} by ${message.author.username}!`
    );

    // Automatically post the updated event list to the announcement channels
    if (events.length > 0) {
      const sortedEvents = events.sort((a, b) => a.dateTime - b.dateTime);

      const embed = new EmbedBuilder()
        .setTitle("📅 Upcoming Events")
        .setColor(0x00ae86);

      sortedEvents.forEach((event, index) => {
        const reminderText =
          event.reminderMinutes !== null
            ? `Reminder: ${event.reminderMinutes} minutes before`
            : `No reminder set`;
        embed.addFields({
          name: `${index + 1}. ${event.name}`,
          value: `${event.date} at ${event.time} (${reminderText}, added by ${event.addedBy})`,
        });
      });

      announcementChannelIds.forEach((channelId) => {
        const announcementChannel = client.channels.cache.get(channelId);
        if (announcementChannel) {
          announcementChannel.send({ embeds: [embed] });
        }
      });
    }
  }
  // Respond to "!setreminder"
  else if (message.content.startsWith("!setreminder")) {
    const parts = message.content.split(" ");
    if (parts.length < 3) {
      message.channel.send(
        "❌ Invalid format! Use: `!setreminder EventName MinutesBeforeEvent`"
      );
      return;
    }

    const eventName = parts[1];
    const reminderMinutes = parseInt(parts[2], 10);

    if (isNaN(reminderMinutes) || reminderMinutes < 0) {
      message.channel.send(
        "❌ Invalid reminder time! It must be a non-negative number."
      );
      return;
    }

    const event = events.find((e) => e.name === eventName);
    if (!event) {
      message.channel.send(`❌ Event "${eventName}" not found.`);
      return;
    }

    event.reminderMinutes = reminderMinutes;

    // Schedule the reminder
    const now = new Date();
    const reminderTime = new Date(
      event.dateTime.getTime() - reminderMinutes * 60 * 1000
    );
    const delay = reminderTime.getTime() - now.getTime();

    if (delay > 0) {
      setTimeout(() => {
        announcementChannelIds.forEach((channelId) => {
          const channel = client.channels.cache.get(channelId);
          if (channel) {
            channel.send(
              `⏰ Reminder: **${event.name}** is starting at ${event.date} ${event.time} (added by ${event.addedBy})!`
            );
          }
        });
      }, delay);

      message.channel.send(
        `✅ Reminder set for event "${eventName}" ${reminderMinutes} minutes before it starts.`
      );
    } else {
      message.channel.send(
        "❌ The reminder time is in the past or too close to the event start time."
      );
    }
  }
  // Respond to "!delete"
  else if (message.content.startsWith("!delete")) {
    const parts = message.content.split(" ");
    if (parts.length < 2) {
      message.channel.send("❌ Invalid format! Use: `!delete EventName`");
      return;
    }

    const eventName = parts[1];
    const index = events.findIndex((e) => e.name === eventName);

    if (index === -1) {
      message.channel.send(`❌ Event "${eventName}" not found.`);
      return;
    }

    events.splice(index, 1);
    message.channel.send(`✅ Event "${eventName}" has been deleted.`);

    // Refresh the event list in the announcement channels
    if (events.length > 0) {
      const sortedEvents = events.sort((a, b) => a.dateTime - b.dateTime);

      const embed = new EmbedBuilder()
        .setTitle("📅 Upcoming Events")
        .setColor(0x00ae86);

      sortedEvents.forEach((event, index) => {
        const reminderText =
          event.reminderMinutes !== null
            ? `Reminder: ${event.reminderMinutes} minutes before`
            : `No reminder set`;
        embed.addFields({
          name: `${index + 1}. ${event.name}`,
          value: `${event.date} at ${event.time} (${reminderText}, added by ${event.addedBy})`,
        });
      });

      announcementChannelIds.forEach((channelId) => {
        const announcementChannel = client.channels.cache.get(channelId);
        if (announcementChannel) {
          announcementChannel.send({ embeds: [embed] });
        }
      });
    } else {
      announcementChannelIds.forEach((channelId) => {
        const announcementChannel = client.channels.cache.get(channelId);
        if (announcementChannel) {
          announcementChannel.send("📅 No upcoming events at the moment.");
        }
      });
    }
  }
  // Respond to "!events"
  else if (message.content === "!events") {
    if (events.length === 0) {
      message.channel.send("📅 No events found.");
      return;
    }

    const sortedEvents = events.sort((a, b) => a.dateTime - b.dateTime);

    const embed = new EmbedBuilder()
      .setTitle("📅 Upcoming Events")
      .setColor(0x00ae86);

    sortedEvents.forEach((event, index) => {
      const reminderText =
        event.reminderMinutes !== null
          ? `Reminder: ${event.reminderMinutes} minutes before`
          : `No reminder set`;
      embed.addFields({
        name: `${index + 1}. ${event.name}`,
        value: `${event.date} at ${event.time} (${reminderText}, added by ${event.addedBy})`,
      });
    });

    announcementChannelIds.forEach((channelId) => {
      const announcementChannel = client.channels.cache.get(channelId);
      if (announcementChannel) {
        announcementChannel.send({ embeds: [embed] });
      }
    });
  }
});

// Log in to Discord with your bot token from .env
client.login(process.env.DISCORD_TOKEN);
