# Tarkov Price Twitch Bot

The goal of this bot is to provide information to chatters and streamers of which items are valuable to sell.

I use this to run my Twitch bot, tarkovpricerbot.

![image](https://github.com/ynot01/tarkov-price-twitch-bot/assets/28408322/8696be7a-3743-4a6f-b0b8-01453f521985)

## Running your own personal bot

- Create a Twitch app at [Twitch's dev console](https://dev.twitch.tv/console). Set the redirect URI to `https://twitchapps.com/tokengen/`. **Take note of the Client ID.** If the "Submit" button doesn't work, it may be because of illegal characters or phrases in the name.

- Create a Twitch account; this will be your bot account. It is recommended that you verify the account with a phone number to avoid complications with being unable to chat without VIP/mod. If you are only intending to use this bot for your own channel, you can just mod it.

- While logged in to the bot's Twitch account, copy & visit the below URI, replacing `<YOUR TWITCH APP CLIENT ID>` with your Client ID noted in the first step.

```
https://id.twitch.tv/oauth2/authorize
    ?response_type=token
    &client_id=<YOUR TWITCH APP CLIENT ID>
    &redirect_uri=https://twitchapps.com/tokengen/
    &scope=chat:read+chat:edit
    &state=test
```

- You will receive your OAuth token here. **DO NOT SHARE IT WITH ANYONE.**

- Go into `index.ts`

  - Replace the username field containing `yourbotaccountusername` with your bot's username.
  
  - Replace the password field containing `yourbotaccountoauth` with your **OAUTH TOKEN, NOT YOUR PASSWORD.**
  
  - Place your desired channel(s) in the `channels` array. If your channel URL is `twitch.tv/foobar` then it should look like `'foobar'` in the array.

## Compile & run

### Option 1 (Containerized)
- Install [Docker](https://docs.docker.com/get-docker/) and run `docker compose up --build` (include `-d` to run the container detached from the terminal) to build and launch a container that will run the bot. This is recommended for [dedicated servers](https://www.digitalocean.com/).

### Option 2 (Simpler)
- Install `ts-node` via the [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) command `npm install -g ts-node` and run `ts-node index.ts` in the repo root folder to launch the bot.
- You may have to run `npm i` once in the project directory to install the required packages.

## Usage

`!p <name>` or `!price <name>` in Twitch Chat where `<name>` is the name of an item.

## Thanks

- [tmi.js](https://tmijs.com/) for Twitch interaction
- [tarkov.dev](https://tarkov.dev/) for EFT API
- [js-search](https://github.com/bvaughn/js-search) for easy search indexing
