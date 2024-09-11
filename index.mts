import tmi from 'tmi.js'
import { request, gql } from 'graphql-request'
import * as JsSearch from 'js-search'
import Module from 'node:module'
const require = Module.createRequire(import.meta.url)
require('log-timestamp')

/*
https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=<YOUR TWITCH APP CLIENT ID>&redirect_uri=https://twitchapps.com/tokengen/&scope=chat:read+chat:edit&state=test
*/

// After creating your app and bot account and logging into it, you can use the above URI to fetch an OAuth token

// Define configuration options
const debug = false
const opts = {
  identity: {
    username: 'yourbotaccountusername',
    password: 'yourbotaccountoauth'
  },
  channels: [
    'examplechannelname1',
    'examplechannelname2'
  ]
}

class ItemNamed {
  name?: string
  shortName?: string
  avg24hPrice?: number
  sellFor?: SellForItem[]
  error?: boolean
}

class PriceResponse {
  name?: string
  price?: number
  error?: boolean
}

class Vendor {
  name?: string
}

class SellForItem {
  priceRUB?: number
  vendor?: Vendor
}

const RUBFormat = Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'RUB',
  currencyDisplay: 'narrowSymbol', // Display rouble symbol instead of RUB
  maximumFractionDigits: 0 // No decimal digits
})

const itemListQuery = gql`
{
    items {
        name
        shortName
        avg24hPrice
        sellFor {
          priceRUB
          vendor {name}
        }
    }
}
`
let itemList: ItemNamed[] = []
const search = new JsSearch.Search('name')
const shortSearch = new JsSearch.Search('shortName')
search.indexStrategy = new JsSearch.AllSubstringsIndexStrategy()
shortSearch.indexStrategy = new JsSearch.ExactWordIndexStrategy()
function update (): void {
  let error: boolean = false
  try {
    void request('https://api.tarkov.dev/graphql', itemListQuery).then((data: any) => {
      if (data.items === undefined) {
        return
      }
      itemList = data.items
      search.addDocuments(itemList)
      search.addIndex('shortName')
      search.addIndex('name')
      shortSearch.addDocuments(itemList)
      shortSearch.addIndex('shortName')
      console.log(`* Refreshed ${itemList.length} items with prices.`)
    })
  } catch {
    error = true
    setTimeout(update, 10000) // try again in 10 seconds
  }
  if (!error) {
    setTimeout(update, 3600000) // one hour
  }
}
update()

function debugPrint (msg: string): void {
  if (debug) {
    console.log(`* [DEBUG] ${msg}`)
  }
}

// Create a client with our options
const client = new tmi.Client(opts)

// Register our event handlers (defined below)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)

// Connect to Twitch:
void client.connect().catch(
  (error: string) => {
    console.log(`* ${error}`)
  }
)

// Called every time a message comes in
function onMessageHandler (channel: string, context: any, msg: string, self: boolean): void {
  if (self) { return } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim().split(' ')[0].toLowerCase()

  // If the command is known, let's execute it
  if (commandName === '!p' || commandName === '!price' || commandName === '!t' || commandName === '!trader' || commandName === '!traders') {
    if (msg.trim().split(' ').length <= 1) { return } // Ignore if no parameters
    const query = msg.split(' ').slice(1).join(' ').trim()
    const traderOnly = commandName === '!t' || commandName === '!trader' || commandName === '!traders'
    void priceCheck(query, traderOnly).then((item: PriceResponse) => {
      let username: any = 'Unknown'
      if (context.username !== undefined) {
        username = context.username
      }
      let botMsg: string = ''
      if (item.error === true) {
        botMsg = `@${username}, that item could not be found.`
      } else {
        botMsg = `@${username}, the price for ${item.name} is ${RUBFormat.format(item.price ?? 0)}.`
      }
      void client.say(channel, botMsg)
      console.log(`* Executed "${msg}" command in ${channel}, replied "${botMsg}"`)
    })
  }
}

async function priceCheck (query: string, traderOnly: boolean = false): Promise<PriceResponse> {
  let item: ItemNamed | null = null
  if (itemList.length > 0) {
    const shortSearchResult: ItemNamed[] = shortSearch.search(query)
    if (shortSearchResult.length > 0 && (shortSearchResult[0].name != null)) {
      item = shortSearchResult[0]
    } else {
      const searchResult: ItemNamed[] = search.search(query)
      if (searchResult.length > 0 && (searchResult[0].name != null)) {
        item = searchResult[0]
      }
    }
  }
  const reply = new PriceResponse()

  if (item === null) {
    reply.error = true
    return reply
  }
  reply.name = (item.name + ' (' + item.shortName + ')') ?? 'Unknown item'
  reply.price = 0
  if (item.sellFor != null) {
    let bestVendor: string = ''
    for (let i = 0; i < item.sellFor.length; i++) {
      const price = item.sellFor[i].priceRUB ?? 0
      if (price > reply.price && (!traderOnly || item.sellFor[i].vendor?.name !== 'Flea Market')) {
        bestVendor = item.sellFor[i].vendor?.name ?? 'error'
        reply.price = item.sellFor[i].priceRUB ?? 0
      }
    }
    if (bestVendor !== '') {
      reply.name = `${reply.name} sold to ${bestVendor}`
    }
  } else {
    reply.price = item.avg24hPrice ?? 0
  }
  return reply
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr: any, port: any): void {
  console.log(`* Connected to ${addr}:${port}`)
}
