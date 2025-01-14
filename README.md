# Google Analytics 4 for Telegraf

Send events to Google Analytics 4 ([Measurement Protocol](https://developers.google.com/analytics/devguides/collection/protocol/ga4)) from your Telegram bot based on [Telegraf (Telegram bot framework)](https://github.com/telegraf/telegraf/).

## Installation

```js
$ npm i https://github.com/zigzag-way/telegraf-ga4
```

## Example
  
```js
import Telegraf from 'telegraf';
import TelegrafGA4 from 'telegraf-ga4';

const bot = new Telegraf(process.env.BOT_TOKEN);

const ga4 = new TelegrafGA4({
  // Admin > Data Streams > choose your stream > Measurement ID (Required)
  measurement_id: process.env.GA4_MEASUREMENT_ID,
  // Admin > Data Streams > choose your stream > Measurement Protocol > Create (Required)
  api_secret: process.env.GA4_API_SECRET
  // https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
  client_id: process.env.GA4_CLIENT_ID
});

bot.use(ga4.middleware());

// set custom user properties
bot.use((ctx, next) => {
  const userPlan = db.getUserPlan(ctx.from.id);
  // user properties: https://developers.google.com/analytics/devguides/collection/protocol/ga4/user-properties
  ctx.ga4.setUserProperties({
    plan: userPlan
  })
  return next();
});

// send a view to track user activity
// view title is picked up automatically from message text or callback data
bot.use(ga4.view()); // allowed, but not recommended
// custom view title
bot.command('greet', ga4.view('Greeting'), (ctx) => { // recommended
  ctx.reply('Hi!');
});

// send a single event
bot.command('event', (ctx) => {
  // recommended events: https://developers.google.com/gtagjs/reference/ga4-events
  ga4.event('purchase', {
    currency: 'USD',
    transaction_id: 'T_12345',
    value: '12.21',
    items: [{
      item_id: 'TG_12345',
      item_name: 'Bot feature'
    }]
  });
});

// send a single event using ctx
bot.command('event', (ctx) => {
  ctx.ga4.event('bot_start', {  // custom event
    chat_id: ctx.chat.id
  });
});

// send multiple events
bot.command('events', (ctx) => {
  const events = [
    { name: 'join_group', params: { group_id: ctx.chat.id } },
    { name: 'tutorial_begin' }
  ];
  ctx.ga4.events(events);
});

// debug event by setting the third param to true
bot.command('debug', async (ctx) => {
  const validationMessages = await ctx.ga4.event('login', {
    method: 'Telegram'
  }, true);
  // events validation: https://developers.google.com/analytics/devguides/collection/protocol/ga4/validating-events
  console.log(validationMessages); // an empty array on success
});

bot.startPolling();
```
