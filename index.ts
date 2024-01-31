import tmi from 'tmi.js'
import { request, gql } from 'graphql-request'
import * as JsSearch from 'js-search'

/*
https://id.twitch.tv/oauth2/authorize
    ?response_type=token
    &client_id=<YOUR TWITCH APP CLIENT ID>
    &redirect_uri=https://twitchapps.com/tokengen/
    &scope=chat:read+chat:edit
    &state=test
*/

// After creating your app and bot account and logging into it, you can use the above URI to fetch an OAuth token

// Define configuration options
const opts = {
  identity: {
    username: 'yourbotaccountusername',
    password: 'yourbotaccountoauth'
  },
  channels: [
    // Put your channels here
  ]
}

class ItemNamed {
  name?: string
  shortName?: string
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

class ApiResponse {
  name?: string
  avg24hPrice?: number
  sellFor?: SellForItem[]
}

const itemListQuery = gql`
{
    items {
        name
        shortName
    }
}
`
let itemList: ItemNamed[] = []
const search = new JsSearch.Search('name')
void request('https://api.tarkov.dev/graphql', itemListQuery).then((data: any) => {
  if (data.items === undefined) {
    return
  }
  itemList = data.items
  search.addDocuments(itemList)
  search.addIndex('name')
  search.addIndex('shortName')
  console.log(`* Indexed ${itemList.length} items.`)
})

// Create a client with our options
const client = new tmi.Client(opts)

// Register our event handlers (defined below)
client.on('message', onMessageHandler)
client.on('connected', onConnectedHandler)

// Connect to Twitch:
void client.connect()

// Called every time a message comes in
function onMessageHandler (channel: string, context: any, msg: string, self: boolean): void {
  if (self) { return } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim().split(' ')[0]

  // If the command is known, let's execute it
  if (commandName === '!p' || commandName === '!price') {
    if (msg.trim().split(' ').length <= 1) { return } // Ignore if no parameters
    const query = msg.split(' ').slice(1).join(' ').trim()
    void priceCheck(query).then((item: PriceResponse) => {
      let username: any = 'Unknown'
      if (context.username !== undefined) {
        username = context.username
      }
      let botMsg: string = ''
      if (item.error === true) {
        botMsg = `@${username}, that item could not be found.`
      } else {
        botMsg = `@${username}, the price for ${item.name} is ₽${item.price}.`
      }
      void client.say(channel, botMsg)
      console.log(`* Executed "${msg}" command in ${channel}, replied "${botMsg}"`)
    })
  }
}

async function priceCheck (query: string): Promise<PriceResponse> {
  let apiQuery = query
  if (itemList.length > 0) {
    const searchResult: ItemNamed[] = search.search(query)
    if (searchResult.length > 0 && (searchResult[0].name != null)) {
      apiQuery = searchResult[0].name
    }
  }
  const reply = new PriceResponse()
  const tarkovQuery = gql`
  {
      items(name: "${apiQuery}") {
          name
          avg24hPrice
          sellFor {
            priceRUB
            vendor {name}
          }
      }
  }
  `
  const data: any = await request('https://api.tarkov.dev/graphql', tarkovQuery)
  if (data.items === undefined || data.items.length === 0) {
    reply.error = true
    return reply
  }
  const item: ApiResponse = data.items[0]
  reply.name = item.name ?? 'Unknown item'
  reply.price = 0
  if (item.sellFor != null) {
    let bestVendor: string = ''
    for (let i = 0; i < item.sellFor.length; i++) {
      const price = item.sellFor[i].priceRUB ?? 0
      if (price > reply.price) {
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