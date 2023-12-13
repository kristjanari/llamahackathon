import { Pinecone } from "@pinecone-database/pinecone";
import { config } from "dotenv";
import { promises as fsPromises } from "fs";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { OpenAI } from "openai";

config();

const pinecone = new Pinecone({
  apiKey: process.env.API_KEY,
  environment: process.env.ENVIRON,
});

const idx = pinecone.index("healthcareheroes4");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY,
});

async function upsertToPinecone(serviceObj) {
  const name = serviceObj.name;
  const billing_code = serviceObj.billing_code;
  const negotiated_rate =
    serviceObj.negotiated_rates[0].negotiated_prices[0].negotiated_rate;

  const text_input =
    "For code " +
    billing_code +
    " and service " +
    name +
    " the negotiated rate is " +
    negotiated_rate;

  const embedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text_input,
    encoding_format: "float",
  });

  const record = [
    {
      id: billing_code,
      values: embedding.data[0].embedding,
      metadata: {
        billing_code: billing_code,
        service_name: name,
        negotiated_rate: negotiated_rate,
        source: text_input,
      },
    },
  ];

  await idx.upsert(record);
}

const jsonFilePath = "./data/prices-tail1000.json";

async function getObject(jsonFilePath) {
  try {
    // Read the file and get the data
    const data = await fsPromises.readFile(jsonFilePath, "utf-8");

    // Parse the JSON data into a JavaScript object
    const jsonObject = JSON.parse(data);

    jsonObject.prics.forEach((record, index) => {
      upsertToPinecone(record);
    });
  } catch (error) {
    // If there's an error during file reading or JSON parsing, throw the error
    throw error;
  }
}

getObject(jsonFilePath);

// const serviceObj = await getObject(jsonFilePath);

// console.log(
//   serviceObj.negotiated_rates[0].negotiated_prices[0].negotiated_rate
// );
