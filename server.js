// server.js
// OpenAI Compatible Proxy -> NVIDIA NIM DeepSeek


const express = require("express");
const cors = require("cors");
const axios = require("axios");


const app = express();

const PORT = process.env.PORT || 3000;



// ===============================
// Middleware
// ===============================


app.use(cors());


app.use(express.json({

    limit: "50mb"

}));


// Catch oversized requests

app.use((err, req, res, next)=>{


    if(err.type === "entity.too.large") {


        return res.status(413).json({

            error: {

                message:
                "Request payload too large",

                type:
                "invalid_request_error"

            }

        });


    }


    next(err);


});





// ===============================
// NVIDIA CONFIG
// ===============================


const NIM_API_BASE =
process.env.NIM_API_BASE ||
"https://integrate.api.nvidia.com/v1";


const NIM_API_KEY =
process.env.NIM_API_KEY;





// ===============================
// SETTINGS
// ===============================


const SHOW_REASONING = false;


const ENABLE_THINKING_MODE = false;





// ===============================
// MODEL MAP
// ===============================


const MODEL_MAPPING = {


    "deepseek-v4-pro":
    "deepseek-ai/deepseek-v4-pro",


    "gpt-4o":
    "deepseek-ai/deepseek-v4-pro"


};





// ===============================
// Health
// ===============================


app.get("/health",(req,res)=>{


    res.json({

        status:"ok",

        service:
        "OpenAI NVIDIA NIM Proxy",

        model:
        "deepseek-ai/deepseek-v4-pro"

    });


});





// ===============================
// Models
// ===============================


app.get("/v1/models",(req,res)=>{


    res.json({


        object:"list",


        data:
        Object.keys(MODEL_MAPPING)
        .map(model=>({


            id:model,

            object:"model",

            created:
            Date.now(),


            owned_by:
            "nvidia-nim-proxy"


        }))


    });


});







// ===============================
// Chat Completion
// ===============================


app.post(

[

"/v1/chat/completions",

"/chat/completions",

"/v1/completions"

],


async(req,res)=>{


try {



const {


model,


messages = [],


temperature,


max_tokens,


stream


} = req.body;





// Prevent massive context

const trimmedMessages =
messages.slice(-25);





const nimModel =

MODEL_MAPPING[model]

||

"deepseek-ai/deepseek-v4-pro";





const nimRequest = {


    model:
    nimModel,


    messages:
    trimmedMessages,


    temperature:
    temperature ?? 0.6,


    max_tokens:
    max_tokens ?? 1024,


    stream:
    stream ?? false,



    extra_body:

    ENABLE_THINKING_MODE

    ?


    {

        chat_template_kwargs: {

            thinking:true

        }


    }


    :

    undefined


};






console.log(
"Sending request to NVIDIA:",
JSON.stringify({
model:nimModel,
messages:trimmedMessages.length
})
);

console.log("Before NVIDIA call");

const response = await axios.post(
  `${NIM_API_BASE}/chat/completions`,
  nimRequest,
  {
    timeout: 120000,
    headers:{
      "Authorization":
      `Bearer ${NIM_API_KEY}`,
      "Content-Type":
      "application/json"
    },
    responseType:
    stream
    ?
    "stream"
    :
    "json"
  }
);

console.log("After NVIDIA call");
console.log("Status:", response.status);


// ===============================
// Streaming
// ===============================


if(stream){



res.setHeader(

"Content-Type",

"text/event-stream"

);


res.setHeader(

"Cache-Control",

"no-cache"

);


res.setHeader(

"Connection",

"keep-alive"

);



res.flushHeaders();





response.data.on(

"data",

(chunk)=>{


let text =
chunk.toString();



if(!SHOW_REASONING){


text =
text.replace(

/"reasoning_content":"[^"]*"/g,

""

);


}



res.write(text);



}



);





response.data.on(

"end",

()=>{

res.end();

}

);



return;


}









// ===============================
// Normal response
// ===============================



const choice =

response.data
.choices?.[0];




let content =

choice?.message?.content || "";





if(

SHOW_REASONING &&

choice?.message?.reasoning_content

){


content =


"<think>\n" +

choice.message.reasoning_content +

"\n</think>\n\n" +

content;


}





res.json({



id:

`chatcmpl-${Date.now()}`,



object:

"chat.completion",



created:

Math.floor(Date.now()/1000),



model:



model,



choices:[{


index:0,


message:{


role:"assistant",


content


},



finish_reason:


choice?.finish_reason || "stop"


}],




usage:

response.data.usage || {}




});







}



catch (error) {

  console.error("NVIDIA ERROR");

  console.error("Status:",
    error.response?.status);

  console.error("Data:",
    error.response?.data);

  console.error("Message:",
    error.message);

  return res.status(
    error.response?.status || 500
  ).json({
    error: {
      message:
        error.message,
      status:
        error.response?.status
    }
  });
}

}
);



// ===============================
// Debug unknown routes
// ===============================


app.all("*",(req,res)=>{


console.log(

"UNKNOWN ROUTE:",

req.method,

req.originalUrl

);



res.status(404).json({


error:{


message:

`Endpoint not found: ${req.method} ${req.originalUrl}`,



type:

"invalid_request_error"



}


});



});









// ===============================
// Start
// ===============================


app.listen(PORT,()=>{


console.log(

`Proxy running on port ${PORT}`

);


console.log(

"NVIDIA Base:",

NIM_API_BASE

);


});
