require("dotenv").config(); // Load environment variables from .env

const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const express = require("express"); // Added Express

// Create a new Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Replace these with your actual channel IDs
const commandChannelId = "1380076531258232862"; // Channel where users send commands
const announcementChannelIds = ["1351678047471796356", "1352428708824350762"]; // Channels where bot sends announcements

const events = []; // Store events in memory

// When the bot is ready
client.once("ready", () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);
});

// When a new message is sent in a server
client.on("messageCreate", (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== commandChannelId) return;

  const parts = message.content.trim().split(/\s+/);
  const command = parts.shift().toLowerCase();

  if (command === "!ping") {
    announcementChannelIds.forEach((channelId) => {
      const announcementChannel = client.channels.cache.get(channelId);
      if (announcementChannel) {
        announcementChannel.send(
          "@everyone 🏓 Pong! This is the announcement channel."
        );
      }
    });
  } else if (command === "vox") {
    const responses = [
      "Bro is busy playing video game, WoW",
      "Probably smoking somewhere",
      "He is trashtalking, will reply to you soon",
    ];
    const reply = responses[Math.floor(Math.random() * responses.length)];
    announcementChannelIds.forEach((channelId) => {
      const announcementChannel = client.channels.cache.get(channelId);
      if (announcementChannel) {
        announcementChannel.send(`@everyone ${reply}`);
      }
    });
  } else if (command === "!add") {
    if (parts.length < 3) {
      message.channel.send(
        "❌ Invalid format! Use: `!add EventName YYYY-MM-DD HH:MM`"
      );
      return;
    }
    const [eventName, eventDate, eventTime] = parts;
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
    };
    events.push(event);
    message.channel.send(
      `✅ Event "${eventName}" added for ${eventDate} at ${eventTime} by ${message.author.username}!`
    );
    postEventList();
  } else if (command === "!setreminder") {
    if (parts.length < 2) {
      message.channel.send(
        "❌ Invalid format! Use: `!setreminder EventName MinutesBeforeEvent`"
      );
      return;
    }
    const [eventName, reminderMinutesStr] = parts;
    const reminderMinutes = parseInt(reminderMinutesStr, 10);
    if (isNaN(reminderMinutes) || reminderMinutes < 0) {
      message.channel.send("❌ Invalid reminder time!");
      return;
    }
    const event = events.find((e) => e.name === eventName);
    if (!event) {
      message.channel.send(`❌ Event "${eventName}" not found.`);
      return;
    }
    event.reminderMinutes = reminderMinutes;
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
              `@everyone ⏰ Reminder: **${event.name}** is starting at ${event.date} ${event.time} (added by ${event.addedBy})!`
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
  } else if (command === "!delete") {
    if (parts.length < 1) {
      message.channel.send("❌ Invalid format! Use: `!delete EventName`");
      return;
    }
    const eventName = parts[0];
    const index = events.findIndex((e) => e.name === eventName);
    if (index === -1) {
      message.channel.send(`❌ Event "${eventName}" not found.`);
      return;
    }
    events.splice(index, 1);
    message.channel.send(`✅ Event "${eventName}" has been deleted.`);
    postEventList();
  } else if (command === "!events") {
    if (events.length === 0) {
      message.channel.send("📅 No events found.");
    } else {
      postEventList();
    }
  }
});

// Function to post the event list
function postEventList() {
  if (events.length === 0) {
    announcementChannelIds.forEach((channelId) => {
      const channel = client.channels.cache.get(channelId);
      if (channel) {
        channel.send("@everyone 📅 No upcoming events at the moment.");
      }
    });
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
    const channel = client.channels.cache.get(channelId);
    if (channel) {
      channel.send({ content: "@everyone", embeds: [embed] });
    }
  });
}

// Log in to Discord with your bot token from .env
client.login(process.env.DISCORD_TOKEN);

// Dummy Express server to keep the bot alive on Render
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(PORT, () => console.log(`✅ Web server running on port ${PORT}`));
