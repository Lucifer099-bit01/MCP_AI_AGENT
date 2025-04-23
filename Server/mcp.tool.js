import { config } from "dotenv";
import { TwitterApi } from "twitter-api-v2";
config();


//connect to twitter api
const twitterClient = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY,
    appSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
})

// Function to create a new post on Twitter
export async function createPost (status){
   const newpost = await twitterClient.v2.tweet(status)
   return{
         content: [
              {
                type: "text",
                text: `Tweeted: ${status}`,
              },
         ],
   }
}